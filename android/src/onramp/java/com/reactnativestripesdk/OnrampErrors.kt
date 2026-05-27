@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.createError
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.exception.AppAttestationException
import com.stripe.android.crypto.onramp.exception.CryptoOnrampException
import com.stripe.android.crypto.onramp.exception.UncategorizedApiErrorException

internal fun createOnrampFailedError(error: Throwable): WritableMap =
  createOnrampError(ErrorType.Failed.toString(), error)

internal fun createOnrampNotConfiguredError(): WritableMap =
  createError(
    ErrorType.Failed.toString(),
    "Onramp is not configured.",
  )

private fun createOnrampError(
  code: String,
  error: Throwable,
): WritableMap {
  val exception = error as? CryptoOnrampException ?: return createError(code, error)
  val stripeError = exception.stripeError

  var onrampErrorType: String? = null
  var reason: String? = null
  var operation: String? = null
  var appPackageName: String? = null
  var mode: String? = null
  var sdkVersion: String? = null
  var apiErrorCode: String? = null
  var apiErrorType: String? = null
  var apiErrorMessage: String? = null
  var apiUserMessage: String? = null
  var docUrl: String? = null

  when (exception) {
    is AppAttestationException -> {
      onrampErrorType = "AppAttestationError"
      reason = exception.reason
      operation = exception.operation
      appPackageName = exception.appPackageName
      mode = exception.mode
      sdkVersion = exception.sdkVersion
      apiErrorCode = exception.apiErrorCode
      apiErrorType = exception.apiErrorType
      apiErrorMessage = exception.apiErrorMessage
      apiUserMessage = exception.apiUserMessage
      docUrl = exception.docUrl
    }
    is UncategorizedApiErrorException -> {
      onrampErrorType = "UncategorizedApiError"
      reason = exception.reason
      operation = exception.operation
      appPackageName = exception.appPackageName
      mode = exception.mode
      sdkVersion = exception.sdkVersion
      apiErrorCode = exception.apiErrorCode
      apiErrorType = exception.apiErrorType
      apiErrorMessage = exception.apiErrorMessage
      apiUserMessage = exception.apiUserMessage
      docUrl = exception.docUrl
    }
  }

  val map: WritableMap = Arguments.createMap()
  val details: WritableMap = Arguments.createMap()

  details.putString("code", code)
  details.putString("message", exception.userMessage)
  details.putString("localizedMessage", exception.userMessage)
  details.putString("declineCode", stripeError?.declineCode)
  details.putString("type", apiErrorType ?: stripeError?.type)
  details.putString("stripeErrorCode", apiErrorCode ?: stripeError?.code)
  details.putString("onrampErrorType", onrampErrorType)
  details.putString("developerMessage", exception.developerMessage)
  details.putString("userMessage", exception.userMessage)
  details.putString("reason", reason)
  details.putString("operation", operation)
  details.putString("appPackageName", appPackageName)
  details.putString("mode", mode)
  details.putString("sdkVersion", sdkVersion)
  details.putString("requestId", exception.requestId)
  details.putString("apiErrorCode", apiErrorCode)
  details.putString("apiErrorType", apiErrorType)
  details.putString("apiErrorMessage", apiErrorMessage)
  details.putString("apiUserMessage", apiUserMessage)
  details.putString("docUrl", docUrl)

  map.putMap("error", details)
  return map
}
