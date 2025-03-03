package com.reactnativestripesdk

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = StripeContainerManager.REACT_CLASS)
class StripeContainerManager : ViewGroupManager<StripeContainerView>() {
  override fun getName() = REACT_CLASS

  @ReactProp(name = "keyboardShouldPersistTaps")
  fun setKeyboardShouldPersistTaps(
    view: StripeContainerView,
    keyboardShouldPersistTaps: Boolean,
  ) {
    view.setKeyboardShouldPersistTaps(keyboardShouldPersistTaps)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): StripeContainerView = StripeContainerView(reactContext)

  companion object {
    const val REACT_CLASS = "StripeContainer"
  }
}
