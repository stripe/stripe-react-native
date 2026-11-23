package com.reactnativestripesdk.connect

import android.app.Activity
import android.os.Build
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import androidx.annotation.ColorInt
import androidx.annotation.RequiresApi
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import kotlin.math.roundToInt

/**
 * Shows a window that an inline Connect component opened in a bottom sheet over a dimmed screen.
 *
 * While the sheet is dismissible, back, swiping down, and tapping outside dismiss it and call [onDismissed]. While it
 * isn't, each of those calls [onCloseRequested] instead, and the sheet stays until its window closes. As its own
 * window, it gets back presses before React Native's back handler does.
 */
internal class ConnectInlineSheetDialog(
  activity: Activity,
  private val webView: ConnectInlineSheetWebView,
  @ColorInt backgroundColor: Int,
  private val onDismissed: () -> Unit,
  private val onCloseRequested: () -> Unit,
) : BottomSheetDialog(activity) {
  private val density = activity.resources.displayMetrics.density
  private val container = FrameLayout(activity)
  private var isDismissingProgrammatically = false
  private var isDismissible = true
  private var backInvokedCallback: OnBackInvokedCallback? = null

  init {
    container.setBackgroundColor(backgroundColor)
    setContentView(container, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0))
    behavior.skipCollapsed = true
    behavior.addBottomSheetCallback(
      object : BottomSheetBehavior.BottomSheetCallback() {
        override fun onStateChanged(
          bottomSheet: View,
          newState: Int,
        ) {
          // A sheet that can't hide settles collapsed after a drag down, so that's the attempt to dismiss it.
          if (!isDismissible && newState == BottomSheetBehavior.STATE_COLLAPSED) {
            behavior.state = BottomSheetBehavior.STATE_EXPANDED
            onCloseRequested()
          }
        }

        override fun onSlide(
          bottomSheet: View,
          slideOffset: Float,
        ) = Unit
      },
    )
    setOnShowListener {
      behavior.state = BottomSheetBehavior.STATE_EXPANDED
      findViewById<View>(com.google.android.material.R.id.touch_outside)?.setOnClickListener {
        if (isDismissible) cancel() else onCloseRequested()
      }
    }
    setOnKeyListener { _, keyCode, event ->
      if (keyCode != KeyEvent.KEYCODE_BACK || isDismissible) return@setOnKeyListener false
      if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) onCloseRequested()
      true
    }
    setOnDismissListener {
      if (!isDismissingProgrammatically) onDismissed()
      isDismissingProgrammatically = false
    }
  }

  fun present(
    heightDp: Int,
    dismissible: Boolean,
  ) {
    update(heightDp, dismissible)
    if (isShowing) return
    if (webView.parent !== container) {
      (webView.parent as? ViewGroup)?.removeView(webView)
      container.addView(
        webView,
        FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
      )
    }
    show()
  }

  fun update(
    heightDp: Int,
    dismissible: Boolean,
  ) {
    setDismissible(dismissible)
    val maxHeight = (context.resources.displayMetrics.heightPixels * MAX_SCREEN_FRACTION).roundToInt()
    val height = minOf((heightDp * density).roundToInt(), maxHeight)
    val params = container.layoutParams ?: return
    if (params.height != height) {
      params.height = height
      container.layoutParams = params
    }
  }

  fun dismissProgrammatically() {
    if (!isShowing) return
    isDismissingProgrammatically = true
    dismiss()
  }

  private fun setDismissible(dismissible: Boolean) {
    if (isDismissible == dismissible) return
    isDismissible = dismissible
    setCancelable(dismissible)
    behavior.isHideable = dismissible
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) updateBackInvokedCallback()
  }

  // Apps that opt in to predictive back get back presses here instead of as key events.
  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private fun updateBackInvokedCallback() {
    val callback = backInvokedCallback
    if (!isDismissible && callback == null) {
      val newCallback = OnBackInvokedCallback { onCloseRequested() }
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_OVERLAY, newCallback)
      backInvokedCallback = newCallback
    } else if (isDismissible && callback != null) {
      onBackInvokedDispatcher.unregisterOnBackInvokedCallback(callback)
      backInvokedCallback = null
    }
  }

  private companion object {
    const val MAX_SCREEN_FRACTION = 0.92f
  }
}
