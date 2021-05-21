package com.reactnativestripesdk

import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap

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

internal fun createError(errorType: String, message: String): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("message", message)
  map.putString("code", errorType)

  return map
}
