package com.reactnativestripesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp


class StripeSdkCardViewManager : SimpleViewManager<StripeSdkCardView>() {
  override fun getName() = "CardField"

  lateinit var cardViewInstance: StripeSdkCardView

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      CardFocusEvent.EVENT_NAME, MapBuilder.of("registrationName", "onFocusChange"),
      CardChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardChange"))
  }

  @ReactProp(name = "postalCodeEnabled")
  fun setPostalCodeEnabled(view: StripeSdkCardView, postalCodeEnabled: Boolean = true) {
    view.setPostalCodeEnabled(postalCodeEnabled);
  }

  @ReactProp(name = "cardStyle")
  fun setCardStyle(view: StripeSdkCardView, cardStyle: ReadableMap) {
    view.setCardStyle(cardStyle);
  }

  @ReactProp(name = "placeholder")
  fun setPlaceHolders(view: StripeSdkCardView, placeholder: ReadableMap) {
    view.setPlaceHolders(placeholder);
  }

  override fun createViewInstance(reactContext: ThemedReactContext): StripeSdkCardView {
    cardViewInstance = StripeSdkCardView(reactContext)
    return cardViewInstance
  }

  @JvmName("getCardViewInstance1")
  fun getCardViewInstance(): StripeSdkCardView? {
    if (this::cardViewInstance.isInitialized) {
      return cardViewInstance
    }
    return null
  }
}
