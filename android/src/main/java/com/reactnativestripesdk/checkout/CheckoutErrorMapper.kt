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
    return when {
      error is TimeoutCancellationException -> CheckoutBridgeErrorCode.Timeout
      error is CancellationException -> CheckoutBridgeErrorCode.Canceled
      // Native Checkout reports these failures as generic exceptions.
      else -> CheckoutBridgeErrorCode.Failed
    }
  }
}
