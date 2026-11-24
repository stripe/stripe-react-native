package com.reactnativestripesdk.connect

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.Outline
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import androidx.annotation.ColorInt
import androidx.annotation.RequiresApi
import androidx.core.graphics.ColorUtils
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updateLayoutParams
import androidx.core.view.updatePadding
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Shows a window that an inline Connect component opened in a bottom sheet over a dimmed screen, drawn the same way
 * as the Android SDK's sheet: a rounded top, a grabber, and the sheet's color behind the navigation bar.
 *
 * While the sheet is dismissible, back, swiping down, and tapping outside dismiss it and call [onDismissed]. While it
 * isn't, each of those calls [onCloseRequested] instead, and the sheet stays until its window closes. As its own
 * window, it gets back presses before React Native's back handler does.
 */
@SuppressLint("ViewConstructor")
@Suppress("TooManyFunctions")
internal class ConnectInlineSheetDialog(
  activity: Activity,
  private val webView: ConnectInlineSheetWebView,
  @ColorInt private val backgroundColor: Int,
  private val onDismissed: () -> Unit,
  private val onCloseRequested: () -> Unit,
) : Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar) {
  private val density = activity.resources.displayMetrics.density
  private val root = FrameLayout(activity)
  private val scrim = View(activity)
  private val sheet = LinearLayout(activity)
  private val handleArea = FrameLayout(activity)

  private var contentHeight: Int? = null
  private var topInset = 0
  private var bottomInset = 0
  private var isDismissible = true
  private var isRevealed = false
  private var isClosing = false
  private var backInvokedCallback: OnBackInvokedCallback? = null

  init {
    setCancelable(false)
    setCanceledOnTouchOutside(false)
    setOnKeyListener { _, keyCode, event ->
      if (keyCode != KeyEvent.KEYCODE_BACK) return@setOnKeyListener false
      if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) requestDismiss()
      true
    }
    buildViews()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(root)
    window?.apply {
      setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
      setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
      clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
      setWindowAnimations(0)
      @Suppress("DEPRECATION")
      setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
      // Edge to edge, so the scrim covers the system bars and the sheet's color continues behind the navigation bar.
      WindowCompat.setDecorFitsSystemWindows(this, false)
      addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
      @Suppress("DEPRECATION")
      statusBarColor = Color.TRANSPARENT
      @Suppress("DEPRECATION")
      navigationBarColor = Color.TRANSPARENT
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        @Suppress("DEPRECATION")
        isStatusBarContrastEnforced = false
        isNavigationBarContrastEnforced = false
      }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) registerBackInvokedCallback()
  }

  fun present(
    heightDp: Double,
    dismissible: Boolean,
  ) {
    if (webView.parent !== sheet) {
      (webView.parent as? ViewGroup)?.removeView(webView)
      sheet.addView(webView, LinearLayout.LayoutParams(MATCH, dp(MIN_HEIGHT_DP)))
    }
    update(heightDp, dismissible)
    if (isShowing || isClosing) return
    show()
    root.post { reveal() }
  }

  fun update(
    heightDp: Double,
    dismissible: Boolean,
  ) {
    isDismissible = dismissible
    contentHeight = ceil(heightDp * density).toInt()
    updateSheetHeight()
  }

  /** Dismisses without telling anyone, for when the sheet's state already says it's gone. */
  fun dismissProgrammatically() {
    isClosing = true
    sheet.animate().cancel()
    scrim.animate().cancel()
    (webView.parent as? ViewGroup)?.removeView(webView)
    if (isShowing) dismiss()
  }

  private fun reveal() {
    if (isRevealed || isClosing) return
    isRevealed = true
    sheet.translationY = max(sheet.height, dp(MIN_HEIGHT_DP)).toFloat()
    sheet.alpha = 1f
    sheet
      .animate()
      .translationY(0f)
      .setDuration(REVEAL_ANIMATION_MILLIS)
      .setInterpolator(DecelerateInterpolator(2f))
      .start()
    scrim.animate().alpha(1f).setDuration(REVEAL_ANIMATION_MILLIS).start()
  }

  private fun requestDismiss() {
    if (!isRevealed || isClosing) return
    if (!isDismissible) {
      sheet.animate().translationY(0f).setDuration(ANIMATION_MILLIS).start()
      onCloseRequested()
      return
    }
    isClosing = true
    scrim.animate().alpha(0f).setDuration(ANIMATION_MILLIS).start()
    sheet
      .animate()
      .translationY(sheet.height.toFloat())
      .setDuration(ANIMATION_MILLIS)
      .setInterpolator(DecelerateInterpolator())
      .withEndAction {
        dismissProgrammatically()
        onDismissed()
      }.start()
  }

  // Apps that opt in to predictive back get back presses here instead of as key events.
  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private fun registerBackInvokedCallback() {
    if (backInvokedCallback != null) return
    val callback = OnBackInvokedCallback { requestDismiss() }
    onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_OVERLAY, callback)
    backInvokedCallback = callback
  }

  private fun updateSheetHeight() {
    if (root.height == 0) return
    val maxSheetHeight = root.height - topInset - dp(TOP_GAP_DP)
    val maxContentHeight = max(0, maxSheetHeight - dp(HANDLE_AREA_HEIGHT_DP) - bottomInset)
    val height = min(max(contentHeight ?: maxContentHeight, dp(MIN_HEIGHT_DP)), maxContentHeight)
    if (webView.parent === sheet && webView.layoutParams?.height != height) {
      webView.updateLayoutParams<LinearLayout.LayoutParams> { this.height = height }
    }
  }

  private fun buildViews() {
    scrim.setBackgroundColor(SCRIM_COLOR)
    scrim.alpha = 0f
    scrim.setOnClickListener { requestDismiss() }
    root.addView(scrim, FrameLayout.LayoutParams(MATCH, MATCH))

    val radius = dp(CORNER_RADIUS_DP).toFloat()
    sheet.orientation = LinearLayout.VERTICAL
    sheet.background =
      GradientDrawable().apply {
        cornerRadii = floatArrayOf(radius, radius, radius, radius, 0f, 0f, 0f, 0f)
        setColor(backgroundColor)
      }
    sheet.outlineProvider =
      object : ViewOutlineProvider() {
        override fun getOutline(
          view: View,
          outline: Outline,
        ) = outline.setRoundRect(0, 0, view.width, view.height + radius.toInt(), radius)
      }
    sheet.clipToOutline = true
    sheet.isClickable = true
    sheet.alpha = 0f
    root.addView(sheet, FrameLayout.LayoutParams(MATCH, WRAP, Gravity.BOTTOM))

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
    handleArea.addView(grabber, FrameLayout.LayoutParams(dp(GRABBER_WIDTH_DP), dp(GRABBER_HEIGHT_DP), Gravity.CENTER))
    handleArea.setOnTouchListener(DragToDismissListener())
    sheet.addView(handleArea, LinearLayout.LayoutParams(MATCH, dp(HANDLE_AREA_HEIGHT_DP)))

    ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      topInset = bars.top
      bottomInset = max(bars.bottom, ime.bottom)
      sheet.updatePadding(bottom = bottomInset)
      updateSheetHeight()
      WindowInsetsCompat.CONSUMED
    }
    root.addOnLayoutChangeListener { _, _, top, _, bottom, _, oldTop, _, oldBottom ->
      if (bottom - top != oldBottom - oldTop) root.post { updateSheetHeight() }
    }
  }

  /** Drags the sheet by its grabber. A long or fast drag down asks to dismiss it; anything else springs back. */
  private inner class DragToDismissListener : View.OnTouchListener {
    private var startY = 0f
    private var velocityTracker: VelocityTracker? = null

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouch(
      view: View,
      event: MotionEvent,
    ): Boolean {
      if (!isRevealed || isClosing) return false
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          startY = event.rawY
          velocityTracker = VelocityTracker.obtain().apply { addMovement(event) }
          sheet.animate().cancel()
        }
        MotionEvent.ACTION_MOVE -> {
          velocityTracker?.addMovement(event)
          sheet.translationY = max(0f, event.rawY - startY)
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> onDragEnd(event)
      }
      return true
    }

    private fun onDragEnd(event: MotionEvent) {
      val tracker = velocityTracker
      tracker?.addMovement(event)
      tracker?.computeCurrentVelocity(VELOCITY_UNITS_MILLIS)
      val velocity = (tracker?.yVelocity ?: 0f) / density
      tracker?.recycle()
      velocityTracker = null

      val distance = event.rawY - startY
      val isSwipe =
        event.actionMasked == MotionEvent.ACTION_UP &&
          (distance > dp(SWIPE_DISTANCE_DP) || velocity > SWIPE_VELOCITY_DP_PER_SECOND)
      if (isSwipe) {
        requestDismiss()
      } else {
        sheet.animate().translationY(0f).setDuration(ANIMATION_MILLIS).start()
      }
    }
  }

  private fun dp(value: Int): Int = (value * density).roundToInt()

  private companion object {
    const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
    const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT
    const val SCRIM_COLOR = 0x66000000
    const val CORNER_RADIUS_DP = 28
    const val TOP_GAP_DP = 24
    const val HANDLE_AREA_HEIGHT_DP = 28
    const val MIN_HEIGHT_DP = 120
    const val GRABBER_WIDTH_DP = 32
    const val GRABBER_HEIGHT_DP = 4
    const val GRABBER_ALPHA = 0x33
    const val LIGHT_BACKGROUND_LUMINANCE = 0.5
    const val SWIPE_DISTANCE_DP = 80
    const val SWIPE_VELOCITY_DP_PER_SECOND = 800f
    const val VELOCITY_UNITS_MILLIS = 1000
    const val ANIMATION_MILLIS = 200L
    const val REVEAL_ANIMATION_MILLIS = 300L
  }
}
