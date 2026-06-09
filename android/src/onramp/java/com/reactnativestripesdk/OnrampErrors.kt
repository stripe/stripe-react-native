@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.stripe.android.core.exception.StripeException
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.exception.AppAttestationException
import com.stripe.android.crypto.onramp.exception.CryptoOnrampApiException
import com.stripe.android.crypto.onramp.exception.SDKVersion
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

  return createOnrampErrorMap(
    code = code,
    message = apiException.userMessage,
    localizedMessage = apiException.localizedMessage,
    declineCode = stripeError?.declineCode,
    type = apiException.context.apiErrorType ?: stripeError?.type,
    stripeErrorCode = apiException.code,
  ) {
    putString("onrampErrorType", onrampErrorType)
    putString("developerMessage", apiException.developerMessage)
    putString("userMessage", apiException.userMessage)
    putString("reason", apiException.context.reason)
    putString("operation", apiException.context.operation)
    putString("appPackageName", apiException.context.appPackageName)
    putString("mode", apiException.context.mode)
    putArray("sdkVersions", mapFromSdkVersions(apiException.sdkVersions))
    putString("requestId", apiException.context.requestId)
    putString("apiErrorCode", apiException.context.apiErrorCode)
    putString("apiErrorType", apiException.context.apiErrorType)
    putString("apiErrorMessage", apiException.context.apiErrorMessage)
    putString("apiUserMessage", apiException.context.apiUserMessage)
    putString("docUrl", apiException.context.docUrl)
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
    putString("developerMessage", onrampError.developerMessage)
    putString("userMessage", onrampError.userMessage)
  }
}

private fun createOnrampMessageError(
  code: String,
  message: String?,
): WritableMap =
  createOnrampErrorMap(code = code, message = message)

private fun CryptoOnrampApiException.toOnrampErrorType(): String =
  if (this is AppAttestationException) {
    "AppAttestationError"
  } else {
    "UncategorizedApiError"
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

private fun mapFromSdkVersions(
  sdkVersions: List<SDKVersion>,
): WritableArray =
  Arguments.createArray().apply {
    sdkVersions.forEach { sdkVersion ->
      pushMap(
        Arguments.createMap().apply {
          putString("name", sdkVersion.name)
          putString("version", sdkVersion.version)
        },
      )
    }
  }
