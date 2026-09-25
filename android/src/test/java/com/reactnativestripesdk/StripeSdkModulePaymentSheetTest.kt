package com.reactnativestripesdk

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class StripeSdkModulePaymentSheetTest {
  private val context = mock(ReactApplicationContext::class.java)
  private val factory = mock(PaymentSheetManagerFactory::class.java)
  private val module = StripeSdkModule(context, factory)
  private val activity = mock(FragmentActivity::class.java)
  private val manager = mock(PaymentSheetManager::class.java)
  private val promise = mock(Promise::class.java)

  @Test
  fun initializationCreatesAndConfiguresTheCurrentHostManager() {
    val params = JavaOnlyMap.of("merchantDisplayName", "Example")
    `when`(context.currentActivity).thenReturn(activity)
    `when`(factory.getOrCreate(activity)).thenReturn(manager)

    module.initPaymentSheet(params, promise)
    shadowOf(Looper.getMainLooper()).idle()

    verify(factory).getOrCreate(activity)
    verify(manager).configure(params, promise)
  }

  @Test
  fun presentationAndConfirmationUseTheExistingHostManager() {
    `when`(context.currentActivity).thenReturn(activity)
    `when`(factory.get(activity)).thenReturn(manager)

    module.presentPaymentSheet(JavaOnlyMap(), promise)
    module.confirmPaymentSheetPayment(promise)
    shadowOf(Looper.getMainLooper()).idle()

    verify(manager).present(promise)
    verify(manager).confirmPayment(promise)
    verify(factory, never()).getOrCreate(activity)
  }

  @Test
  fun replacementHostUsesItsOwnManager() {
    val replacement = mock(FragmentActivity::class.java)
    val replacementManager = mock(PaymentSheetManager::class.java)
    `when`(context.currentActivity).thenReturn(activity)
    `when`(factory.getOrCreate(activity)).thenReturn(manager)
    module.initPaymentSheet(JavaOnlyMap(), promise)
    shadowOf(Looper.getMainLooper()).idle()

    `when`(context.currentActivity).thenReturn(replacement)
    `when`(factory.get(replacement)).thenReturn(replacementManager)
    module.presentPaymentSheet(JavaOnlyMap(), promise)
    shadowOf(Looper.getMainLooper()).idle()

    verify(replacementManager).present(promise)
    verify(manager, never()).present(promise)
  }

  @Test
  fun invalidationDisposesTheFactory() {
    module.invalidate()
    shadowOf(Looper.getMainLooper()).idle()

    verify(factory).dispose()
  }
}
