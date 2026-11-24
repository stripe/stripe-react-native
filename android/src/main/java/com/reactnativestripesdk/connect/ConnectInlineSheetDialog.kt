package com.reactnativestripesdk.connect

import android.app.Activity
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import androidx.annotation.ColorInt
import androidx.annotation.RequiresApi
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import kotlin.math.ceil
import kotlin.math.roundToInt

/**
 * Shows a window that an inline Connect component opened in a bottom sheet over a dimmed screen.
 *
 * While the sheet is dismissible, back, swiping down, and tapping outside dismiss it and call [onDismissed]. While it
 * isn't, each of those calls [onCloseRequested] instead, and the sheet stays until its window closes. As its own
 * window, it gets back presses before React Native's back handler does. It draws its own rounded top and grabber, so
 * it looks the same whatever the app's theme.
 */
internal class ConnectInlineSheetDialog(
  activity: Activity,
  private val webView: ConnectInlineSheetWebView,
  @ColorInt backgroundColor: Int,
  private val onDismissed: () -> Unit,
  private val onCloseRequested: () -> Unit,
) : BottomSheetDialog(activity) {
  private val density = activity.resources.displayMetrics.density
  private val container = LinearLayout(activity)
  private var isDismissingProgrammatically = false
  private var isDismissible = true
  private var backInvokedCallback: OnBackInvokedCallback? = null

  init {
    buildChrome(backgroundColor)
    setContentView(container, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0))
    // The theme's sheet background would show square corners behind the rounded top.
    findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)?.setBackgroundColor(Color.TRANSPARENT)
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
    heightDp: Double,
    dismissible: Boolean,
  ) {
    update(heightDp, dismissible)
    if (isShowing) return
    if (webView.parent !== container) {
      (webView.parent as? ViewGroup)?.removeView(webView)
      container.addView(webView, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
    }
    show()
  }

  fun update(
    heightDp: Double,
    dismissible: Boolean,
  ) {
    setDismissible(dismissible)
    val topInset =
      window
        ?.decorView
        ?.let(ViewCompat::getRootWindowInsets)
        ?.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
        ?.top ?: 0
    val maxHeight = context.resources.displayMetrics.heightPixels - topInset - dp(TOP_GAP_DP)
    val contentHeight = maxOf(ceil(heightDp * density).toInt(), dp(MIN_HEIGHT_DP))
    val height = minOf(contentHeight + dp(HANDLE_AREA_HEIGHT_DP), maxHeight)
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

  private fun buildChrome(
    @ColorInt backgroundColor: Int,
  ) {
    val radius = dp(CORNER_RADIUS_DP).toFloat()
    container.orientation = LinearLayout.VERTICAL
    container.background =
      GradientDrawable().apply {
        cornerRadii = floatArrayOf(radius, radius, radius, radius, 0f, 0f, 0f, 0f)
        setColor(backgroundColor)
      }
    container.outlineProvider =
      object : ViewOutlineProvider() {
        override fun getOutline(
          view: View,
          outline: Outline,
        ) = outline.setRoundRect(0, 0, view.width, view.height + radius.toInt(), radius)
      }
    container.clipToOutline = true

    val isLightBackground = ColorUtils.calculateLuminance(backgroundColor) > LIGHT_BACKGROUND_LUMINANCE
    val grabberColor = if (isLightBackground) Color.BLACK else Color.WHITE
    val grabber =
      View(context).apply {
        background =
          GradientDrawable().apply {
            cornerRadius = dp(GRABBER_HEIGHT_DP / 2).toFloat()
            setColor(ColorUtils.setAlphaComponent(grabberColor, GRABBER_ALPHA))
          }
      }
    val handleArea = FrameLayout(context)
    handleArea.addView(grabber, FrameLayout.LayoutParams(dp(GRABBER_WIDTH_DP), dp(GRABBER_HEIGHT_DP), Gravity.CENTER))
    container.addView(
      handleArea,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(HANDLE_AREA_HEIGHT_DP)),
    )
  }

  private fun dp(value: Int): Int = (value * density).roundToInt()

  private companion object {
    const val MIN_HEIGHT_DP = 120
    const val TOP_GAP_DP = 24
    const val CORNER_RADIUS_DP = 28
    const val HANDLE_AREA_HEIGHT_DP = 28
    const val GRABBER_WIDTH_DP = 32
    const val GRABBER_HEIGHT_DP = 4
    const val GRABBER_ALPHA = 0x33
    const val LIGHT_BACKGROUND_LUMINANCE = 0.5
  }
}
