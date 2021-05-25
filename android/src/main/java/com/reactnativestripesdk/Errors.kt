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

internal fun mapError(code: String, message: String?, declineCode: String?, type: String?): WritableMap {
  val map: WritableMap = WritableNativeMap()
  val details: WritableMap = WritableNativeMap()
  details.putString("message", message)
  details.putString("code", code)
  details.putString("declineCode", declineCode)
  details.putString("type", type)

  map.putMap("error", details)
  return map
}

internal fun createError(code: String, message: String, declineCode: String?, type: String?): WritableMap {
  return mapError(code, message, declineCode, type)
}

internal fun createError(code: String, error: PaymentIntent.Error?): WritableMap {
  return mapError(code, error?.message.orEmpty(), error?.declineCode.orEmpty(), error?.type?.name.orEmpty())
}

internal fun createError(code: String, error: SetupIntent.Error?): WritableMap {
  return mapError(code, error?.message.orEmpty(), error?.declineCode.orEmpty(), error?.type?.name.orEmpty())
}
