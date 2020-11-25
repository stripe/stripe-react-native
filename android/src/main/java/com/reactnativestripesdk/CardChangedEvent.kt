/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
package com.reactnativestripesdk
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTEventEmitter

internal class CardChangedEvent constructor(viewTag: Int, private val cardDetails: MutableMap<String, Any>) : Event<CardChangedEvent>(viewTag) {
  override fun getEventName(): String {
    return EVENT_NAME
  }

  override fun dispatch(rctEventEmitter: RCTEventEmitter) {
    rctEventEmitter.receiveEvent(viewTag, eventName, serializeEventData())
  }

  private fun serializeEventData(): WritableMap {
    val eventData = Arguments.createMap()
    eventData.putString("number", cardDetails["cardNumber"].toString())
    eventData.putString("cvc", cardDetails["cvc"].toString())
    cardDetails["expiryMonth"]?.toString()?.toInt()?.let { eventData.putInt("expiryMonth", it) }
    cardDetails["expiryYear"]?.toString()?.toInt()?.let { eventData.putInt("expiryYear", it) }

    return eventData
  }

  companion object {
    const val EVENT_NAME = "onCardChange"
  }

}
