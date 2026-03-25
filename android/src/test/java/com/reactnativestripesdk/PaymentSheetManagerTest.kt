package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.readableMapOf
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PaymentSheetManagerTest {
  // ============================================
  // onConfigure Tests
  // ============================================

  @Test
  fun onConfigure_ResolvesWithEmptyMap() {
    val context = Mockito.mock(ReactApplicationContext::class.java)
    val initPromise = Mockito.mock(Promise::class.java)
    val args =
        readableMapOf(
            "merchantDisplayName" to "Test Store",
        )

    val manager = PaymentSheetManager(context, args, initPromise)
    val promise = Mockito.mock(Promise::class.java)

    // Call onConfigure directly via reflection since it's protected;
    // or test via configure() which calls onConfigure at the end.
    // We test indirectly through configure().
    manager.configure(args, promise)

    val captor = ArgumentCaptor.forClass(Any::class.java)
    Mockito.verify(promise).resolve(captor.capture())
    val resolved = captor.value

    // PaymentSheetManager.onConfigure resolves with an empty WritableMap (no error key)
      Assert.assertNotNull(resolved)
      Assert.assertTrue(resolved is WritableMap)
    val map = resolved as WritableMap
      Assert.assertTrue(!map.hasKey("error"))
  }

  // ============================================
  // confirmPayment Tests (inherited default)
  // ============================================

  @Test
  fun confirmPayment_ResolvesWithError_BecauseNotCustomFlow() {
    val context = Mockito.mock(ReactApplicationContext::class.java)
    val initPromise = Mockito.mock(Promise::class.java)
    val args =
        readableMapOf(
            "merchantDisplayName" to "Test Store",
        )

    val manager = PaymentSheetManager(context, args, initPromise)
    val promise = Mockito.mock(Promise::class.java)
    manager.confirmPayment(promise)

    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    Mockito.verify(promise).resolve(captor.capture())
    val resolved = captor.value
      Assert.assertNotNull(resolved)
    val errorMap = resolved.getMap("error")
      Assert.assertNotNull(errorMap)
      Assert.assertTrue(
          errorMap!!.getString("message")!!.contains("custom flow"),
      )
  }

  // ============================================
  // onCreate edge cases
  // ============================================

  @Test
  fun onCreate_EmptyMerchantDisplayName_ResolvesInitPromiseWithError() {
    val context = Mockito.mock(ReactApplicationContext::class.java)
    val initPromise = Mockito.mock(Promise::class.java)
    val args =
        readableMapOf(
            "merchantDisplayName" to "",
        )

    // onCreate is called on the UI thread normally, but we can test
    // configure() directly which has the same validation logic.
    val manager = PaymentSheetManager(context, args, initPromise)
    val promise = Mockito.mock(Promise::class.java)
    manager.configure(args, promise)

    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    Mockito.verify(promise).resolve(captor.capture())
    val resolved = captor.value
    val errorMap = resolved.getMap("error")
      Assert.assertNotNull(errorMap)
      Assert.assertTrue(
          errorMap!!.getString("message")!!.contains("merchantDisplayName"),
      )
  }
}
