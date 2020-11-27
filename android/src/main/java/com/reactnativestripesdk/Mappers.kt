package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.model.*

enum class ConfirmPaymentErrorType {
  Failed, Canceled, Unknown
}

enum class NextPaymentActionErrorType {
  Failed, Canceled, Unknown
}

internal fun mapConfirmPaymentErrorType(confirmPaymentErrorType: ConfirmPaymentErrorType): String {
  return when (confirmPaymentErrorType) {
    ConfirmPaymentErrorType.Failed -> "Failed"
    ConfirmPaymentErrorType.Canceled -> "Canceled"
    ConfirmPaymentErrorType.Unknown -> "Unknown"
  }
}

internal fun mapNextPaymentActionErrorType(nextPaymentActionErrorType: NextPaymentActionErrorType): String {
  return when (nextPaymentActionErrorType) {
    NextPaymentActionErrorType.Failed -> "Failed"
    NextPaymentActionErrorType.Canceled -> "Canceled"
    NextPaymentActionErrorType.Unknown -> "Unknown"
  }
}

internal fun createError(errorType: String, message: String): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("message", message)
  map.putString("code", errorType)

  return map
}

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
