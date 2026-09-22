package com.reactnativestripesdk

import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import com.google.android.gms.tasks.Task
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.contract.ApiTaskResult
import com.google.android.gms.wallet.contract.TaskResultContracts
import java.util.UUID

/** Owns one request and reconnects its result callback when the React Activity is recreated. */
internal class GooglePayRequestLauncher(
  private val context: ReactApplicationContext,
  private val callback: (ApiTaskResult<PaymentData>) -> Unit,
) : LifecycleEventListener {
  private val key = "StripeGooglePay_${UUID.randomUUID()}"
  private var activity: FragmentActivity? = null
  private var launcher: ActivityResultLauncher<Task<PaymentData>>? = null
  private var destroyed = false
  private var pendingRequest: Task<PaymentData>? = null

  fun launch(activity: FragmentActivity, request: Task<PaymentData>) {
    context.addLifecycleEventListener(this)
    register(activity)
    pendingRequest = request
    request.addOnCompleteListener { launchPendingRequest() }
  }

  private fun register(currentActivity: FragmentActivity) {
    if (destroyed || activity === currentActivity) return
    launcher?.unregister()
    activity = currentActivity
    // The non-LifecycleOwner overload permits registration after the Activity has started.
    val registered = currentActivity.activityResultRegistry.register(
      key,
      TaskResultContracts.GetPaymentDataResult(),
    ) { result ->
      if (!destroyed) {
        destroy()
        callback(result)
      }
    }
    // Registration can immediately deliver a pending result after Activity recreation.
    if (destroyed) registered.unregister() else launcher = registered
    launchPendingRequest()
  }

  @Suppress("TooGenericExceptionCaught")
  private fun launchPendingRequest() {
    val request = pendingRequest ?: return
    val currentLauncher = launcher ?: return
    if (destroyed || !request.isComplete) return
    pendingRequest = null
    try {
      currentLauncher.launch(request)
    } catch (error: Exception) {
      destroy()
      callback(ApiTaskResult(Status(CommonStatusCodes.INTERNAL_ERROR, error.message ?: "Unable to launch Google Pay.")))
    }
  }

  fun destroy() {
    destroyed = true
    pendingRequest = null
    launcher?.unregister()
    launcher = null
    activity = null
    context.removeLifecycleEventListener(this)
  }

  override fun onHostResume() {
    (context.currentActivity as? FragmentActivity)?.let(::register)
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    launcher?.unregister()
    launcher = null
    activity = null
  }
}
