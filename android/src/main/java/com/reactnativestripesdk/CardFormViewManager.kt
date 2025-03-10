package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.CardFormManagerDelegate
import com.facebook.react.viewmanagers.CardFormManagerInterface

@ReactModule(name = CardFormViewManager.REACT_CLASS)
class CardFormViewManager :
  SimpleViewManager<CardFormView>(),
  CardFormManagerInterface<CardFormView> {
  private val delegate = CardFormManagerDelegate(this)
  private var reactContextRef: ThemedReactContext? = null

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      CardFocusChangeEvent.EVENT_NAME to mutableMapOf("registrationName" to "onFocusChange"),
      CardFormCompleteEvent.EVENT_NAME to mutableMapOf("registrationName" to "onFormComplete"),
    )

  @ReactProp(name = "dangerouslyGetFullCardDetails")
  override fun setDangerouslyGetFullCardDetails(
    view: CardFormView,
    dangerouslyGetFullCardDetails: Boolean,
  ) {
    view.setDangerouslyGetFullCardDetails(dangerouslyGetFullCardDetails)
  }

  @ReactProp(name = "postalCodeEnabled")
  override fun setPostalCodeEnabled(
    view: CardFormView,
    postalCodeEnabled: Boolean,
  ) {
    view.setPostalCodeEnabled(postalCodeEnabled)
  }

  @ReactProp(name = "placeholders")
  override fun setPlaceholders(
    view: CardFormView,
    placeholders: ReadableMap?,
  ) {
    view.setPlaceHolders(placeholders)
  }

  @ReactProp(name = "autofocus")
  override fun setAutofocus(
    view: CardFormView,
    autofocus: Boolean,
  ) {
    view.setAutofocus(autofocus)
  }

  @ReactProp(name = "cardStyle")
  override fun setCardStyle(
    view: CardFormView,
    cardStyle: ReadableMap?,
  ) {
    view.setCardStyle(cardStyle)
  }

  @ReactProp(name = "defaultValues")
  override fun setDefaultValues(
    view: CardFormView,
    defaults: ReadableMap?,
  ) {
    view.setDefaultValues(defaults)
  }

  @ReactProp(name = "disabled")
  override fun setDisabled(
    view: CardFormView,
    isDisabled: Boolean,
  ) {
    view.setDisabled(isDisabled)
  }

  @ReactProp(name = "preferredNetworks")
  override fun setPreferredNetworks(
    view: CardFormView,
    preferredNetworks: ReadableArray?,
  ) {
    val networks = preferredNetworks?.toArrayList()?.filterIsInstance<Int>()?.let { ArrayList(it) }
    view.setPreferredNetworks(networks)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): CardFormView {
    val stripeSdkModule: StripeSdkModule? =
      reactContext.getNativeModule(StripeSdkModule::class.java)
    val view = CardFormView(reactContext)

    reactContextRef = reactContext

    stripeSdkModule?.cardFormView = view
    return view
  }

  override fun onDropViewInstance(view: CardFormView) {
    super.onDropViewInstance(view)

    val stripeSdkModule: StripeSdkModule? =
      reactContextRef?.getNativeModule(StripeSdkModule::class.java)
    stripeSdkModule?.cardFormView = null
    reactContextRef = null
  }

  // Native commands

  override fun blur(view: CardFormView) {
    view.requestBlurFromJS()
  }

  override fun focus(view: CardFormView) {
    view.requestFocusFromJS()
  }

  override fun clear(view: CardFormView) {
    view.requestClearFromJS()
  }

  companion object {
    const val REACT_CLASS = "CardForm"
  }
}
