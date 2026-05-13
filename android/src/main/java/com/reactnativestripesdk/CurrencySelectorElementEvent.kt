package com.reactnativestripesdk

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class CurrencySelectorElementEvent(
  surfaceId: Int,
  viewTag: Int,
  private val eventType: EventType,
  private val eventMap: WritableMap?,
) : Event<CurrencySelectorElementEvent>(surfaceId, viewTag) {
  enum class EventType {
    OnHeightChange,
  }

  override fun getEventData() = eventMap

  companion object {
    const val ON_HEIGHT_CHANGE = "topHeightChange"
  }

  override fun getEventName(): String =
    when (eventType) {
      EventType.OnHeightChange -> ON_HEIGHT_CHANGE
    }
}
