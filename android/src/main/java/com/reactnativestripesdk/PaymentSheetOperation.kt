package com.reactnativestripesdk

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.utils.DefaultActivityLifecycleCallbacks
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetErrorType
import com.reactnativestripesdk.utils.createError
import com.stripe.android.paymentsheet.PaymentSheetResult
import kotlinx.coroutines.Job
import java.lang.ref.WeakReference

/** Owns a single JavaScript call, including delivery after its host registration is released. */
internal class PaymentSheetOperation(
  private val context: ReactApplicationContext,
  private var promise: Promise?,
  private val onFinished: (PaymentSheetOperation) -> Unit,
) {
  var processingJob: Job? = null
  var timedOut = false
    private set
  private var deliveryStarted = false
  private var disposed = false
  private var cancelDelivery: (() -> Unit)? = null
  private var cancelTimeout: (() -> Unit)? = null
  private var keepJsAwake: KeepJsAwakeTask? = null

  fun start(
    host: Activity,
    timeout: Long?,
    sheetActivityName: String,
  ) {
    keepJsAwake = KeepJsAwakeTask(context).apply { start() }
    if (timeout == null) return

    val application = host.application
    val handler = Handler(Looper.getMainLooper())
    var sheetActivity: WeakReference<Activity>? = null
    // Only capture the first matching Activity. A later presentation must not replace it.
    var capturedActivity = false
    val runnable = Runnable {
      sheetActivity?.get()?.let { activity ->
        if (!activity.isFinishing && !activity.isDestroyed) {
          timedOut = true
          activity.finish()
        }
      }
    }
    val observer = object : DefaultActivityLifecycleCallbacks() {
      override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        if (!capturedActivity && activity.javaClass.name == sheetActivityName) {
          capturedActivity = true
          sheetActivity = WeakReference(activity)
        }
      }

      override fun onActivityDestroyed(activity: Activity) {
        if (sheetActivity?.get() === activity) {
          cancelTimeout?.invoke()
          cancelTimeout = null
        }
      }
    }
    cancelTimeout = {
      handler.removeCallbacks(runnable)
      application.unregisterActivityLifecycleCallbacks(observer)
      sheetActivity = null
    }
    application.registerActivityLifecycleCallbacks(observer)
    handler.postDelayed(runnable, timeout)
  }

  fun stopPresentationWork() {
    cancelTimeout?.invoke()
    cancelTimeout = null
    keepJsAwake?.stop()
    keepJsAwake = null
  }

  fun complete(paymentResult: PaymentSheetResult) {
    val result = when {
      paymentResult is PaymentSheetResult.Completed -> Arguments.createMap()
      timedOut -> createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out")
      paymentResult is PaymentSheetResult.Canceled -> createError(
        PaymentSheetErrorType.Canceled.toString(), "The payment flow has been canceled",
      )
      paymentResult is PaymentSheetResult.Failed -> createError(
        PaymentSheetErrorType.Failed.toString(), paymentResult.error,
      )
      else -> error("Unexpected PaymentSheet result")
    }
    deliver(result)
  }

  fun deliver(value: Any?) {
    if (promise == null || deliveryStarted) return
    deliveryStarted = true
    stopPresentationWork()
    val cancel = runWhenActivityAvailable(context) {
      val originalPromise = promise
      dispose()
      originalPromise?.resolve(value)
    }
    if (promise == null) {
      cancel()
    } else {
      cancelDelivery = cancel
    }
  }

  fun dispose() {
    if (disposed) return
    disposed = true
    promise = null
    cancelDelivery?.invoke()
    cancelDelivery = null
    processingJob?.cancel()
    processingJob = null
    stopPresentationWork()
    onFinished(this)
  }
}
