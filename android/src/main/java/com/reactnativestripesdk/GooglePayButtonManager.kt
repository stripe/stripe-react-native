package com.reactnativestripesdk

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.GooglePayButtonManagerDelegate
import com.facebook.react.viewmanagers.GooglePayButtonManagerInterface

@ReactModule(name = GooglePayButtonManager.REACT_CLASS)
class GooglePayButtonManager :
  SimpleViewManager<GooglePayButtonView>(),
  GooglePayButtonManagerInterface<GooglePayButtonView> {
  private val delegate = GooglePayButtonManagerDelegate(this)

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  override fun createViewInstance(reactContext: ThemedReactContext): GooglePayButtonView = GooglePayButtonView(reactContext)

  override fun onAfterUpdateTransaction(view: GooglePayButtonView) {
    super.onAfterUpdateTransaction(view)

    view.initialize()
  }

  @ReactProp(name = "type")
  override fun setType(
    view: GooglePayButtonView,
    buttonType: Int,
  ) {
    view.setType(buttonType)
  }

  @ReactProp(name = "appearance")
  override fun setAppearance(
    view: GooglePayButtonView,
    appearance: Int,
  ) {
    view.setAppearance(appearance)
  }

  @ReactProp(name = "borderRadius")
  override fun setBorderRadius(
    view: GooglePayButtonView,
    borderRadius: Int,
  ) {
    view.setBorderRadius(borderRadius)
  }

  companion object {
    const val REACT_CLASS = "GooglePayButton"
  }
}
