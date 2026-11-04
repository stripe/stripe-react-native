package com.reactnativestripesdk.checkout

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.CheckoutExpressCheckoutElementViewManagerDelegate
import com.facebook.react.viewmanagers.CheckoutExpressCheckoutElementViewManagerInterface

@ReactModule(name = CheckoutExpressCheckoutElementViewManager.NAME)
class CheckoutExpressCheckoutElementViewManager :
  ViewGroupManager<CheckoutExpressCheckoutElementView>(),
  CheckoutExpressCheckoutElementViewManagerInterface<CheckoutExpressCheckoutElementView> {
  companion object {
    const val NAME = "CheckoutExpressCheckoutElementView"
  }

  private val delegate = CheckoutExpressCheckoutElementViewManagerDelegate(this)
  override fun getName() = NAME
  override fun getDelegate() = delegate
  override fun createViewInstance(context: ThemedReactContext) = CheckoutExpressCheckoutElementView(context)
  override fun needsCustomLayoutForChildren() = true
  override fun getExportedCustomDirectEventTypeConstants() = mutableMapOf(
    "topHeightChanged" to mutableMapOf("registrationName" to "onHeightChanged"),
  )

  @ReactProp(name = "controllerId")
  override fun setControllerId(view: CheckoutExpressCheckoutElementView, value: String?) {
    view.setControllerId(value)
  }

  override fun onDropViewInstance(view: CheckoutExpressCheckoutElementView) {
    view.detach()
    view.handleOnDropViewInstance()
    super.onDropViewInstance(view)
  }
}
