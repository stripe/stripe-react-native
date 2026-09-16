package com.reactnativestripesdk.checkout

import android.graphics.drawable.ColorDrawable
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.reactnativestripesdk.EventEmitterCompat
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.uicore.utils.mapAsStateFlow
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class NativeCheckoutControllerInstanceTest {
  @Test
  fun `destroy emits once releases resources and stops future updates`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    val firstSession = fixture.events.last().getMap("session") as WritableMap
    firstSession.putString("email", "changed-by-recipient@example.com")
    fixture.updating.value = true
    advanceUntilIdle()
    assertEquals("jenny@example.com", fixture.events.last().getMap("session")!!.getString("email"))
    assertEquals("updating", fixture.events.last().getString("status"))

    fixture.instance.destroy()
    fixture.instance.destroy()
    val countAfterDestroy = fixture.events.size
    fixture.updating.value = false
    fixture.sessions.value = checkoutSession(email = "late@example.com")
    advanceUntilIdle()

    assertEquals("destroyed", fixture.events.last().getString("status"))
    assertEquals(1, fixture.events.count { it.getString("status") == "destroyed" })
    assertEquals(countAfterDestroy, fixture.events.size)
    assertFalse(fixture.scope.isActive)
    verify(fixture.controller, times(1)).destroy()
  }

  @Test
  fun `does not emit ready with an outdated session while its image loads`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    fixture.updating.value = true
    runCurrent()
    val imageStarted = CompletableDeferred<Unit>()
    fixture.sessions.value = checkoutSession(
      email = "updated@example.com",
      paymentOption = checkoutPaymentOption(imageLoader = {
        imageStarted.complete(Unit)
        awaitCancellation()
      }),
    )
    imageStarted.await()
    fixture.updating.value = false
    runCurrent()

    assertEquals("updating", fixture.events.last().getString("status"))
  }

  @Test
  fun `observes sessions when the native flow creates a new value on every read`() = withFixture { fixture ->
    `when`(fixture.controller.session).thenReturn(
      fixture.sessions.mapAsStateFlow { session -> session?.let { checkoutSession(email = it.email.orEmpty()) } },
    )
    fixture.start()
    advanceUntilIdle()

    assertEquals("ready", fixture.events.last().getString("status"))
    assertEquals("jenny@example.com", fixture.events.last().getMap("session")!!.getString("email"))
  }

  @Test
  fun `publishes the latest session before returning when serialization changes it`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    fixture.sessions.value = checkoutSession(
      paymentOption = checkoutPaymentOption(imageLoader = {
        fixture.sessions.value = checkoutSession(email = "updated@example.com")
        ColorDrawable()
      }),
    )

    fixture.instance.publishCurrentState()

    assertEquals("updated@example.com", fixture.events.last().getMap("session")!!.getString("email"))
    assertEquals("ready", fixture.events.last().getString("status"))
  }

  private fun withFixture(test: suspend TestScope.(Fixture) -> Unit) = runTest {
    Dispatchers.setMain(StandardTestDispatcher(testScheduler))
    val fixture = Fixture()
    try {
      test(fixture)
    } finally {
      fixture.close()
      Dispatchers.resetMain()
    }
  }

  private class Fixture {
    val controller = mock(CheckoutController::class.java)
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    val sessions = MutableStateFlow<CheckoutController.Session?>(checkoutSession())
    val updating = MutableStateFlow(false)
    val events = mutableListOf<ReadableMap>()
    val instance: NativeCheckoutControllerInstance

    init {
      `when`(controller.session).thenReturn(sessions)
      `when`(controller.isUpdating).thenReturn(updating)
      val context = mock(ReactApplicationContext::class.java)
      val emitter = mock(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      `when`(context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)).thenReturn(emitter)
      doAnswer { invocation ->
        assertEquals("checkoutControllerDidUpdate", invocation.getArgument<String>(0))
        val event = invocation.getArgument<ReadableMap>(1)
        events.add(event)
        null
      }.`when`(emitter).emit(anyString(), any())
      instance = NativeCheckoutControllerInstance(
        controller,
        EventEmitterCompat(context),
        scope,
        com.facebook.react.bridge.JavaOnlyMap.of("id", "cs_test", "email", "jenny@example.com"),
      )
    }

    fun start() {
      instance.start("controller-1")
    }

    fun close() {
      instance.destroy()
      scope.cancel()
    }
  }
}
