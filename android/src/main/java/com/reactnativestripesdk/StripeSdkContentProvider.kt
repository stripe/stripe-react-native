package com.reactnativestripesdk

import android.app.Activity
import android.app.Application
import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import com.stripe.android.connect.EmbeddedComponentManager

class StripeSdkContentProvider : ContentProvider() {
  override fun onCreate(): Boolean {
    (context?.applicationContext as Application).registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
      override fun onActivityCreated(
        activity: Activity,
        savedInstanceState: Bundle?
      ) {
        if (activity is ComponentActivity) {
          EmbeddedComponentManager.onActivityCreate(activity)
        }
      }

      override fun onActivityDestroyed(activity: Activity) {
      }

      override fun onActivityPaused(activity: Activity) {
      }

      override fun onActivityResumed(activity: Activity) {
      }

      override fun onActivitySaveInstanceState(
        activity: Activity,
        outState: Bundle
      ) {
      }

      override fun onActivityStarted(activity: Activity) {
      }

      override fun onActivityStopped(activity: Activity) {
      }

    })
    return true
  }

  override fun query(
    p0: Uri,
    p1: Array<out String?>?,
    p2: String?,
    p3: Array<out String?>?,
    p4: String?
  ): Cursor? = null

  override fun getType(p0: Uri): String? = null

  override fun insert(p0: Uri, p1: ContentValues?): Uri? = null

  override fun delete(
    p0: Uri,
    p1: String?,
    p2: Array<out String?>?
  ): Int = 0

  override fun update(
    p0: Uri,
    p1: ContentValues?,
    p2: String?,
    p3: Array<out String?>?
  ): Int = 0
}
