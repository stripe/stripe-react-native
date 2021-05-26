package com.reactnativestripesdk

import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.exception.CardException
import com.stripe.android.exception.InvalidRequestException
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.SetupIntent

enum class ConfirmPaymentErrorType {
  Failed, Canceled, Unknown
}

enum class CreateTokenErrorType {
  Failed
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

internal fun mapError(code: String, message: String?, localizedMessage: String?, declineCode: String?, type: String?, stripeErrorCode: String?): WritableMap {
  val map: WritableMap = WritableNativeMap()
  val details: WritableMap = WritableNativeMap()
  details.putString("code", code)
  details.putString("message", message)
  details.putString("localizedMessage", localizedMessage)
  details.putString("declineCode", declineCode)
  details.putString("type", type)
  details.putString("stripeErrorCode", stripeErrorCode)

  map.putMap("error", details)
  return map
}

internal fun createError(code: String, message: String?): WritableMap {
  return mapError(code, message, message, null, null, null)
}

internal fun createError(code: String, error: PaymentIntent.Error?): WritableMap {
  return mapError(code, error?.message.orEmpty(), error?.message.orEmpty(), error?.declineCode.orEmpty(), error?.type?.name.orEmpty(), error?.code.orEmpty())
}

internal fun createError(code: String, error: SetupIntent.Error?): WritableMap {
  return mapError(code, error?.message.orEmpty(), error?.message.orEmpty(), error?.declineCode.orEmpty(), error?.type?.name.orEmpty(), error?.code.orEmpty())
}

internal fun createError(code: String, error: Exception): WritableMap {
  if (error is CardException) {
    return mapError(code, error.message.orEmpty(), error.localizedMessage.orEmpty(), error.declineCode.orEmpty(), null, error.code)
  } else if (error is InvalidRequestException) {
    return mapError(code, error.message.orEmpty(), error.localizedMessage.orEmpty(), error.stripeError?.declineCode.orEmpty(), error.stripeError?.type.orEmpty(), error.stripeError?.code.orEmpty())
  }
  return mapError(code, error.message.orEmpty(), error.localizedMessage.orEmpty(), null, null, null)
}

internal fun createError(code: String, error: Throwable): WritableMap {
  return mapError(code, error.message.orEmpty(), error.localizedMessage.orEmpty(), null, null, null)
}
