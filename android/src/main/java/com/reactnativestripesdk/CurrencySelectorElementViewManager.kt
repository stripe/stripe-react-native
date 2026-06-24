package com.reactnativestripesdk

import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.StripeCurrencySelectorElementManagerDelegate
import com.facebook.react.viewmanagers.StripeCurrencySelectorElementManagerInterface
import com.stripe.android.paymentelement.CheckoutSessionPreview

@OptIn(CheckoutSessionPreview::class)
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

  override fun onDropViewInstance(view: CurrencySelectorElementView) {
    super.onDropViewInstance(view)
    view.handleOnDropViewInstance()
  }

  override fun needsCustomLayoutForChildren(): Boolean = true

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    mutableMapOf(
      CurrencySelectorElementEvent.ON_HEIGHT_CHANGE to
        mutableMapOf("registrationName" to "onHeightChange"),
    )

  @ReactProp(name = "sessionKey")
  override fun setSessionKey(
    view: CurrencySelectorElementView,
    value: String?,
  ) {
    // Codegen marks `sessionKey` as required, but it can briefly arrive as
    // null when the view is recycled. Treat empty/null the same.
    view.setSessionKey(value)
  }

  @ReactProp(name = "disabled")
  override fun setDisabled(
    view: CurrencySelectorElementView,
    value: Boolean,
  ) {
    view.setDisabled(value)
  }

  @ReactProp(name = "appearance")
  override fun setAppearance(
    view: CurrencySelectorElementView,
    value: Dynamic?,
  ) {
    val appearanceParams = if (value?.type == ReadableType.Map) value.asMap() else null
    view.setAppearance(buildCurrencySelectorAppearance(appearanceParams, view.context))
  }
}
