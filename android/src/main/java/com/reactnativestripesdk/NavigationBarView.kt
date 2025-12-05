package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.widget.Toolbar
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
        setBackgroundColor(Color.WHITE)
        elevation = 4f
      }

    // Create title TextView
    titleTextView =
      TextView(context).apply {
        textSize = 17f
        setTextColor(Color.BLACK)
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
    val closeButton =
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
          marginEnd = 16
        }
    toolbar.addView(closeButton, buttonParams)

    // Add toolbar to this view
    addView(toolbar)
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
    val desiredHeight = (56 * resources.displayMetrics.density).toInt()
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
}
