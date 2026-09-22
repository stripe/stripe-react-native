package com.reactnativestripesdk.checkout

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.CheckoutCurrencySelectorElementViewManagerDelegate
import com.facebook.react.viewmanagers.CheckoutCurrencySelectorElementViewManagerInterface

@ReactModule(name = CheckoutCurrencySelectorElementViewManager.NAME)
class CheckoutCurrencySelectorElementViewManager :
  ViewGroupManager<CheckoutCurrencySelectorElementView>(),
  CheckoutCurrencySelectorElementViewManagerInterface<CheckoutCurrencySelectorElementView> {
  companion object {
    const val NAME = "CheckoutCurrencySelectorElementView"
  }

  private val delegate = CheckoutCurrencySelectorElementViewManagerDelegate(this)
  override fun getName() = NAME
  override fun getDelegate() = delegate
  override fun createViewInstance(context: ThemedReactContext) = CheckoutCurrencySelectorElementView(context)
  override fun needsCustomLayoutForChildren() = true
  override fun getExportedCustomDirectEventTypeConstants() = mutableMapOf(
    "topHeightChanged" to mutableMapOf("registrationName" to "onHeightChanged"),
  )

  @ReactProp(name = "controllerId")
  override fun setControllerId(view: CheckoutCurrencySelectorElementView, value: String?) {
    view.setControllerId(value)
  }

  override fun onDropViewInstance(view: CheckoutCurrencySelectorElementView) {
    view.detach()
    view.handleOnDropViewInstance()
    super.onDropViewInstance(view)
  }
}
