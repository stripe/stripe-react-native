package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.model.*

internal fun mapIntentStatus(status: StripeIntent.Status?): String {
  return when (status) {
    StripeIntent.Status.Succeeded -> "Succeeded"
    StripeIntent.Status.RequiresPaymentMethod -> "RequiresPaymentMethod"
    StripeIntent.Status.RequiresConfirmation -> "RequiresConfirmation"
    StripeIntent.Status.Canceled -> "Canceled"
    StripeIntent.Status.Processing -> "Processing"
    StripeIntent.Status.RequiresAction -> "RequiresAction"
    StripeIntent.Status.RequiresCapture -> "RequiresCapture"
    else -> "Unknown"
  }
}

internal fun mapFromPaymentIntentResult(paymentIntent: PaymentIntent): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("id", paymentIntent.id)
  map.putString("currency", paymentIntent.currency)
  map.putString("status", mapIntentStatus(paymentIntent.status))
  map.putString("description", paymentIntent.description)
  map.putString("receiptEmail", paymentIntent.receiptEmail)
  if(paymentIntent.amount != null) {
    map.putDouble("amount", paymentIntent.amount!!.toDouble())
  }
  if(paymentIntent.created != null) {
    map.putInt("created", paymentIntent.created.toInt())
  }

  return map
}

internal fun mapToPaymentMethodCreateParams(cardData: ReadableMap): PaymentMethodCreateParams {
  val cardParams = CardParams(
    cardData.getString("number").orEmpty(),
    cardData.getInt("expiryMonth"),
    cardData.getInt("expiryYear"),
    cardData.getString("cvc"),
    if (cardData.hasKey("name")) cardData.getString("name") else null,
    if (cardData.hasKey("postalCode")) Address.Builder().setPostalCode(cardData.getString("postalCode").orEmpty()).build() else null,
    if (cardData.hasKey("currency")) cardData.getString("currency") else null,
    null)

  return PaymentMethodCreateParams.createCard(cardParams)
}

internal fun mapToCard(card: ReadableMap): PaymentMethodCreateParams.Card {
  return PaymentMethodCreateParams.Card.Builder()
    .setCvc(card.getString("cvc"))
    .setExpiryMonth(card.getInt("expiryMonth"))
    .setExpiryYear(card.getInt("expiryYear"))
    .setNumber(card.getString("number").orEmpty())
    .build()
}

fun getValOr(map: ReadableMap, key: String, default: String? = ""): String? {
  return if (map.hasKey(key)) map.getString(key) else default
}

internal fun mapToBillingDetails(billingDatails: ReadableMap): PaymentMethod.BillingDetails {
  val address = Address.Builder()
    .setPostalCode(getValOr(billingDatails, "addressPostalCode"))
    .setCity(getValOr(billingDatails, "addressCity"))
    .setCountry(getValOr(billingDatails, "addressCountry"))
    .setLine1(getValOr(billingDatails, "addressLine1"))
    .setLine2(getValOr(billingDatails, "addressLine2"))
    .setState(getValOr(billingDatails, "addressState"))
    .build()

  return PaymentMethod.BillingDetails.Builder()
    .setAddress(address)
    .setName(getValOr(billingDatails, "name"))
    .setPhone(getValOr(billingDatails, "phone"))
    .setEmail(getValOr(billingDatails, "email"))
    .build()
}

internal fun mapFromSetupIntentResult(setupIntent: SetupIntent): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("id", setupIntent.id)
  map.putString("status", mapIntentStatus(setupIntent.status))
  map.putString("description", setupIntent.description)
  if(setupIntent.created != null) {
    map.putInt("created", setupIntent.created.toInt())
  }

  return map
}
