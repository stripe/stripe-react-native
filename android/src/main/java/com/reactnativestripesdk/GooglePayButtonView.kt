package com.reactnativestripesdk

import android.view.LayoutInflater
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext

class GooglePayButtonView(private val context: ThemedReactContext) : FrameLayout(context) {
  private var buttonType: String? = null

  fun initialize() {
    val type =
      when (buttonType) {
        "pay" -> R.layout.pay_with_googlepay_button
        "standard" -> R.layout.googlepay_button
        else -> R.layout.googlepay_button
      }

    val button = LayoutInflater.from(context).inflate(
      type, null
    )

    addView(button)
  }

  fun setType(type: String) {
    buttonType = type
  }
}
