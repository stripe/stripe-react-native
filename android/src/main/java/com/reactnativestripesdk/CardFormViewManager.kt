package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

const val CARD_FORM_INSTANCE_NAME = "CardFormInstance"

class CardFormViewManager : SimpleViewManager<CardFormView>() {
  override fun getName() = "CardForm"

  private var cardViewInstanceMap: MutableMap<String, Any?> = mutableMapOf()

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      CardFormCompleteEvent.EVENT_NAME, MapBuilder.of("registrationName", "onCardComplete"))
  }

  override fun receiveCommand(root: CardFormView, commandId: String?, args: ReadableArray?) {
    when (commandId) {
      "focus" -> root.requestFocusFromJS()
      "blur" -> root.requestBlurFromJS()
    }
  }

  @ReactProp(name = "dangerouslyGetFullCardDetails")
  fun setDangerouslyGetFullCardDetails(view: CardFormView, dangerouslyGetFullCardDetails: Boolean = false) {
    view.setDangerouslyGetFullCardDetails(dangerouslyGetFullCardDetails);
  }

  @ReactProp(name = "autofocus")
  fun setAutofocus(view: CardFormView, autofocus: Boolean = false) {
    view.setAutofocus(autofocus);
  }

  @ReactProp(name = "cardStyle")
  fun setCardStyle(view: CardFormView, cardStyle: ReadableMap) {
    view.setCardStyle(cardStyle);
  }

  override fun createViewInstance(reactContext: ThemedReactContext): CardFormView {
    // as it's reasonable we handle only one CardField component on the same screen
    // TODO: temporary commented out due to android state persistence and improper behavior after app reload
//    if (cardViewInstanceMap[CARD_FORM_INSTANCE_NAME] != null) {
//      val exceptionManager = reactContext.getNativeModule(ExceptionsManagerModule::class.java)
//      val error: WritableMap = WritableNativeMap()
//      error.putString("message", "Only one CardField component on the same screen allowed")
//      exceptionManager?.reportException(error)
//    }

    cardViewInstanceMap[CARD_FORM_INSTANCE_NAME] = CardFormView(reactContext)
    return cardViewInstanceMap[CARD_FORM_INSTANCE_NAME] as CardFormView
  }

  override fun onDropViewInstance(view: CardFormView) {
    super.onDropViewInstance(view)

    this.cardViewInstanceMap[CARD_FORM_INSTANCE_NAME] = null
  }

  fun getCardViewInstance(): CardFormView? {
    if (cardViewInstanceMap[CARD_FORM_INSTANCE_NAME] != null) {
      return cardViewInstanceMap[CARD_FORM_INSTANCE_NAME] as CardFormView
    }
    return null
  }
}
