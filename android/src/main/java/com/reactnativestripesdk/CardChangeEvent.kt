package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class CardChangeEvent(
  surfaceId: Int,
  viewTag: Int,
  private val cardDetails: MutableMap<String, Any?>,
  private val postalCodeEnabled: Boolean,
  private val complete: Boolean,
  private val dangerouslyGetFullCardDetails: Boolean,
) : Event<CardChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap? {
    val cardData = Arguments.createMap()
    cardData.putString("brand", cardDetails["brand"]?.toString())
    cardData.putString("last4", cardDetails["last4"]?.toString())

    (cardDetails["expiryMonth"] as Int?)?.let {
      cardData.putInt("expiryMonth", it)
    } ?: run {
      cardData.putNull("expiryMonth")
    }

    (cardDetails["expiryYear"] as Int?)?.let {
      cardData.putInt("expiryYear", it)
    } ?: run {
      cardData.putNull("expiryYear")
    }

    cardData.putBoolean("complete", complete)
    cardData.putString("validNumber", cardDetails["validNumber"]?.toString())
    cardData.putString("validCVC", cardDetails["validCVC"]?.toString())
    cardData.putString("validExpiryDate", cardDetails["validExpiryDate"]?.toString())

    if (postalCodeEnabled) {
      cardData.putString("postalCode", cardDetails["postalCode"]?.toString())
    }

    if (dangerouslyGetFullCardDetails) {
      cardData.putString("number", cardDetails["number"]?.toString()?.replace(" ", ""))
      cardData.putString("cvc", cardDetails["cvc"]?.toString())
    }

    return Arguments.createMap().apply {
      putMap("card", cardData)
    }
  }

  companion object {
    const val EVENT_NAME = "topCardChange"
  }
}
