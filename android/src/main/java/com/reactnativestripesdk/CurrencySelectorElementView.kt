package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext

/**
 * Minimal stub so the JS-side `CurrencySelectorElement` codegen mapping
 * resolves at app launch. The full Compose-based implementation that hosts
 * `Checkout.CurrencySelectorContent()` lives on the feature branch and will
 * replace this once that lands.
 */
@SuppressLint("ViewConstructor")
class CurrencySelectorElementView(
  context: ThemedReactContext,
) : FrameLayout(context) {
  @Suppress("UnusedParameter")
  fun setSessionKey(value: String?) {
    // no-op stub
  }

  @Suppress("UnusedParameter")
  fun setDisabled(value: Boolean) {
    // no-op stub
  }
}
