package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class CardFormCompleteEvent(
  surfaceId: Int,
  viewTag: Int,
  private val cardDetails: MutableMap<String, Any>?,
  private val complete: Boolean,
  private val dangerouslyGetFullCardDetails: Boolean,
) : Event<CardChangeEvent>(surfaceId, viewTag) {
  override fun getEventName() = EVENT_NAME

  override fun getEventData(): WritableMap? {
    val cardData = Arguments.createMap()

    if (cardDetails != null) {
      cardData.putString("brand", cardDetails["brand"]?.toString())
      cardData.putString("last4", cardDetails["last4"]?.toString())
      cardData.putString("country", cardDetails["country"]?.toString())
      cardData.putInt("expiryMonth", cardDetails["expiryMonth"] as Int)
      cardData.putInt("expiryYear", cardDetails["expiryYear"] as Int)
      cardData.putBoolean("complete", complete)
      cardData.putString("postalCode", cardDetails["postalCode"]?.toString())

      if (dangerouslyGetFullCardDetails) {
        cardData.putString("number", cardDetails["number"]?.toString()?.replace(" ", ""))
        cardData.putString("cvc", cardDetails["cvc"]?.toString())
      }
    }

    return Arguments.createMap().apply {
      putMap("card", cardData)
    }
  }

  companion object {
    const val EVENT_NAME = "topFormComplete"
  }
}
