package com.reactnativestripesdk.checkout

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
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
 * Returns the message to display to the customer for a Checkout failure.
 *
 * Stopgap: remove the generic fallback once native Checkout always provides a display message. The
 * pinned SDK returns `null` when the server omits a message or the failure didn't come from the
 * Stripe API, but Checkout should vend a generic localized message in those cases.
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
    Arguments.createMap().apply {
      putString("localizedMessage", checkoutLocalizedMessage(failure?.displayMessage, context))
    },
  )
}
