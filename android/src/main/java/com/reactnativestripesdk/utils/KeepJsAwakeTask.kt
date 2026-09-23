package com.reactnativestripesdk.utils

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext

/**
 * When Stripe UI is presented, React Native pauses timers. This will cause issues if we need
 * to run JS while UI is presented. This starts a HeadlessJsTask to prevent React Native from
 * pausing timers.
 */
internal class KeepJsAwakeTask(
  private val context: ReactApplicationContext,
) {
  private var taskId: Int? = null
  private var stopped = false

  fun start() {
    runOnUiThread {
      if (stopped || taskId != null) return@runOnUiThread
      val headlessJsTaskContext = HeadlessJsTaskContext.getInstance(context)
      val taskConfig =
        HeadlessJsTaskConfig(
          "StripeKeepJsAwakeTask",
          Arguments.createMap(),
          0,
          true,
        )
      taskId = headlessJsTaskContext.startTask(taskConfig)
    }
  }

  fun stop() {
    runOnUiThread {
      stopped = true
      val taskId = taskId ?: return@runOnUiThread
      val headlessJsTaskContext = HeadlessJsTaskContext.getInstance(context)

      try {
        headlessJsTaskContext.finishTask(taskId)
      } catch (_: AssertionError) {
        // Ignore if task already finished
        Log.w("KeepJsAwakeTask", "Tried to stop a non-existent task (id=$taskId)")
      } finally {
        this.taskId = null
      }
    }
  }

  private fun runOnUiThread(action: () -> Unit) {
    if (UiThreadUtil.isOnUiThread()) {
      action()
    } else {
      UiThreadUtil.runOnUiThread { action() }
    }
  }
}
