package com.reactnativestripesdk.utils

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

  fun start() {
    val headlessJsTaskContext = HeadlessJsTaskContext.getInstance(context)
    UiThreadUtil.runOnUiThread {
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
    val taskId = taskId ?: return
    val headlessJsTaskContext = HeadlessJsTaskContext.getInstance(context)
    headlessJsTaskContext.finishTask(taskId)
    this.taskId = null
  }
}
