package com.reactnativestripesdk

import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.SetupIntent

enum class ConfirmPaymentErrorType {
  Failed, Canceled, Unknown
}

enum class NextPaymentActionErrorType {
  Failed, Canceled, Unknown
}

enum class ConfirmSetupIntentErrorType {
  Failed, Canceled, Unknown
}

enum class RetrievePaymentIntentErrorType {
  Unknown
}

enum class PaymentSheetErrorType {
  Failed, Canceled
}

internal fun createError(errorType: String, message: String, declineCode: String?, type: String?): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("message", message)
  map.putString("code", errorType)
  map.putString("declineCode", declineCode)
  map.putString("type", type)

  return map
}

internal fun createError(errorType: String, error: PaymentIntent.Error): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("message", error.message)
  map.putString("code", errorType)
  map.putString("declineCode", error.declineCode)
  map.putString("type", error.type?.name)

  return map
}

internal fun createError(errorType: String, error: SetupIntent.Error): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("message", error.message)
  map.putString("code", errorType)
  map.putString("declineCode", error.declineCode)
  map.putString("type", error.type?.name)

  return map
}
