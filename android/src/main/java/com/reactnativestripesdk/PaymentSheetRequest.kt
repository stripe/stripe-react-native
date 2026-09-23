package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.UiThreadUtil

/**
 * PaymentSheet operations resolve both success and error maps. This wrapper resolves once and runs
 * request cleanup on the main thread before delivering the result.
 */
internal class PaymentSheetRequest(
  private val delegate: Promise,
  private val onResolved: (Any?) -> Unit,
) : Promise by delegate {
  var isPending: Boolean = true
    private set

  override fun resolve(value: Any?) {
    runPaymentSheetOnUiThread {
      if (!isPending) {
        return@runPaymentSheetOnUiThread
      }

      isPending = false
      onResolved(value)
      delegate.resolve(value)
    }
  }
}

internal fun runPaymentSheetOnUiThread(action: () -> Unit) {
  // React Native's runOnUiThread queues even on the UI thread. Finish cleanup before accepting
  // another operation on that thread, while still dispatching callbacks from worker threads.
  if (UiThreadUtil.isOnUiThread()) {
    action()
  } else {
    UiThreadUtil.runOnUiThread { action() }
  }
}
