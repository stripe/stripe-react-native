package com.reactnativestripesdk

import android.content.res.Configuration
import android.view.LayoutInflater
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext

class GooglePayButtonView(private val context: ThemedReactContext) : FrameLayout(context) {
  private var buttonType: String? = null

  fun initialize() {
    val type =
      when (buttonType) {
        "pay" -> R.layout.pay_with_googlepay_button_no_shadow
        "pay_dark" -> R.layout.pay_with_googlepay_button_dark
        "pay_shadow" -> R.layout.pay_with_googlepay_button
        "standard" -> R.layout.googlepay_button_no_shadow
        "standard_dark" -> R.layout.googlepay_button_dark
        "standard_shadow" -> R.layout.googlepay_button
        else -> if (isNightMode()) R.layout.googlepay_button_dark else R.layout.googlepay_button
      }

    val button = LayoutInflater.from(context).inflate(
      type, null
    )

    addView(button)
  }

  fun setType(type: String) {
    buttonType = type
  }

  private fun isNightMode(): Boolean {
    val nightModeFlags: Int = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    return nightModeFlags == Configuration.UI_MODE_NIGHT_YES
  }
}
