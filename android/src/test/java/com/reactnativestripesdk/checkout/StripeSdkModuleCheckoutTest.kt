package com.reactnativestripesdk.checkout

import android.os.Looper
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.StripeSdkModule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class StripeSdkModuleCheckoutTest {
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
