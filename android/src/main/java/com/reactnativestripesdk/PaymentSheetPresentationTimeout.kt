package com.reactnativestripesdk

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.reactnativestripesdk.utils.DefaultActivityLifecycleCallbacks

internal class PaymentSheetPresentationTimeout(
  private val application: Application,
  timeoutMs: Long,
  private val onTimeout: () -> Unit,
) {
  private val handler = Handler(Looper.getMainLooper())
  private var isActive = true
  private var paymentSheetActivity: Activity? = null
  private val finishOnTimeout =
    Runnable {
      if (isActive) {
        paymentSheetActivity?.let { activity ->
          onTimeout()
          activity.finish()
        }
      }
    }
  private val activityLifecycleCallbacks =
    object : DefaultActivityLifecycleCallbacks() {
      override fun onActivityCreated(
        activity: Activity,
        savedInstanceState: Bundle?,
      ) {
        if (isActive &&
          (activity.javaClass.name == PAYMENT_SHEET_ACTIVITY || activity.javaClass.name == PAYMENT_OPTIONS_ACTIVITY)
        ) {
          paymentSheetActivity = activity
        }
      }

      override fun onActivityDestroyed(activity: Activity) {
        if (activity === paymentSheetActivity) {
          cancel()
        }
      }
    }

  init {
    application.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)
    handler.postDelayed(finishOnTimeout, timeoutMs)
  }

  fun cancel() {
    if (!isActive) return
    isActive = false
    handler.removeCallbacks(finishOnTimeout)
    application.unregisterActivityLifecycleCallbacks(activityLifecycleCallbacks)
    paymentSheetActivity = null
  }

  private companion object {
    const val PAYMENT_SHEET_ACTIVITY = "com.stripe.android.paymentsheet.PaymentSheetActivity"
    const val PAYMENT_OPTIONS_ACTIVITY = "com.stripe.android.paymentsheet.PaymentOptionsActivity"
  }
}
