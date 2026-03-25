package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.readableMapOf
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class FlowControllerManagerTest {
  // ============================================
  // configure() / onConfigure error path Tests
  // ============================================

  @Test
  fun configure_EmptyMerchantDisplayName_ResolvesWithError() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "",
      )

    val manager = FlowControllerManager(context, args, initPromise)
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
  fun configure_NoSecretOrIntentConfig_ResolvesWithError() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "Test Store",
      )

    // FlowControllerManager.onConfigure calls configureFlowController which
    // requires one of paymentIntentClientSecret, setupIntentClientSecret, or intentConfiguration.
    // When none are provided and flowController is null, it will resolve with an error.
    val manager = FlowControllerManager(context, args, initPromise)
    val promise = mock(Promise::class.java)
    manager.configure(args, promise)

    val captor = ArgumentCaptor.forClass(Any::class.java)
    verify(promise).resolve(captor.capture())
    val resolved = captor.value

    // Should resolve with an error because no secrets/intent config + no flowController
    assertNotNull(resolved)
    assertTrue(resolved is WritableMap)
    val map = resolved as WritableMap
    val errorMap = map.getMap("error")
    assertNotNull(errorMap)
    assertTrue(
      errorMap!!.getString("message")!!.contains("paymentIntentClientSecret"),
    )
  }

  // ============================================
  // confirmPayment Tests (overridden behavior)
  // ============================================

  @Test
  fun confirmPayment_WithNullFlowController_DoesNotCrash() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "Test Store",
      )

    val manager = FlowControllerManager(context, args, initPromise)
    val promise = mock(Promise::class.java)

    // Should not throw even with null flowController — confirm() on null is a no-op
    manager.confirmPayment(promise)
  }

  // ============================================
  // CompletableDeferred callbacks Tests
  // ============================================

  @Test
  fun intentCreationCallback_InitiallyNotCompleted() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "Test Store",
      )

    val manager = FlowControllerManager(context, args, initPromise)
    assertTrue(!manager.paymentSheetIntentCreationCallback.isCompleted)
  }

  @Test
  fun confirmationTokenCreationCallback_InitiallyNotCompleted() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "Test Store",
      )

    val manager = FlowControllerManager(context, args, initPromise)
    assertTrue(!manager.paymentSheetConfirmationTokenCreationCallback.isCompleted)
  }

  @Test
  fun intentCreationCallback_CanBeCompleted() {
    val context = mock(ReactApplicationContext::class.java)
    val initPromise = mock(Promise::class.java)
    val args =
      readableMapOf(
        "merchantDisplayName" to "Test Store",
      )

    val manager = FlowControllerManager(context, args, initPromise)
    val result =
      readableMapOf(
        "clientSecret" to "pi_secret_123",
      )
    manager.paymentSheetIntentCreationCallback.complete(result)
    assertTrue(manager.paymentSheetIntentCreationCallback.isCompleted)
  }
}
