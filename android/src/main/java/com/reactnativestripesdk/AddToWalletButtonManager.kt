package com.reactnativestripesdk

import com.bumptech.glide.Glide
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.bridge.ReactApplicationContext


class AddToWalletButtonManager(applicationContext: ReactApplicationContext) : SimpleViewManager<AddToWalletButtonView?>() {
  private val requestManager = Glide.with(applicationContext)
  override fun getName() = "AddToWalletButton"

  override fun onDropViewInstance(view: AddToWalletButtonView) {
    view.onDropViewInstance()
    super.onDropViewInstance(view)
  }

  override fun onAfterUpdateTransaction(view: AddToWalletButtonView) {
    super.onAfterUpdateTransaction(view)
    view.onAfterUpdateTransaction()
  }

  override fun createViewInstance(reactContext: ThemedReactContext): AddToWalletButtonView {
    return AddToWalletButtonView(reactContext, requestManager)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      AddToWalletCompleteEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCompleteAction")
    )
  }

  @ReactProp(name = "androidAssetSource")
  @SuppressWarnings("unused")
  fun source(view: AddToWalletButtonView, source: ReadableMap) {
    view.setSourceMap(source)
  }

  @ReactProp(name = "cardDescription")
  @SuppressWarnings("unused")
  fun cardDescription(view: AddToWalletButtonView, cardDescription: String) {
    view.setCardDescription(cardDescription)
  }

  @ReactProp(name = "cardLastFour")
  @SuppressWarnings("unused")
  fun cardLastFour(view: AddToWalletButtonView, last4: String) {
    view.setCardLastFour(last4)
  }

  @ReactProp(name = "ephemeralKey")
  @SuppressWarnings("unused")
  fun ephemeralKey(view: AddToWalletButtonView, ephemeralKey: ReadableMap) {
    view.setEphemeralKey(ephemeralKey)
  }

  @ReactProp(name = "token")
  @SuppressWarnings("unused")
  fun token(view: AddToWalletButtonView, token: ReadableMap?) {
    view.setToken(token)
  }
}
