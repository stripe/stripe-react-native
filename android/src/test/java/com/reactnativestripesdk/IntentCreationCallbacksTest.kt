package com.reactnativestripesdk

import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.util.ReflectionHelpers

@RunWith(RobolectricTestRunner::class)
class IntentCreationCallbacksTest {
  @Test
  fun `responses complete only the matching component for both callback kinds`() = runBlocking {
    for (useConfirmationToken in listOf(false, true)) {
      for (firstComponent in listOf("paymentSheet", "embeddedPaymentElement")) {
        val context = BridgeReactContext(RuntimeEnvironment.getApplication())
        try {
          val module = StripeSdkModule(context)
          val manager = PaymentSheetManager(context, JavaOnlyMap(), mock(Promise::class.java))
          ReflectionHelpers.setField(module, "paymentSheetManager", manager)
          val sheet = if (useConfirmationToken) {
            manager.paymentSheetConfirmationTokenCreationCallback
          } else {
            manager.paymentSheetIntentCreationCallback
          }
          val embedded = if (useConfirmationToken) {
            module.embeddedConfirmationTokenCreationCallback
          } else {
            module.embeddedIntentCreationCallback
          }
          val secondComponent = if (firstComponent == "paymentSheet") "embeddedPaymentElement" else "paymentSheet"
          val first = if (firstComponent == "paymentSheet") sheet else embedded
          val second = if (firstComponent == "paymentSheet") embedded else sheet
          fun respond(component: String, secret: String) {
            val promise = mock(Promise::class.java)
            val response = JavaOnlyMap.of("clientSecret", secret)
            if (component == "embeddedPaymentElement") {
              if (useConfirmationToken) {
                module.embeddedConfirmationTokenCreationCallback(response, promise)
              } else {
                module.embeddedIntentCreationCallback(response, promise)
              }
            } else if (useConfirmationToken) {
              module.confirmationTokenCreationCallback(response, promise)
            } else {
              module.intentCreationCallback(response, promise)
            }
            verify(promise).resolve(null)
          }
          respond(firstComponent, "first-secret")
          assertEquals("first-secret", first.await().getString("clientSecret"))
          assertFalse(second.isCompleted)
          respond(secondComponent, "second-secret")
          assertEquals("second-secret", second.await().getString("clientSecret"))
        } finally {
          context.destroy()
        }
      }
    }
  }

  @Test
  fun `embedded responses do not require a PaymentSheet manager`() = runBlocking {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    try {
      val module = StripeSdkModule(context)
      val response = JavaOnlyMap.of("clientSecret", "test-secret")
      module.embeddedIntentCreationCallback(response, mock(Promise::class.java))
      module.embeddedConfirmationTokenCreationCallback(response, mock(Promise::class.java))
      assertEquals(response, module.embeddedIntentCreationCallback.await())
      assertEquals(response, module.embeddedConfirmationTokenCreationCallback.await())
    } finally {
      context.destroy()
    }
  }
}
