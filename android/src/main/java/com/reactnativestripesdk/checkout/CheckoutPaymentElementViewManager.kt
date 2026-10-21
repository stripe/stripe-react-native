package com.reactnativestripesdk.checkout

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.CheckoutPaymentElementViewManagerDelegate
import com.facebook.react.viewmanagers.CheckoutPaymentElementViewManagerInterface

@ReactModule(name = CheckoutPaymentElementViewManager.NAME)
class CheckoutPaymentElementViewManager :
    ViewGroupManager<CheckoutPaymentElementView>(),
  CheckoutPaymentElementViewManagerInterface<CheckoutPaymentElementView> {
  companion object {
    const val NAME = "CheckoutPaymentElementView"
  }

  private val delegate = CheckoutPaymentElementViewManagerDelegate(this)
  override fun getName() = NAME
  override fun getDelegate() = delegate
  override fun createViewInstance(context: ThemedReactContext) = CheckoutPaymentElementView(context)
  override fun needsCustomLayoutForChildren() = true
  override fun getExportedCustomDirectEventTypeConstants() = mutableMapOf(
    "topHeightChanged" to mutableMapOf("registrationName" to "onHeightChanged"),
  )

  @ReactProp(name = "controllerId")
  override fun setControllerId(view: CheckoutPaymentElementView, value: String?) {
    view.setControllerId(value)
  }

  override fun onDropViewInstance(view: CheckoutPaymentElementView) {
    view.detach()
    view.handleOnDropViewInstance()
    super.onDropViewInstance(view)
  }
}
