@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.stripe.android.core.exception.StripeException
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.exception.AppAttestationException
import com.stripe.android.crypto.onramp.exception.CryptoOnrampException
import com.stripe.android.crypto.onramp.exception.UncategorizedApiErrorException

internal fun createOnrampFailedError(error: Throwable): WritableMap =
  createOnrampError(ErrorType.Failed.toString(), error)

internal fun createOnrampNotConfiguredError(): WritableMap =
  createOnrampMessageError(
    ErrorType.Failed.toString(),
    "Onramp is not configured.",
  )

private fun createOnrampError(
  code: String,
  error: Throwable,
): WritableMap {
  val exception =
    error as? CryptoOnrampException
      ?: return createGenericError(code, error)
  val stripeError = exception.stripeError

  var onrampErrorType: String? = null
  val apiErrorContext =
    when (exception) {
      is AppAttestationException -> {
        onrampErrorType = "AppAttestationError"
        exception.context
      }
      is UncategorizedApiErrorException -> {
        onrampErrorType = "UncategorizedApiError"
        exception.context
      }
      else -> null
    }

  return createOnrampErrorMap(
    code = code,
    message = exception.userMessage,
    declineCode = stripeError?.declineCode,
    type = apiErrorContext?.apiErrorType ?: stripeError?.type,
    stripeErrorCode = apiErrorContext?.apiErrorCode ?: stripeError?.code,
  ) {
    putString("onrampErrorType", onrampErrorType)
    putString("developerMessage", exception.developerMessage)
    putString("userMessage", exception.userMessage)
    putString("reason", apiErrorContext?.reason)
    putString("operation", apiErrorContext?.operation)
    putString("appPackageName", apiErrorContext?.appPackageName)
    putString("mode", apiErrorContext?.mode)
    putString("sdkVersion", apiErrorContext?.sdkVersion)
    putString("requestId", exception.requestId)
    putString("apiErrorCode", apiErrorContext?.apiErrorCode)
    putString("apiErrorType", apiErrorContext?.apiErrorType)
    putString("apiErrorMessage", apiErrorContext?.apiErrorMessage)
    putString("apiUserMessage", apiErrorContext?.apiUserMessage)
    putString("docUrl", apiErrorContext?.docUrl)
  }
}

private fun createOnrampMessageError(
  code: String,
  message: String?,
): WritableMap =
  createOnrampErrorMap(code = code, message = message)

private fun createGenericError(
  code: String,
  error: Throwable,
): WritableMap {
  val stripeError = (error as? StripeException)?.stripeError

  return createOnrampErrorMap(
    code = code,
    message = error.message,
    localizedMessage = error.localizedMessage,
    declineCode = stripeError?.declineCode,
    type = stripeError?.type,
    stripeErrorCode = stripeError?.code,
  )
}

private fun createOnrampErrorMap(
  code: String,
  message: String?,
  localizedMessage: String? = message,
  declineCode: String? = null,
  type: String? = null,
  stripeErrorCode: String? = null,
  configure: (WritableMap.() -> Unit)? = null,
): WritableMap {
  val map: WritableMap = Arguments.createMap()
  val details: WritableMap = Arguments.createMap()

  details.putString("code", code)
  details.putString("message", message)
  details.putString("localizedMessage", localizedMessage)
  details.putString("declineCode", declineCode)
  details.putString("type", type)
  details.putString("stripeErrorCode", stripeErrorCode)
  configure?.invoke(details)

  map.putMap("error", details)
  return map
}
