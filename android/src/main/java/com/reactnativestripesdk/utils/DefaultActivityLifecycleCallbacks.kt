package com.reactnativestripesdk.utils

import android.app.Activity
import android.app.Application
import android.os.Bundle

internal open class DefaultActivityLifecycleCallbacks : Application.ActivityLifecycleCallbacks {
  override fun onActivityCreated(
    activity: Activity,
    savedInstanceState: Bundle?,
  ) {
    // NO-OP
  }

  override fun onActivityStarted(activity: Activity) {
    // NO-OP
  }

  override fun onActivityResumed(activity: Activity) {
    // NO-OP
  }

  override fun onActivityPaused(activity: Activity) {
    // NO-OP
  }

  override fun onActivityStopped(activity: Activity) {
    // NO-OP
  }

  override fun onActivitySaveInstanceState(
    activity: Activity,
    outState: Bundle,
  ) {
    // NO-OP
  }

  override fun onActivityDestroyed(activity: Activity) {
    // NO-OP
  }
}
