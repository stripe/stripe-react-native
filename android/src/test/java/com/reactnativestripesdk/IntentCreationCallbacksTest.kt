package com.reactnativestripesdk

import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
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
      for (embeddedFirst in listOf(false, true)) {
        val context = BridgeReactContext(RuntimeEnvironment.getApplication())
        try {
          val module = StripeSdkModule(context)
          val manager = PaymentSheetManager(context, JavaOnlyMap(), mock(Promise::class.java))
          ReflectionHelpers.setField(module, "paymentSheetManager", manager)
          val sheet = if (useConfirmationToken) {
            manager.paymentSheetConfirmationTokenCreationCallback to module::confirmationTokenCreationCallback
          } else {
            manager.paymentSheetIntentCreationCallback to module::intentCreationCallback
          }
          val embeddedRespond: (ReadableMap, Promise) -> Unit = if (useConfirmationToken) {
            module::embeddedConfirmationTokenCreationCallback
          } else {
            module::embeddedIntentCreationCallback
          }
          val embedded = if (useConfirmationToken) {
            module.embeddedConfirmationTokenCreationCallback to embeddedRespond
          } else {
            module.embeddedIntentCreationCallback to embeddedRespond
          }
          val requests = if (embeddedFirst) listOf(embedded, sheet) else listOf(sheet, embedded)
          requests.forEachIndexed { index, (request, respond) ->
            val promise = mock(Promise::class.java)
            val response = JavaOnlyMap.of("clientSecret", "secret-$index")
            respond(response, promise)
            verify(promise).resolve(null)
            assertEquals(response, request.await())
            if (index == 0) assertFalse(requests[1].first.isCompleted)
          }
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
