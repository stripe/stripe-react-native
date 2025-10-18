package com.reactnativestripesdk.utils

import android.annotation.SuppressLint
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.core.reactnative.UnregisterSignal

@ReactNativeSdkInternal
@SuppressLint("RestrictedApi")
abstract class StripeUIManager(
  protected val context: ReactApplicationContext,
) {
  protected val signal = UnregisterSignal()
  protected var promise: Promise? = null
  protected var timeout: Long? = null

  protected open fun onCreate() {}

  protected abstract fun onPresent()

  protected open fun onDestroy() {
    signal.unregister()
  }

  fun create() {
    UiThreadUtil.runOnUiThread {
      onCreate()
    }
  }

  fun present(
    promise: Promise? = null,
    timeout: Long? = null,
  ) {
    UiThreadUtil.runOnUiThread {
      this.promise = promise
      this.timeout = timeout
      onPresent()
    }
  }

  fun destroy() {
    UiThreadUtil.runOnUiThread {
      onDestroy()
    }
  }

  /**
   * Safely get and cast the current activity as an AppCompatActivity. If that fails, the promise
   * provided will be resolved with an error message instructing the user to retry the method.
   */
  protected fun getCurrentActivityOrResolveWithError(promise: Promise?): FragmentActivity? {
    (context.currentActivity as? FragmentActivity)?.let {
      return it
    }
    promise?.resolve(createMissingActivityError())
    return null
  }
}
