package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.readableMapOf
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class BasePaymentSheetManagerTest {
  // ============================================
  // createMissingInitError Tests
  // ============================================

  @Test
  fun createMissingInitError_ReturnsErrorWithCorrectCode() {
    val error = BasePaymentSheetManager.createMissingInitError()
    assertNotNull(error)
    val errorMap = error.getMap("error")
    assertNotNull(errorMap)
    assertEquals("Failed", errorMap!!.getString("code"))
  }

  @Test
  fun createMissingInitError_ReturnsErrorWithCorrectMessage() {
    val error = BasePaymentSheetManager.createMissingInitError()
    val errorMap = error.getMap("error")
    assertNotNull(errorMap)
    assertTrue(
      errorMap!!.getString("message")!!.contains("initPaymentSheet"),
    )
  }

  // ============================================
  // configure() Tests
  // ============================================

  @Test
  fun configure_EmptyMerchantDisplayName_ResolvesWithError() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "",
      )

    val manager = TestPaymentSheetManager(context, args, initPromise)
    val promise = mock(Promise::class.java)
    manager.configure(args, promise)

    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    verify(promise).resolve(captor.capture())
    val resolved = captor.value
    assertNotNull(resolved)
    val errorMap = resolved.getMap("error")
    assertNotNull(errorMap)
    assertTrue(
      errorMap!!.getString("message")!!.contains("merchantDisplayName"),
    )
  }

  @Test
  fun configure_NullMerchantDisplayName_ResolvesWithError() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args = readableMapOf("someKey" to "someValue")

    val manager = TestPaymentSheetManager(context, args, initPromise)
    val promise = mock(Promise::class.java)
    manager.configure(args, promise)

    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    verify(promise).resolve(captor.capture())
    val resolved = captor.value
    assertNotNull(resolved)
    val errorMap = resolved.getMap("error")
    assertNotNull(errorMap)
    assertTrue(
      errorMap!!.getString("message")!!.contains("merchantDisplayName"),
    )
  }

  // ============================================
  // confirmPayment() default behavior Tests
  // ============================================

  @Test
  fun confirmPayment_DefaultImplementation_ResolvesWithError() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args = readableMapOf("merchantDisplayName" to "Test")

    val manager = TestPaymentSheetManager(context, args, initPromise)
    val promise = mock(Promise::class.java)
    manager.confirmPayment(promise)

    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    verify(promise).resolve(captor.capture())
    val resolved = captor.value
    assertNotNull(resolved)
    val errorMap = resolved.getMap("error")
    assertNotNull(errorMap)
    assertTrue(
      errorMap!!.getString("message")!!.contains("custom flow"),
    )
  }

  // ============================================
  // CompletableDeferred callback field Tests
  // ============================================

  @Test
  fun paymentSheetIntentCreationCallback_InitiallyNotCompleted() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args = readableMapOf("merchantDisplayName" to "Test")

    val manager = TestPaymentSheetManager(context, args, initPromise)
    assertTrue(!manager.paymentSheetIntentCreationCallback.isCompleted)
  }

  @Test
  fun paymentSheetConfirmationTokenCreationCallback_InitiallyNotCompleted() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args = readableMapOf("merchantDisplayName" to "Test")

    val manager = TestPaymentSheetManager(context, args, initPromise)
    assertTrue(!manager.paymentSheetConfirmationTokenCreationCallback.isCompleted)
  }

  @Test
  fun paymentSheetIntentCreationCallback_CanBeCompleted() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args = readableMapOf("merchantDisplayName" to "Test")

    val manager = TestPaymentSheetManager(context, args, initPromise)
    val result =
      readableMapOf(
        "clientSecret" to "pi_secret",
      )
    manager.paymentSheetIntentCreationCallback.complete(result)
    assertTrue(manager.paymentSheetIntentCreationCallback.isCompleted)
  }

  /**
   * Concrete test subclass that avoids Stripe SDK initialization in onCreate/onPresent.
   */
  private class TestPaymentSheetManager(
    context: ReactApplicationContext,
    arguments: ReadableMap,
    initPromise: Promise,
  ) : BasePaymentSheetManager(context, arguments, initPromise) {
    override fun onConfigure(promise: Promise) {
      promise.resolve(Arguments.createMap())
    }

    override fun onPresent() {
      // no-op for testing
    }
  }
}
