package com.reactnativestripesdk

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class GooglePayButtonManager : SimpleViewManager<GooglePayButtonView>() {
  override fun getName(): String {
    return REACT_CLASS
  }

  override fun onAfterUpdateTransaction(view: GooglePayButtonView) {
    super.onAfterUpdateTransaction(view)

    view.initialize()
  }

  @ReactProp(name = "type")
  fun type(view: GooglePayButtonView, buttonType: Int) {
    view.setType(buttonType)
  }

  @ReactProp(name = "appearance")
  fun appearance(view: GooglePayButtonView, appearance: Int) {
    view.setAppearance(appearance)
  }

  @ReactProp(name = "borderRadius")
  fun borderRadius(view: GooglePayButtonView, borderRadius: Int) {
    view.setBorderRadius(borderRadius)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): GooglePayButtonView {
    return GooglePayButtonView(reactContext)
  }

  companion object {
    const val REACT_CLASS = "GooglePayButton"
  }
}
