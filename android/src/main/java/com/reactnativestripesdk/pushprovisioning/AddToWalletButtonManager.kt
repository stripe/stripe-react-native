package com.reactnativestripesdk.pushprovisioning

import android.content.Context
import com.bumptech.glide.Glide
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = AddToWalletButtonManager.REACT_CLASS)
class AddToWalletButtonManager(
  applicationContext: Context,
) : SimpleViewManager<AddToWalletButtonView>() {
  private val requestManager = Glide.with(applicationContext)

  override fun getName() = REACT_CLASS

  override fun onDropViewInstance(view: AddToWalletButtonView) {
    view.onDropViewInstance()
    super.onDropViewInstance(view)
  }

  override fun onAfterUpdateTransaction(view: AddToWalletButtonView) {
    super.onAfterUpdateTransaction(view)
    view.onAfterUpdateTransaction()
  }

  override fun createViewInstance(reactContext: ThemedReactContext): AddToWalletButtonView =
    AddToWalletButtonView(reactContext, requestManager)

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      AddToWalletCompleteEvent.EVENT_NAME to
        mutableMapOf("registrationName" to "onCompleteAction"),
    )

  @ReactProp(name = "androidAssetSource")
  fun source(
    view: AddToWalletButtonView,
    source: ReadableMap,
  ) {
    view.setSourceMap(source)
  }

  @ReactProp(name = "cardDetails")
  fun cardDetails(
    view: AddToWalletButtonView,
    cardDetails: ReadableMap,
  ) {
    view.setCardDetails(cardDetails)
  }

  @ReactProp(name = "ephemeralKey")
  fun ephemeralKey(
    view: AddToWalletButtonView,
    ephemeralKey: ReadableMap,
  ) {
    view.setEphemeralKey(ephemeralKey)
  }

  @ReactProp(name = "token")
  fun token(
    view: AddToWalletButtonView,
    token: ReadableMap?,
  ) {
    view.setToken(token)
  }

  companion object {
    const val REACT_CLASS = "AddToWalletButton"
  }
}
