package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.os.Build
import android.view.Gravity
import android.view.View.MeasureSpec
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.widget.Toolbar
import androidx.core.graphics.ColorUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event

@SuppressLint("ViewConstructor")
class NavigationBarView(
  context: ThemedReactContext,
) : FrameLayout(context) {
  private val toolbar: Toolbar
  private val titleTextView: TextView
  private val closeButton: ImageButton
  private var titleText: String? = null

  init {
    // Create Toolbar
    toolbar =
      Toolbar(context).apply {
        layoutParams =
          LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.WRAP_CONTENT,
          )
        setBackgroundColor(DEFAULT_BACKGROUND_COLOR)
        elevation = TOOLBAR_ELEVATION
      }

    // Create title TextView
    titleTextView =
      TextView(context).apply {
        textSize = TITLE_TEXT_SIZE
        setTextColor(DEFAULT_CONTENT_COLOR)
        gravity = Gravity.CENTER
      }

    // Add title to toolbar
    val titleParams =
      Toolbar
        .LayoutParams(
          Toolbar.LayoutParams.WRAP_CONTENT,
          Toolbar.LayoutParams.WRAP_CONTENT,
        ).apply {
          gravity = Gravity.CENTER
        }
    toolbar.addView(titleTextView, titleParams)

    // Create close button
    closeButton =
      ImageButton(context).apply {
        setImageDrawable(
          context.resources.getDrawable(
            android.R.drawable.ic_menu_close_clear_cancel,
            null,
          ),
        )
        setBackgroundColor(Color.TRANSPARENT)
        setOnClickListener {
          dispatchCloseButtonPress()
        }
      }

    // Add close button to toolbar
    val buttonParams =
      Toolbar
        .LayoutParams(
          Toolbar.LayoutParams.WRAP_CONTENT,
          Toolbar.LayoutParams.WRAP_CONTENT,
        ).apply {
          gravity = Gravity.END or Gravity.CENTER_VERTICAL
          marginEnd = CLOSE_BUTTON_MARGIN_END
        }
    toolbar.addView(closeButton, buttonParams)

    // Add toolbar to this view
    addView(toolbar)

    applyContentColor(DEFAULT_CONTENT_COLOR)
  }

  /**
   * Called with the `backgroundColor` of the view's style. The toolbar draws its own background,
   * so it has to follow this color or it would cover it. The title and close icon switch between
   * black and white to stay readable. A transparent color (the default when the style is unset)
   * restores the white bar with black content.
   */
  fun setBarBackgroundColor(color: Int) {
    if (Color.alpha(color) == 0) {
      toolbar.setBackgroundColor(DEFAULT_BACKGROUND_COLOR)
      applyContentColor(DEFAULT_CONTENT_COLOR)
    } else {
      toolbar.setBackgroundColor(color)
      applyContentColor(contentColorFor(color))
    }
  }

  private fun applyContentColor(color: Int) {
    titleTextView.setTextColor(color)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      closeButton.drawable?.setColorFilter(
        android.graphics.BlendModeColorFilter(color, android.graphics.BlendMode.SRC_IN),
      )
    } else {
      @Suppress("DEPRECATION")
      closeButton.drawable?.setColorFilter(PorterDuffColorFilter(color, PorterDuff.Mode.SRC_IN))
    }
  }

  fun setTitle(title: String?) {
    titleText = title
    titleTextView.text = title
  }

  private fun dispatchCloseButtonPress() {
    val reactContext = context as ThemedReactContext
    val event =
      CloseButtonPressEvent(
        UIManagerHelper.getSurfaceId(reactContext),
        id,
      )
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(event)
  }

  override fun onMeasure(
    widthMeasureSpec: Int,
    heightMeasureSpec: Int,
  ) {
    super.onMeasure(widthMeasureSpec, heightMeasureSpec)
    // Set a fixed height for the navigation bar
    val desiredHeight = (NAV_BAR_HEIGHT_DP * resources.displayMetrics.density).toInt()
    val newHeightMeasureSpec = MeasureSpec.makeMeasureSpec(desiredHeight, MeasureSpec.EXACTLY)
    super.onMeasure(widthMeasureSpec, newHeightMeasureSpec)
  }

  private class CloseButtonPressEvent(
    surfaceId: Int,
    viewId: Int,
  ) : Event<CloseButtonPressEvent>(surfaceId, viewId) {
    override fun getEventName() = "onCloseButtonPress"

    override fun getEventData() = Arguments.createMap()
  }

  internal companion object {
    private const val DEFAULT_BACKGROUND_COLOR = Color.WHITE
    private const val DEFAULT_CONTENT_COLOR = Color.BLACK
    private const val TOOLBAR_ELEVATION = 4f
    private const val TITLE_TEXT_SIZE = 17f
    private const val CLOSE_BUTTON_MARGIN_END = 16
    private const val NAV_BAR_HEIGHT_DP = 56

    // Relative luminance at which black and white text have the same contrast ratio (WCAG).
    private const val LUMINANCE_CROSSOVER = 0.179

    /** Black or white, whichever is more readable on [background]. */
    fun contentColorFor(background: Int): Int =
      if (ColorUtils.calculateLuminance(background) > LUMINANCE_CROSSOVER) Color.BLACK else Color.WHITE
  }
}
