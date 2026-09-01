package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException

internal enum class CheckoutBridgeErrorCode(
  val serializedValue: String,
) {
  Failed("Failed"),
  InvalidClientSecret("InvalidClientSecret"),
  SessionNotOpen("SessionNotOpen"),
  SheetCurrentlyPresented("SheetCurrentlyPresented"),
  Timeout("Timeout"),
  Canceled("Canceled"),
}

internal class CheckoutMutationBridgeException(
  operation: String,
) : IllegalStateException(
  "The installed Stripe Android SDK does not support CheckoutController.$operation yet.",
)

internal object CheckoutErrorMapper {
  fun code(error: Throwable): CheckoutBridgeErrorCode {
    val message = error.message.orEmpty()
    return when {
      error is TimeoutCancellationException -> CheckoutBridgeErrorCode.Timeout
      error is CancellationException -> CheckoutBridgeErrorCode.Canceled
      message.contains("before it is configured") || message.contains("not open", ignoreCase = true) -> {
        CheckoutBridgeErrorCode.SessionNotOpen
      }
      message.contains("while a payment flow is presented") -> {
        CheckoutBridgeErrorCode.SheetCurrentlyPresented
      }
      else -> CheckoutBridgeErrorCode.Failed
    }
  }
}
