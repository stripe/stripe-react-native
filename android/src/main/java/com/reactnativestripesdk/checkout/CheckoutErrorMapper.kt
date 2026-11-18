package com.reactnativestripesdk.checkout

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.stripe.android.paymentsheet.R
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException

internal fun checkoutErrorCode(error: Throwable): String = when (error) {
  is TimeoutCancellationException -> "Timeout"
  is CancellationException -> "Canceled"
  else -> "Failed"
}

/** Carries a failed native operation's customer-facing message alongside its diagnostic error. */
internal class CheckoutOperationException(
  val error: Throwable,
  val displayMessage: String?,
) : Exception(error.message, error)

/**
 * Returns the message to display to the customer for a Checkout failure. Failures raised by this
 * bridge have no display message, so customers see a generic message.
 *
 * Stopgap: the pinned SDK also returns a `null` display message for some native failures, such as
 * when the server omits a message or the failure didn't come from the Stripe API. Native Checkout
 * should vend a generic localized message in those cases; once it does, only bridge failures
 * should need this fallback.
 */
internal fun checkoutLocalizedMessage(displayMessage: String?, context: Context): String =
  displayMessage ?: context.getString(R.string.stripe_something_went_wrong)

/**
 * Rejects with the native diagnostic error. JavaScript reads the customer-facing message from
 * `userInfo` and exposes it as the error's `localizedMessage`.
 */
internal fun Promise.rejectCheckout(
  error: Throwable,
  context: Context,
  code: String? = null,
) {
  val failure = error as? CheckoutOperationException
  // Report the native error rather than the wrapper that carried its display message.
  val cause = failure?.error ?: error
  reject(
    code ?: checkoutErrorCode(cause),
    cause.message,
    cause,
    checkoutUserInfo(failure?.displayMessage, context),
  )
}

/**
 * Rejects a bridge precondition failure, such as a missing controller, which has no underlying
 * error. Customers see a generic message.
 */
internal fun Promise.rejectCheckout(
  code: String,
  message: String,
  context: Context,
) {
  reject(code, message, null, checkoutUserInfo(displayMessage = null, context))
}

private fun checkoutUserInfo(displayMessage: String?, context: Context): WritableMap =
  Arguments.createMap().apply {
    putString("localizedMessage", checkoutLocalizedMessage(displayMessage, context))
  }
