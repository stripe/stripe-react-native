package com.reactnativestripesdk

import android.app.Activity
import android.os.Bundle
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wallet.PaymentData
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class GooglePayRequestLauncherTest {
  @Test
  fun launchesCompletedTaskAndCleansUpAfterDelivery() {
    val context = mock(ReactApplicationContext::class.java)
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    `when`(context.currentActivity).thenReturn(activity)
    var resultCount = 0
    val launcher = GooglePayRequestLauncher(context) { result ->
      assertTrue(result.status.isSuccess)
      assertEquals("{}", result.result!!.toJson())
      resultCount += 1
    }
    launcher.launch(activity, Tasks.forResult(PaymentData.fromJson("{}")))
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals(1, resultCount)
    verify(context).addLifecycleEventListener(launcher)
    verify(context).removeLifecycleEventListener(launcher)
  }

  @Test
  fun reconnectsPendingResultAfterActivityRecreation() {
    val context = mock(ReactApplicationContext::class.java)
    val original = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    `when`(context.currentActivity).thenReturn(original)
    var resultCount = 0
    val launcher = GooglePayRequestLauncher(context) { result ->
      assertTrue(result.status.isCanceled)
      resultCount += 1
    }
    launcher.onHostResume()
    val state = Bundle()
    original.activityResultRegistry.onSaveInstanceState(state)
    val keys = state.getStringArrayList("KEY_COMPONENT_ACTIVITY_REGISTERED_KEYS")!!
    val codes = state.getIntegerArrayList("KEY_COMPONENT_ACTIVITY_REGISTERED_RCS")!!
    val requestCode = codes[keys.indexOfFirst { it.startsWith("StripeGooglePay_") }]
    launcher.onHostDestroy()

    val recreated = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    recreated.activityResultRegistry.onRestoreInstanceState(state)
    // The result can arrive before React resumes and reattaches the callback.
    recreated.activityResultRegistry.dispatchResult(requestCode, Activity.RESULT_CANCELED, null)
    `when`(context.currentActivity).thenReturn(recreated)
    launcher.onHostResume()

    assertEquals(1, resultCount)
    verify(context).removeLifecycleEventListener(launcher)
    launcher.onHostResume()
    recreated.activityResultRegistry.dispatchResult(requestCode, Activity.RESULT_CANCELED, null)
    assertEquals(1, resultCount)
  }
}
