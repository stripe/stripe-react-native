package com.reactnativestripesdk.utils

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

abstract class StripeUIManager(
  protected val context: ReactApplicationContext,
  protected val initPromise: Promise,
) {
  protected abstract fun prepare()

  fun initialize() {
    UiThreadUtil.runOnUiThread {
      prepare()
    }
  }

  /**
   * Safely get and cast the current activity as an AppCompatActivity. If that fails, the promise
   * provided will be resolved with an error message instructing the user to retry the method.
   */
  protected fun getCurrentActivityOrResolveWithError(): FragmentActivity? {
    (context.currentActivity as? FragmentActivity)?.let {
      return it
    }
    initPromise.resolve(createMissingActivityError())
    return null
  }
}
