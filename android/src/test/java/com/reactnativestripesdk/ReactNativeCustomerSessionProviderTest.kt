package com.reactnativestripesdk

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.reactnativestripesdk.customersheet.CustomerSheetManager
import com.reactnativestripesdk.utils.StripeUIManager
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.customersheet.CustomerSheet
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLooper
import org.robolectric.util.ReflectionHelpers
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalCoroutinesApi::class, ReactNativeSdkInternal::class)
@RunWith(RobolectricTestRunner::class)
class ReactNativeCustomerSessionProviderTest {
  private val fixtures = mutableListOf<Fixture>()

  @Test
  fun `overlapping requests complete in either order through the bridge`() = providerTest {
    for (order in listOf(listOf(0, 1), listOf(1, 0))) {
      val fixture = fixture()
      val requests = List(2) { async { fixture.provider.providesCustomerSessionClientSecret() } }
      runCurrent()
      assertEquals(2, fixture.ids.size)
      assertNotEquals(fixture.ids[0], fixture.ids[1])
      for (index in order) {
        assertNull(fixture.respond(success(fixture.ids[index], "$index")).getMap("error"))
        runCurrent()
        assertTrue(requests[index].isCompleted)
        assertSecret("$index", requests[index].await().getOrThrow())
      }
      assertTrue(fixture.pending().isEmpty())
    }
  }

  @Test
  fun `duplicate unknown and missing IDs settle the bridge without consuming another request`() = providerTest {
    val fixture = fixture()
    val first = async { fixture.provider.providesCustomerSessionClientSecret() }
    val second = async { fixture.provider.providesCustomerSessionClientSecret() }
    runCurrent()
    fixture.respond(success(fixture.ids[1], "B"))
    runCurrent()
    assertSecret("B", second.await().getOrThrow())
    for (response in listOf(success(fixture.ids[1], "duplicate"), success("unknown", "unknown"), JavaOnlyMap())) {
      assertEquals("Failed", fixture.respond(response).getMap("error")?.getString("code"))
      runCurrent()
      assertFalse(first.isCompleted)
      assertEquals(1, fixture.pending().size)
    }
    fixture.respond(success(fixture.ids[0], "A"))
    runCurrent()
    assertSecret("A", first.await().getOrThrow())
    assertTrue(fixture.pending().isEmpty())
  }

  @Test
  fun `provider errors and malformed responses fail only the matching request`() = providerTest {
    for (response in listOf(
      JavaOnlyMap.of("error", "Merchant failed"),
      JavaOnlyMap.of("customerId", "cus_test"),
      JavaOnlyMap.of("clientSecret", "secret"),
      JavaOnlyMap.of("customerId", "cus_test", "clientSecret", ""),
      JavaOnlyMap.of("customerId", "cus_test", "clientSecret", 123),
    )) {
      val fixture = fixture()
      val failed = async { fixture.provider.providesCustomerSessionClientSecret() }
      val other = async { fixture.provider.providesCustomerSessionClientSecret() }
      runCurrent()
      response.putString("requestId", fixture.ids[0])
      assertNull(fixture.respond(response).getMap("error"))
      runCurrent()
      assertTrue(failed.isCompleted)
      assertTrue(failed.await().isFailure)
      if (response.hasKey("error")) {
        assertEquals("Merchant failed", failed.await().exceptionOrNull()?.message)
      }
      assertFalse(other.isCompleted)
      assertFalse(fixture.provider.completeCustomerSessionRequest(fixture.ids[0], response))
      fixture.respond(success(fixture.ids[1], "other"))
      runCurrent()
      assertSecret("other", other.await().getOrThrow())
      assertTrue(fixture.pending().isEmpty())
    }
  }

  @Test
  fun `registration precedes emission and emission failure removes the request`() = providerTest {
    val immediate = fixture()
    immediate.onEmit = { id -> assertNull(immediate.respond(success(id, "immediate")).getMap("error")) }
    assertSecret("immediate", immediate.provider.providesCustomerSessionClientSecret().getOrThrow())
    assertTrue(immediate.pending().isEmpty())

    val failed = fixture()
    failed.onEmit = { throw IllegalStateException("Emitter unavailable") }
    val failure = failed.provider.providesCustomerSessionClientSecret().exceptionOrNull()
    assertEquals("Emitter unavailable", failure?.message)
    assertTrue(failed.pending().isEmpty())
    assertFalse(failed.provider.completeCustomerSessionRequest(failed.ids.single(), JavaOnlyMap()))
  }

  @Test
  fun `caller cancellation removes only its own request`() = providerTest {
    val fixture = fixture()
    val first = async { fixture.provider.providesCustomerSessionClientSecret() }
    val second = async { fixture.provider.providesCustomerSessionClientSecret() }
    runCurrent()
    first.cancelAndJoin()
    assertEquals("Failed", fixture.respond(success(fixture.ids[0], "late")).getMap("error")?.getString("code"))
    assertFalse(second.isCompleted)
    fixture.respond(success(fixture.ids[1], "B"))
    runCurrent()
    assertSecret("B", second.await().getOrThrow())
    assertTrue(fixture.pending().isEmpty())
  }

