package com.reactnativestripesdk

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTEventEmitter

internal class AddressSheetEvent constructor(viewTag: Int, private val eventType: EventType, private val eventMap: WritableMap?) : Event<AddressSheetEvent>(viewTag) {
  enum class EventType {
    OnSubmit,
    OnCancel
  }

  override fun dispatch(rctEventEmitter: RCTEventEmitter) {
    rctEventEmitter.receiveEvent(viewTag, eventName, eventMap)
  }

  companion object {
    const val ON_SUBMIT = "onSubmitAction"
    const val ON_CANCEL = "onCancelAction"
  }

  override fun getEventName(): String {
    return when (eventType) {
      EventType.OnSubmit -> ON_SUBMIT
      EventType.OnCancel -> ON_CANCEL
    }
  }
}
