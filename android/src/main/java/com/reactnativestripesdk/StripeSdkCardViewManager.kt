package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp


class StripeSdkCardViewManager : SimpleViewManager<StripeSdkCardView>() {
  override fun getName() = "CardField"

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      CardFocusEvent.EVENT_NAME, MapBuilder.of("registrationName", "onFocus"),
      CardChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardChange"))
  }

  @ReactProp(name = "value")
  fun setValue(view: StripeSdkCardView, value: ReadableMap) {
    if (value == null) return
    view.setValue(value);
  }

  override fun createViewInstance(reactContext: ThemedReactContext): StripeSdkCardView {
    return StripeSdkCardView(reactContext)
  }
}
