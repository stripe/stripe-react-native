package com.reactnativestripesdk

import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.JavaScriptModule
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativestripesdk.IntentCreationRequestRouter.Component
import com.reactnativestripesdk.IntentCreationRequestRouter.Kind
import com.reactnativestripesdk.IntentCreationRequestRouter.Owner
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PromiseViewModel
import com.stripe.android.model.ConfirmationToken
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentsheet.CreateIntentResult
import com.stripe.android.paymentsheet.PaymentSheetResult
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockConstruction
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.shadows.ShadowLooper
import org.robolectric.util.ReflectionHelpers
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class IntentCreationRequestRouterTest {
  private val fixtures = mutableListOf<Fixture>()

  @Test
  fun `sequential producers cannot reuse another component's response in either direction`() = callbackTest {
    for (kind in Kind.values()) {
      for (firstComponent in Component.values()) {
        val fixture = fixture()
        val secondComponent = Component.values().first { it != firstComponent }
        val first = async { fixture.produce(firstComponent, kind) }
        runCurrent()
        val firstEvent = fixture.events.single()
        fixture.respond(firstEvent, kind, "first-secret")
        assertSecret("first-secret", first.await())
        val second = async { fixture.produce(secondComponent, kind) }
        runCurrent()
        val secondEvent = fixture.events.last()
        assertNotEquals(firstEvent.getString("requestId"), secondEvent.getString("requestId"))
        assertEquals(firstComponent.value, firstEvent.getString("component"))
        assertEquals(secondComponent.value, secondEvent.getString("component"))
        fixture.respond(firstEvent, kind, "stale-secret")
        runCurrent()
        assertFalse(second.isCompleted)
        fixture.respond(secondEvent, kind, "second-secret")
        assertSecret("second-secret", second.await())
        assertTrue(fixture.pending().isEmpty())
      }
    }
  }

  @Test
  fun `out of order responses match component and callback kind without consuming mismatches`() = callbackTest {
    val fixture = fixture()
    val requests = Component.values().flatMap { component ->
      Kind.values().map { kind -> async { fixture.produce(component, kind) } }
    }
    runCurrent()
    val kinds = listOf(Kind.PaymentMethod, Kind.ConfirmationToken, Kind.PaymentMethod, Kind.ConfirmationToken)
    for (index in requests.indices.reversed()) {
      val event = fixture.events[index]
      val wrongComponent = JavaOnlyMap.of("requestId", event.getString("requestId"), "component", "wrong")
      fixture.respond(wrongComponent, kinds[index])
      fixture.respond(event, if (kinds[index] == Kind.PaymentMethod) Kind.ConfirmationToken else Kind.PaymentMethod)
      runCurrent()
      assertFalse(requests[index].isCompleted)
      fixture.respond(event, kinds[index], "secret-$index")
      assertSecret("secret-$index", requests[index].await())
    }
    assertTrue(fixture.pending().isEmpty())
  }

  @Test
  fun `missing unknown duplicate and malformed routing never seed a future request`() = callbackTest {
    for (kind in Kind.values()) {
      val fixture = fixture()
      for (payload in listOf(
        JavaOnlyMap(),
        JavaOnlyMap.of("requestId", "unknown", "component", Component.PaymentSheet.value),
        JavaOnlyMap.of("requestId", 123, "component", Component.PaymentSheet.value),
        JavaOnlyMap.of("requestId", "unknown", "component", 123),
      )) {
        fixture.bridge(payload, kind)
      }
      val first = async { fixture.produce(Component.PaymentSheet, kind) }
      runCurrent()
      assertFalse(first.isCompleted)
      fixture.respond(fixture.events.single(), kind)
      first.await()
      fixture.respond(fixture.events.single(), kind)
      val next = async { fixture.produce(Component.PaymentSheet, kind) }
      runCurrent()
      assertFalse(next.isCompleted)
      fixture.respond(fixture.events.last(), kind)
      next.await()
    }
  }

  @Test
  fun `success errors and malformed matching responses terminate only their own request`() = callbackTest {
    for (kind in Kind.values()) {
      for (response in listOf(
        JavaOnlyMap.of("clientSecret", "test-secret"),
        JavaOnlyMap.of("error", JavaOnlyMap.of("message", "Test failure", "localizedMessage", "Try again")),
        JavaOnlyMap(),
        JavaOnlyMap.of("clientSecret", 123),
        JavaOnlyMap.of("clientSecret", ""),
        JavaOnlyMap.of("error", "invalid"),
      )) {
        val fixture = fixture()
        val request = async { fixture.produce(Component.EmbeddedPaymentElement, kind) }
        runCurrent()
        response.putString("requestId", fixture.events.single().getString("requestId"))
        response.putString("component", Component.EmbeddedPaymentElement.value)
        fixture.bridge(response, kind)
        val result = request.await()
        if (response.hasKey("clientSecret") && response.getType("clientSecret") == ReadableType.String &&
          response.getString("clientSecret") == "test-secret"
        ) {
          assertSecret("test-secret", result)
        } else {
          assertTrue(result is CreateIntentResult.Failure)
          if (response.hasKey("error") && response.getType("error") == ReadableType.Map) {
            assertEquals("Test failure", ReflectionHelpers.getField<Exception>(result, "cause").message)
            assertEquals("Try again", ReflectionHelpers.getField<String>(result, "displayMessage"))
          }
        }
        assertTrue(fixture.pending().isEmpty())
      }
    }
  }

  @Test
  fun `registration precedes emission and emitter failures clean up`() = callbackTest {
    for (component in Component.values()) {
      for (kind in Kind.values()) {
        val fixture = fixture()
        fixture.onEmit = { fixture.respond(it, kind, "immediate-secret") }
        assertSecret("immediate-secret", fixture.produce(component, kind))
        assertTrue(fixture.pending().isEmpty())
        fixture.onEmit = { throw IllegalStateException("Emitter unavailable") }
        assertTrue(fixture.produce(component, kind) is CreateIntentResult.Failure)
        assertTrue(fixture.pending().isEmpty())
      }
    }
  }

  @Test
  fun `caller cancellation owner retirement and invalidation reject late responses`() = callbackTest {
    for (kind in Kind.values()) {
      for (component in Component.values()) {
        val fixture = fixture()
        val first = async { fixture.produce(component, kind) }
        runCurrent()
        first.cancelAndJoin()
        assertTrue(fixture.pending().isEmpty())
        val second = async { fixture.produce(component, kind) }
        runCurrent()
        fixture.respond(fixture.events.first(), kind)
        assertFalse(second.isCompleted)
        if (component == Component.PaymentSheet) {
          fixture.manager.destroy()
          ShadowLooper.runUiThreadTasks()
        } else {
          fixture.module.intentCreationRequests.retire(fixture.embeddedOwner)
        }
        runCurrent()
        assertTrue(second.isCancelled)
        assertTrue(fixture.pending().isEmpty())
        val retired = async { fixture.produce(component, kind) }
        runCurrent()
        assertTrue(retired.isCancelled)
        assertEquals(2, fixture.events.size)
        val replacementOwner = Owner()
        val replacement = async { fixture.produce(Component.EmbeddedPaymentElement, kind, replacementOwner) }
        runCurrent()
        fixture.events.take(2).forEach { fixture.respond(it, kind) }
        assertFalse(replacement.isCompleted)
        fixture.module.invalidate()
        runCurrent()
        assertTrue(replacement.isCancelled)
        assertTrue(fixture.pending().isEmpty())
        val closed = async { fixture.produce(Component.EmbeddedPaymentElement, kind, Owner()) }
        runCurrent()
        assertTrue(closed.isCancelled)
        assertEquals(3, fixture.events.size)
      }
    }
  }

  @Test
  fun `ending a checkout cancels pending work but permits another presentation`() = callbackTest {
    val fixture = fixture()
    val first = async { fixture.produce(Component.PaymentSheet, Kind.PaymentMethod) }
    runCurrent()
    val resultCallback = fixture.manager.buildPaymentSheetResultCallback(PromiseViewModel())
    resultCallback.onPaymentSheetResult(mock(PaymentSheetResult.Canceled::class.java))
    runCurrent()
    assertTrue(first.isCancelled)
    val second = async { fixture.produce(Component.PaymentSheet, Kind.PaymentMethod) }
    runCurrent()
    fixture.respond(fixture.events.first(), Kind.PaymentMethod)
    assertFalse(second.isCompleted)
    fixture.respond(fixture.events.last(), Kind.PaymentMethod)
    second.await()
  }

  private fun callbackTest(block: suspend TestScope.() -> Unit) = runTest(timeout = 10.seconds) {
    mockConstruction(KeepJsAwakeTask::class.java).use { tasks ->
      try {
        block()
      } finally {
        fixtures.forEach { it.module.intentCreationRequests.close() }
        runCurrent()
        tasks.constructed().forEach {
          verify(it).start()
          verify(it).stop()
        }
        fixtures.forEach { it.context.destroy() }
      }
    }
  }

  private fun assertSecret(secret: String, result: CreateIntentResult) {
    assertTrue(result is CreateIntentResult.Success)
    assertEquals(secret, ReflectionHelpers.getField<String>(result, "clientSecret"))
  }

  private fun fixture() = Fixture().also { fixtures.add(it) }

  private class Fixture {
    val context: BridgeReactContext = object : BridgeReactContext(RuntimeEnvironment.getApplication()) {
      override fun <T : NativeModule> getNativeModule(nativeModuleInterface: Class<T>): T? =
        nativeModuleInterface.cast(module)
      override fun <T : JavaScriptModule> getJSModule(jsInterface: Class<T>): T =
        requireNotNull(jsInterface.cast(emitter))
    }
    val module = StripeSdkModule(context)
    val manager = PaymentSheetManager(context, JavaOnlyMap(), mock(Promise::class.java))
    private val view = EmbeddedPaymentElementView(ThemedReactContext(context, context, null, -1))
    val embeddedOwner = Owner()
    val events = mutableListOf<ReadableMap>()
    var onEmit: (ReadableMap) -> Unit = {}
    private val emitter = object : DeviceEventManagerModule.RCTDeviceEventEmitter {
      override fun emit(eventName: String, data: Any?) {
        val event = data as ReadableMap
        assertTrue(eventName == "onConfirmHandlerCallback" || eventName == "onConfirmationTokenHandlerCallback")
        assertTrue(event.hasKey(if (eventName == "onConfirmHandlerCallback") "paymentMethod" else "confirmationToken"))
        events.add(event)
        onEmit(event)
      }
    }

    suspend fun produce(component: Component, kind: Kind, owner: Owner = embeddedOwner): CreateIntentResult =
      if (kind == Kind.PaymentMethod) {
        val callback =
          if (component == Component.PaymentSheet) {
            manager.buildIntentCreationCallback()
          } else {
            view.buildIntentCreationCallback(owner)
          }
        callback.onCreateIntent(mock(PaymentMethod::class.java), true)
      } else {
        val callback =
          if (component == Component.PaymentSheet) {
            manager.buildCreateConfirmationTokenCallback()
          } else {
            view.buildConfirmationTokenCallback(owner)
          }
        callback.onCreateIntent(mock(ConfirmationToken::class.java))
      }

    fun respond(event: ReadableMap, kind: Kind, secret: String = "test-secret") {
      val payload = JavaOnlyMap.of("clientSecret", secret)
      if (event.hasKey("requestId")) payload.putString("requestId", event.getString("requestId"))
      if (event.hasKey("component")) payload.putString("component", event.getString("component"))
      bridge(payload, kind)
    }

    fun bridge(payload: ReadableMap, kind: Kind) {
      val promise = mock(Promise::class.java)
      if (kind == Kind.PaymentMethod) {
        module.intentCreationCallback(payload, promise)
      } else {
        module.confirmationTokenCreationCallback(payload, promise)
      }
      verify(promise).resolve(null)
      verifyNoMoreInteractions(promise)
    }

    fun pending(): Map<String, *> = ReflectionHelpers.getField(module.intentCreationRequests, "pending")
  }
}
