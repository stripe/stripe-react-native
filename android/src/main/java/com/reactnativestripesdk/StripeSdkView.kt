package com.reactnativestripesdk

import android.R
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.stripe.android.view.CardInputWidget

class StripeSdkView : SimpleViewManager<CardInputWidget>() {

  override fun getName() = "CardField"

  @ReactProp(name = "postalCodeEnabled")
  fun setPostalCodeEnabled(view: CardInputWidget, enabled: Boolean?) {
      if (enabled == null) return
      view.postalCodeEnabled = enabled
  }

  override fun createViewInstance(reactContext: ThemedReactContext): CardInputWidget {
    val inputWidget = CardInputWidget(reactContext)

    return inputWidget
  }
}