  @Test
  fun `cancellation competing with a response cannot leave a pending request`() = providerTest {
    for (cancelFirst in listOf(true, false)) {
      val fixture = fixture()
      val request = async { fixture.provider.providesCustomerSessionClientSecret() }
      runCurrent()
      if (cancelFirst) request.cancel()
      fixture.respond(success(fixture.ids.single(), "A"))
      if (!cancelFirst) request.cancel()
      runCurrent()
      assertTrue(request.isCompleted)
      assertTrue(fixture.pending().isEmpty())
      assertFalse(fixture.provider.completeCustomerSessionRequest(fixture.ids.single(), JavaOnlyMap()))
    }
  }

  @Test
  fun `invalidation cancels all requests and rejects new work`() = providerTest {
    val fixture = fixture()
    val requests = List(2) { async { fixture.provider.providesCustomerSessionClientSecret() } }
    runCurrent()
    fixture.provider.invalidate()
    fixture.provider.invalidate()
    runCurrent()
    assertTrue(requests.all { it.isCancelled })
    assertTrue(fixture.pending().isEmpty())
    fixture.ids.forEach { assertFalse(fixture.provider.completeCustomerSessionRequest(it, JavaOnlyMap())) }
    val late = async { fixture.provider.providesCustomerSessionClientSecret() }
    runCurrent()
    assertTrue(late.isCancelled)
    assertEquals(2, fixture.ids.size)
  }

  @Test
  fun `manager destruction and module invalidation cancel requests before replacement`() = providerTest {
    for (invalidateModule in listOf(false, true)) {
      val old = fixture()
      val requests = List(2) { async { old.provider.providesCustomerSessionClientSecret() } }
      runCurrent()
      if (invalidateModule) old.module.invalidate() else old.manager.destroy()
      ShadowLooper.runUiThreadTasks()
      runCurrent()
      assertTrue(requests.all { it.isCancelled })
      assertNull(old.manager.customerSessionProvider)
      assertTrue(old.pending().isEmpty())

      val replacement = fixture()
      val request = async { replacement.provider.providesCustomerSessionClientSecret() }
      runCurrent()
      old.ids.forEach {
        assertEquals("Failed", replacement.respond(success(it, "stale")).getMap("error")?.getString("code"))
      }
      assertFalse(request.isCompleted)
      replacement.respond(success(replacement.ids.single(), "new"))
      runCurrent()
      assertSecret("new", request.await().getOrThrow())
    }
  }

  private fun providerTest(block: suspend TestScope.() -> Unit) = runTest(timeout = 10.seconds) {
    try {
      block()
    } finally {
      fixtures.forEach { it.provider.invalidate() }
      runCurrent()
    }
  }

  private fun fixture() = Fixture().also { fixtures.add(it) }

  private class Fixture {
    val context = mock(ReactApplicationContext::class.java)
    val module = StripeSdkModule(context)
    val ids = mutableListOf<String>()
    var onEmit: (String) -> Unit = {}
    val provider: ReactNativeCustomerSessionProvider
    val manager: CustomerSheetManager

    init {
      val emitter = mock(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      `when`(context.getNativeModule(StripeSdkModule::class.java)).thenReturn(module)
      `when`(context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)).thenReturn(emitter)
      doAnswer {
        assertEquals("onCustomerSessionProviderCustomerSessionClientSecret", it.getArgument<String>(0))
        val id = it.getArgument<ReadableMap>(1).getString("requestId")!!
        ids.add(id)
        onEmit(id)
        null
      }.`when`(emitter).emit(anyString(), any())
      provider = ReactNativeCustomerSessionProvider(context, CustomerSheet.IntentConfiguration.Builder().build())
      manager = CustomerSheetManager(context, JavaOnlyMap(), JavaOnlyMap(), mock(Promise::class.java))
      manager.customerSessionProvider = provider
      ReflectionHelpers.setField(module, "customerSheetManager", manager)
      ReflectionHelpers.getField<MutableList<StripeUIManager>>(module, "stripeUIManagers").add(manager)
    }

    fun respond(payload: ReadableMap): ReadableMap {
      val promise = mock(Promise::class.java)
      var result: ReadableMap? = null
      doAnswer { result = it.getArgument(0); null }.`when`(promise).resolve(any())
      module.clientSecretProviderCustomerSessionClientSecretCallback(payload, promise)
      verify(promise).resolve(any())
      verifyNoMoreInteractions(promise)
      return checkNotNull(result)
    }

    fun pending(): Map<String, *> = ReflectionHelpers.getField(provider, "pendingCustomerSessions")
  }

  companion object {
    private fun success(requestId: String, label: String) = JavaOnlyMap.of(
      "requestId", requestId, "customerId", "cus_$label", "clientSecret", "secret_$label",
    )

    private fun assertSecret(label: String, value: CustomerSheet.CustomerSessionClientSecret) {
      assertEquals("cus_$label", ReflectionHelpers.getField<String>(value, "customerId"))
      assertEquals("secret_$label", ReflectionHelpers.getField<String>(value, "clientSecret"))
    }
  }
}
