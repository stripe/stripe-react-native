package com.stripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableNativeMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.stripesdk.events.CardChangedEvent
import com.stripesdk.events.CardFocusEvent

@ReactModule(name = CardFieldViewManager.NAME)
class CardFieldViewManager : CardFieldViewManagerSpec<CardFieldView>() {

  override fun createViewInstance(context: ThemedReactContext): CardFieldView {
    return CardFieldView(context)
  }

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

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Map<String, String>> {
    return MapBuilder.of(
      CardFocusEvent.EVENT_NAME, MapBuilder.of("registrationName", "onFocusChange"),
      CardChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardChange"))
  }

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "CardField"
  }
}
