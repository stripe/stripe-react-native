package com.reactnativestripesdk

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.StripeCurrencySelectorElementManagerDelegate
import com.facebook.react.viewmanagers.StripeCurrencySelectorElementManagerInterface

@ReactModule(name = CurrencySelectorElementViewManager.NAME)
class CurrencySelectorElementViewManager :
  ViewGroupManager<CurrencySelectorElementView>(),
  StripeCurrencySelectorElementManagerInterface<CurrencySelectorElementView> {
  companion object {
    const val NAME = "StripeCurrencySelectorElement"
  }

  private val delegate = StripeCurrencySelectorElementManagerDelegate(this)

  override fun getName() = NAME

  override fun getDelegate() = delegate

  override fun createViewInstance(ctx: ThemedReactContext): CurrencySelectorElementView =
    CurrencySelectorElementView(ctx)

  @ReactProp(name = "sessionKey")
  override fun setSessionKey(
    view: CurrencySelectorElementView,
    value: String?,
  ) {
    view.setSessionKey(value)
  }

  @ReactProp(name = "disabled")
  override fun setDisabled(
    view: CurrencySelectorElementView,
    value: Boolean,
  ) {
    view.setDisabled(value)
  }
}
