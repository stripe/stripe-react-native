package com.reactnativestripesdk

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.StripeContainerManagerDelegate
import com.facebook.react.viewmanagers.StripeContainerManagerInterface

@ReactModule(name = StripeContainerManager.REACT_CLASS)
class StripeContainerManager :
  ViewGroupManager<StripeContainerView>(),
  StripeContainerManagerInterface<StripeContainerView> {
  private val delegate = StripeContainerManagerDelegate(this)

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  @ReactProp(name = "keyboardShouldPersistTaps")
  override fun setKeyboardShouldPersistTaps(
    view: StripeContainerView,
    keyboardShouldPersistTaps: Boolean,
  ) {
    view.setKeyboardShouldPersistTaps(keyboardShouldPersistTaps)
  }

  override fun createViewInstance(reactContext: ThemedReactContext) = StripeContainerView(reactContext)

  companion object {
    const val REACT_CLASS = "StripeContainer"
  }
}
