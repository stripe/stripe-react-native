package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = CardFieldViewManager.NAME)
class CardFieldViewManager : CardFieldViewManagerSpec<CardFieldView>() {

  private var reactContextRef: ThemedReactContext? = null

  @ReactProp(name = "value")
  override fun setValue(view: CardFieldView, value: ReadableMap?) {
    // TODO PROBABLY NOT USED. PLEASE REMOVE THIS PROP ONCE IT IS CONFIRMED
  }

  @ReactProp(name = "postalCodeEnabled")
  override fun setPostalCodeEnabled(view: CardFieldView, value: Boolean) {
    view.setPostalCodeEnabled(value)
  }

  @ReactProp(name = "autofocus")
  override fun setAutofocus(view: CardFieldView, value: Boolean) {
    view.setAutofocus(value)
  }

  @ReactProp(name = "countryCode")
  override fun setCountryCode(view: CardFieldView, value: String?) {
    view.setCountryCode(value)
  }

  @ReactProp(name = "cardStyle")
  override fun setCardStyle(view: CardFieldView, value: ReadableMap?) {
    val cardStyle = value ?: Arguments.createMap()
    view.setCardStyle(cardStyle)
  }

  @ReactProp(name = "placeholders")
  override fun setPlaceholders(view: CardFieldView, value: ReadableMap?) {
    val placeholder = value ?: Arguments.createMap()
    view.setPlaceHolders(placeholder)
  }

  override fun focus(view: CardFieldView) {
    view.requestFocusFromJS()
  }

  override fun blur(view: CardFieldView) {
    view.requestBlurFromJS()
  }

  override fun clear(view: CardFieldView) {
    view.requestClearFromJS()
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Map<String, String>> {
    return MapBuilder.of(
      CardFocusEvent.EVENT_NAME, MapBuilder.of("registrationName", "onFocusChange"),
      CardChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardChange"))
  }

  override fun createViewInstance(context: ThemedReactContext): CardFieldView {
    val stripeSdkModule: StripeSdkModule? = context.getNativeModule(StripeSdkModule::class.java)
    val view = CardFieldView(context)

    reactContextRef = context

    stripeSdkModule?.cardFieldView = view
    return view
  }

    override fun onDropViewInstance(view: CardFieldView) {
    super.onDropViewInstance(view)

    val stripeSdkModule: StripeSdkModule? = reactContextRef?.getNativeModule(StripeSdkModule::class.java)
    stripeSdkModule?.cardFieldView = null
    reactContextRef = null
  }

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "CardField"
  }

}
