@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.stripe.android.core.exception.StripeException
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.exception.CryptoOnrampApiException
import com.stripe.android.crypto.onramp.exception.StripeCryptoOnrampError

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
  val apiException =
    error as? CryptoOnrampApiException
      ?: return createNonApiOnrampError(code, error)

  val stripeError = apiException.stripeError
  val onrampErrorType = apiException.toOnrampErrorType()
  val apiErrorContext = apiException.apiErrorContext

  return createOnrampErrorMap(
    code = code,
    message = apiException.userMessage,
    localizedMessage = apiException.localizedMessage,
    declineCode = stripeError?.declineCode,
    type = apiErrorContext.apiErrorType ?: stripeError?.type,
    stripeErrorCode = apiException.code,
  ) {
    putCommonOnrampFields(apiException, onrampErrorType)
    putString("reason", apiErrorContext.reason)
    putString("requestId", apiErrorContext.requestId)
    putString("apiErrorCode", apiErrorContext.apiErrorCode)
    putString("apiErrorType", apiErrorContext.apiErrorType)
    putString("apiErrorMessage", apiErrorContext.apiErrorMessage)
    putString("apiUserMessage", apiErrorContext.apiUserMessage)
  }
}

private fun createNonApiOnrampError(
  code: String,
  error: Throwable,
): WritableMap {
  val onrampError =
    error as? StripeCryptoOnrampError
      ?: return createGenericError(code, error)

  return createOnrampErrorMap(
    code = code,
    message = onrampError.userMessage,
    localizedMessage = error.localizedMessage,
    stripeErrorCode = onrampError.code,
  ) {
    putCommonOnrampFields(onrampError, onrampError.toOnrampErrorType())
  }
}

private fun WritableMap.putCommonOnrampFields(
  error: StripeCryptoOnrampError,
  onrampErrorType: String? = null,
) {
  onrampErrorType?.let {
    putString("onrampErrorType", it)
  }
  putString("developerMessage", error.developerMessage)
  putString("userMessage", error.userMessage)
  putString("docUrl", error.docUrl)
}

private fun createOnrampMessageError(
  code: String,
  message: String?,
): WritableMap =
  createOnrampErrorMap(code = code, message = message)

private fun CryptoOnrampApiException.toOnrampErrorType(): String =
  if (code == "link_failed_to_attest_request") {
    "AppAttestationError"
  } else {
    "UncategorizedApiError"
  }

private fun StripeCryptoOnrampError.toOnrampErrorType(): String? =
  if (code == "app_attestation_unavailable") {
    "AppAttestationUnavailableError"
  } else {
    null
  }

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
