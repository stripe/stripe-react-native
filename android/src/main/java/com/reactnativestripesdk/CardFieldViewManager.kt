package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.CardFieldManagerDelegate
import com.facebook.react.viewmanagers.CardFieldManagerInterface

@ReactModule(name = CardFieldViewManager.REACT_CLASS)
class CardFieldViewManager :
  SimpleViewManager<CardFieldView>(),
  CardFieldManagerInterface<CardFieldView> {
  private val delegate = CardFieldManagerDelegate(this)
  private var reactContextRef: ThemedReactContext? = null

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      CardFocusChangeEvent.EVENT_NAME to mutableMapOf("registrationName" to "onFocusChange"),
      CardChangeEvent.EVENT_NAME to mutableMapOf("registrationName" to "onCardChange"),
    )

  override fun createViewInstance(reactContext: ThemedReactContext): CardFieldView {
    val stripeSdkModule: StripeSdkModule? =
      reactContext.getNativeModule(StripeSdkModule::class.java)
    val view = CardFieldView(reactContext)

    reactContextRef = reactContext

    stripeSdkModule?.cardFieldView = view
    return view
  }

  override fun onDropViewInstance(view: CardFieldView) {
    super.onDropViewInstance(view)

    val stripeSdkModule: StripeSdkModule? =
      reactContextRef?.getNativeModule(StripeSdkModule::class.java)
    stripeSdkModule?.cardFieldView = null
    reactContextRef = null
  }

  @ReactProp(name = "dangerouslyGetFullCardDetails")
  override fun setDangerouslyGetFullCardDetails(
    view: CardFieldView,
    dangerouslyGetFullCardDetails: Boolean,
  ) {
    view.setDangerouslyGetFullCardDetails(dangerouslyGetFullCardDetails)
  }

  @ReactProp(name = "postalCodeEnabled")
  override fun setPostalCodeEnabled(
    view: CardFieldView,
    postalCodeEnabled: Boolean,
  ) {
    view.setPostalCodeEnabled(postalCodeEnabled)
  }

  @ReactProp(name = "autofocus")
  override fun setAutofocus(
    view: CardFieldView,
    autofocus: Boolean,
  ) {
    view.setAutofocus(autofocus)
  }

  @ReactProp(name = "cardStyle")
  override fun setCardStyle(
    view: CardFieldView,
    cardStyle: ReadableMap?,
  ) {
    view.setCardStyle(cardStyle)
  }

  @ReactProp(name = "countryCode")
  override fun setCountryCode(
    view: CardFieldView,
    countryCode: String?,
  ) {
    view.setCountryCode(countryCode)
  }

  @ReactProp(name = "onBehalfOf")
  override fun setOnBehalfOf(
    view: CardFieldView,
    onBehalfOf: String?,
  ) {
    view.setOnBehalfOf(onBehalfOf)
  }

  @ReactProp(name = "placeholders")
  override fun setPlaceholders(
    view: CardFieldView,
    placeholders: ReadableMap?,
  ) {
    view.setPlaceHolders(placeholders)
  }

  @ReactProp(name = "disabled")
  override fun setDisabled(
    view: CardFieldView,
    isDisabled: Boolean,
  ) {
    view.setDisabled(isDisabled)
  }

  @ReactProp(name = "preferredNetworks")
  override fun setPreferredNetworks(
    view: CardFieldView,
    preferredNetworks: ReadableArray?,
  ) {
    val networks = preferredNetworks?.toArrayList()?.filterIsInstance<Int>()?.let { ArrayList(it) }
    view.setPreferredNetworks(networks)
  }

  // Native commands

  override fun blur(view: CardFieldView) {
    view.requestBlurFromJS()
  }

  override fun focus(view: CardFieldView) {
    view.requestFocusFromJS()
  }

  override fun clear(view: CardFieldView) {
    view.requestClearFromJS()
  }

  companion object {
    const val REACT_CLASS = "CardField"
  }
}
