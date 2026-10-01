package com.reactnativestripesdk.checkout

import android.os.Looper
import androidx.activity.ComponentActivity
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.EventEmitterCompat
import com.reactnativestripesdk.StripeSdkModule
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.checkout.CheckoutPresenter
import com.stripe.android.elements.PaymentElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.inOrder
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class StripeSdkModuleCheckoutTest {
  @OptIn(CheckoutSessionPreview::class)
  @Test
  fun `sheet requests resolve after native invocation and reuse the payment element`() {
    val context = mock(ReactApplicationContext::class.java)
    val module = StripeSdkModule(context)
    val controller = mock(CheckoutController::class.java)
    val presenter = mock(CheckoutPresenter::class.java)
    val element = mock(PaymentElement::class.java)
    val session = checkoutSession()
    `when`(controller.session).thenReturn(MutableStateFlow(session))
    val instance = NativeCheckoutControllerInstance(
      controller,
      mock(EventEmitterCompat::class.java),
      CoroutineScope(SupervisorJob() + Dispatchers.Unconfined),
      JavaOnlyMap(),
    )
    val controllerId = "controller"
    module.checkoutControllers[controllerId] = instance
    val missingActivity = mock(Promise::class.java)
    module.presentCheckoutPaymentElement(controllerId, missingActivity)
    shadowOf(Looper.getMainLooper()).idle()
    verify(missingActivity).reject("Failed", "Checkout requires a resumed activity to present Payment Element.")

    val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    try {
      `when`(context.currentActivity).thenReturn(activity.get())
      `when`(controller.createPresenter(activity.get())).thenReturn(presenter)
      `when`(presenter.paymentElement()).thenReturn(element)
      val promise = mock(Promise::class.java)
      val order = inOrder(element, promise)
      repeat(2) {
        module.presentCheckoutPaymentElement(controllerId, promise)
        shadowOf(Looper.getMainLooper()).idle()
        order.verify(element).present()
        order.verify(promise).resolve(null)
      }
      verify(controller, times(1)).createPresenter(activity.get())
      module.checkoutControllers.remove(controllerId)?.destroy()
      val staleRequest = mock(Promise::class.java)
      module.presentCheckoutPaymentElement(controllerId, staleRequest)
      shadowOf(Looper.getMainLooper()).idle()
      verify(staleRequest).reject("Failed", "Checkout controller `$controllerId` does not exist.")
      verify(element, times(2)).present()
    } finally {
      module.checkoutControllers.remove(controllerId)?.destroy()
      activity.pause().stop().destroy()
    }
  }

  @OptIn(CheckoutSessionPreview::class)
  @Test
  fun `confirmation invokes native and resolves from the controller callback`() {
    val context = mock(ReactApplicationContext::class.java)
    val module = StripeSdkModule(context)
    val controller = mock(CheckoutController::class.java)
    val presenter = mock(CheckoutPresenter::class.java)
    val session = checkoutSession(status = NativeCheckoutFixtures.completeStatus())
    `when`(controller.session).thenReturn(MutableStateFlow(session))
    `when`(controller.isUpdating).thenReturn(MutableStateFlow(false))
    val instance = NativeCheckoutControllerInstance(
      controller,
      mock(EventEmitterCompat::class.java),
      CoroutineScope(SupervisorJob() + Dispatchers.Unconfined),
      JavaOnlyMap(),
    )
    module.checkoutControllers["controller"] = instance
    val missingActivity = mock(Promise::class.java)
    module.confirmCheckout("controller", missingActivity)
    shadowOf(Looper.getMainLooper()).idle()
    verify(missingActivity).reject("Failed", "Checkout requires a resumed activity to confirm.")
    val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    try {
      `when`(context.currentActivity).thenReturn(activity.get())
      `when`(controller.createPresenter(activity.get())).thenReturn(presenter)
      doAnswer {
        instance.onConfirmationResult(NativeCheckoutFixtures.completedResult())
        null
      }.`when`(presenter).confirm()
      val promise = mock(Promise::class.java)
      module.confirmCheckout("controller", promise)
      shadowOf(Looper.getMainLooper()).idle()
      verify(presenter).confirm()
      val result = ArgumentCaptor.forClass(Any::class.java)
      verify(promise).resolve(result.capture())
      assertEquals("completed", (result.value as ReadableMap).getString("status"))
      assertEquals("paid", (result.value as ReadableMap).getString("paymentStatus"))
      module.checkoutControllers.remove("controller")?.destroy()
      val missingController = mock(Promise::class.java)
      module.confirmCheckout("controller", missingController)
      shadowOf(Looper.getMainLooper()).idle()
      verify(missingController).reject("Failed", "Checkout controller `controller` does not exist.")
    } finally {
      module.checkoutControllers.remove("controller")?.destroy()
      activity.pause().stop().destroy()
    }
  }

  @Test
  fun `creation queued before invalidation cannot register afterward`() {
    val module = StripeSdkModule(mock(ReactApplicationContext::class.java))
    val promise = mock(Promise::class.java)
    val caller = Thread {
      module.createCheckout(JavaOnlyMap.of("clientSecret", "cs_test_secret_123"), "controller", promise)
    }
    caller.start()
    caller.join(2_000)
    assertFalse("Native call should enqueue work without blocking", caller.isAlive)
    module.invalidate()
    shadowOf(Looper.getMainLooper()).idle()

    verify(promise).reject("Failed", "Stripe SDK was invalidated.")
    assertEquals(0, module.checkoutControllers.size)
  }
}
