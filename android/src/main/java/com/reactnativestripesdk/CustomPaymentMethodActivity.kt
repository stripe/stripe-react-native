package com.reactnativestripesdk

import android.os.Bundle
import android.view.MotionEvent
import com.facebook.react.ReactActivity
import java.lang.ref.WeakReference

/**
 * A transparent activity that is launched when the Payment Element requests the
 * `confirmCustomPaymentMethodCallback`.
 *
 * Its only purpose is to bring the app back to the foreground (the Stripe
 * SDK launches its own proxy activity which pauses the host React Native
 * activity). Having a React (transparent) activity on top ensures that React
 * Native can display UI elements such as `Alert` dialogs coming from
 * JavaScript.
 *
 * The activity uses a translucent theme to minimize visibility and is excluded
 * from recents, though it may still be briefly visible to the end-user during
 * certain operations.
 */
class CustomPaymentMethodActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Disable the transition animation to make it truly invisible
    overridePendingTransition(0, 0)
    super.onCreate(savedInstanceState)
  }

  override fun getMainComponentName(): String? {
    // We don't want to mount another React Native root – returning null is
    // enough to make ReactActivity skip loading a JS component while still
    // hooking into the lifecycle so that ReactContext is aware of this
    // activity.
    return null
  }

  override fun onTouchEvent(event: MotionEvent?): Boolean {
    // Ensure touch events are properly handled by React Native
    return super.onTouchEvent(event)
  }

  override fun dispatchTouchEvent(event: MotionEvent?): Boolean {
    // Ensure touch events are properly dispatched to React Native
    return super.dispatchTouchEvent(event)
  }

  override fun onResume() {
    super.onResume()
    // Ensure the activity is properly focused for touch events
    currentFocus?.requestFocus()
  }

  override fun finish() {
    super.finish()
    // Disable the exit animation as well
    overridePendingTransition(0, 0)

    // Clear the weak reference when finished
    if (currentActivityRef?.get() == this) {
      currentActivityRef = null
    }
  }

  companion object {
    @Volatile
    private var currentActivityRef: WeakReference<CustomPaymentMethodActivity>? = null

    fun finishCurrent() {
      currentActivityRef?.get()?.let { activity ->
        activity.runOnUiThread {
          activity.finish()
        }
      }
    }
  }

  override fun onStart() {
    super.onStart()
    currentActivityRef = WeakReference(this)
  }
}
