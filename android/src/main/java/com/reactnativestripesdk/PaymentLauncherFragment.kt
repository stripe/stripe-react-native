package com.reactnativestripesdk

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.Promise
import com.stripe.android.ApiResultCallback
import com.stripe.android.Stripe
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.StripeIntent
import com.stripe.android.payments.paymentlauncher.PaymentLauncher
import com.stripe.android.payments.paymentlauncher.PaymentResult

class PaymentLauncherFragment(
  private val stripe: Stripe,
  private val publishableKey: String,
  private val stripeAccountId: String?,
) : Fragment() {
  lateinit var paymentLauncher: PaymentLauncher

  var clientSecret: String? = null
  var promise: Promise? = null

  override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                            savedInstanceState: Bundle?): View {
    paymentLauncher = createPaymentLauncher()
    return FrameLayout(requireActivity()).also {
      it.visibility = View.GONE
    }
  }

  private fun createPaymentLauncher(): PaymentLauncher {
    return PaymentLauncher.create(this, publishableKey, stripeAccountId) { paymentResult ->
      when (paymentResult) {
        is PaymentResult.Completed -> {
          clientSecret?.let {
            retrievePaymentIntent(it, stripeAccountId)
          } ?: run {
            throw Exception("Client secret must be set before responding to payment results.")
          }
        }
        is PaymentResult.Canceled -> {
          promise?.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), message = null))
            ?: throw Exception("No promise is set to handle payment results.")
        }
        is PaymentResult.Failed -> {
          promise?.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), paymentResult.throwable.localizedMessage))
            ?: throw Exception("No promise is set to handle payment results.")
        }
      }
    }
  }

  private fun retrievePaymentIntent(clientSecret: String, stripeAccountId: String?) {
    val promise = promise ?: throw Exception("No promise is set to handle payment results.")
    stripe.retrievePaymentIntent(clientSecret, stripeAccountId, object : ApiResultCallback<PaymentIntent> {
      override fun onError(e: Exception) {
        promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), e))
      }

      override fun onSuccess(result: PaymentIntent) {
        when (result.status) {
          StripeIntent.Status.Succeeded,
          StripeIntent.Status.Processing,
          StripeIntent.Status.RequiresCapture -> {
            val paymentIntent = createResult("paymentIntent", mapFromPaymentIntentResult(result))
            promise.resolve(paymentIntent)
          }
          StripeIntent.Status.RequiresAction -> {
            if (isPaymentIntentNextActionVoucherBased(result.nextActionType)) {
              val paymentIntent = createResult("paymentIntent", mapFromPaymentIntentResult(result))
              promise.resolve(paymentIntent)
            } else {
              (result.lastPaymentError)?.let {
                promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), it))
              } ?: run {
                promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), "The payment has been canceled"))
              }
            }
          }
          StripeIntent.Status.RequiresPaymentMethod -> {
            val error = result.lastPaymentError
            promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), error))
          }
          StripeIntent.Status.RequiresConfirmation -> {
            val paymentIntent = createResult("paymentIntent", mapFromPaymentIntentResult(result))
            promise.resolve(paymentIntent)
          }
          StripeIntent.Status.Canceled -> {
            val error = result.lastPaymentError
            promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), error))
          }
          else -> {
            val errorMessage = "unhandled error: ${result.status}"
            promise.resolve(createError(ConfirmPaymentErrorType.Unknown.toString(), errorMessage))
          }
        }
      }
    })
  }

  /// Check paymentIntent.nextAction is voucher-based payment method.
  /// If it's voucher-based, the paymentIntent status stays in requiresAction until the voucher is paid or expired.
  /// Currently only OXXO payment is voucher-based.
  private fun isPaymentIntentNextActionVoucherBased(nextAction: StripeIntent.NextActionType?): Boolean {
    nextAction?.let {
      return it == StripeIntent.NextActionType.DisplayOxxoDetails
    }
    return false
  }
}

