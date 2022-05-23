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
import com.stripe.android.model.*
import com.stripe.android.payments.paymentlauncher.PaymentLauncher
import com.stripe.android.payments.paymentlauncher.PaymentResult

class PaymentLauncherFragment(
  private val stripe: Stripe,
  private val publishableKey: String,
  private val stripeAccountId: String?,
) : Fragment() {
  private lateinit var paymentLauncher: PaymentLauncher
  private var clientSecret: String? = null
  private var promise: Promise? = null
  private var isPaymentIntent: Boolean = true

  override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                            savedInstanceState: Bundle?): View {
    paymentLauncher = createPaymentLauncher()
    return FrameLayout(requireActivity()).also {
      it.visibility = View.GONE
    }
  }

  fun handleNextActionForPaymentIntent(clientSecret: String, promise: Promise) {
    this.clientSecret = clientSecret
    this.promise = promise
    paymentLauncher.handleNextActionForPaymentIntent(clientSecret)
  }

  fun confirm(params: ConfirmPaymentIntentParams, clientSecret: String, promise: Promise) {
    this.clientSecret = clientSecret
    this.promise = promise
    this.isPaymentIntent = true
    paymentLauncher.confirm(params)
  }

  fun confirm(params: ConfirmSetupIntentParams, clientSecret: String, promise: Promise) {
    this.clientSecret = clientSecret
    this.promise = promise
    this.isPaymentIntent = false
    paymentLauncher.confirm(params)
  }

  private fun createPaymentLauncher(): PaymentLauncher {
    return PaymentLauncher.create(this, publishableKey, stripeAccountId) { paymentResult ->
      when (paymentResult) {
        is PaymentResult.Completed -> {
          clientSecret?.let {
            if (isPaymentIntent) retrievePaymentIntent(it, stripeAccountId)
            else retrieveSetupIntent(it, stripeAccountId)
          } ?: run {
            promise?.resolve(
              createError(ConfirmPaymentErrorType.Failed.toString(), "Client secret must be set before responding to payment results.")
            )
              ?: throw Exception("Client secret must be set before responding to payment results.")
          }
        }
        is PaymentResult.Canceled -> {
          promise?.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), message = null))
            ?: throw Exception("No promise is set to handle payment results.")
        }
        is PaymentResult.Failed -> {
          promise?.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), paymentResult.throwable))
            ?: throw Exception("No promise is set to handle payment results.")
        }
      }
    }
  }

  private fun retrieveSetupIntent(clientSecret: String, stripeAccountId: String?) {
    val promise = promise ?: throw Exception("No promise is set to handle payment results.")
    stripe.retrieveSetupIntent(clientSecret, stripeAccountId, object : ApiResultCallback<SetupIntent> {
      override fun onError(e: Exception) {
        promise.resolve(createError(ConfirmSetupIntentErrorType.Failed.toString(), e))
      }

      override fun onSuccess(result: SetupIntent) {
        when (result.status) {
          StripeIntent.Status.Succeeded,
          StripeIntent.Status.Processing,
          StripeIntent.Status.RequiresConfirmation,
          StripeIntent.Status.RequiresCapture -> {
            promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(result)))
          }
          StripeIntent.Status.RequiresAction -> {
            if (isNextActionSuccessState(result.nextActionType)) {
              promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(result)))
            } else {
              (result.lastSetupError)?.let {
                promise.resolve(createError(ConfirmSetupIntentErrorType.Canceled.toString(), it))
              } ?: run {
                promise.resolve(createError(ConfirmSetupIntentErrorType.Canceled.toString(), "Setup has been canceled"))
              }
            }
          }
          StripeIntent.Status.RequiresPaymentMethod -> {
            promise.resolve(createError(ConfirmSetupIntentErrorType.Failed.toString(), result.lastSetupError))
          }
          StripeIntent.Status.Canceled -> {
            promise.resolve(createError(ConfirmSetupIntentErrorType.Canceled.toString(), result.lastSetupError))
          }
          else -> {
            promise.resolve(createError(ConfirmSetupIntentErrorType.Unknown.toString(), "unhandled error: ${result.status}"))
          }
        }
      }
    })
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
          StripeIntent.Status.RequiresConfirmation,
          StripeIntent.Status.RequiresCapture -> {
            promise.resolve(createResult("paymentIntent", mapFromPaymentIntentResult(result)))
          }
          StripeIntent.Status.RequiresAction -> {
            if (isNextActionSuccessState(result.nextActionType)) {
              promise.resolve(createResult("paymentIntent", mapFromPaymentIntentResult(result)))
            } else {
              (result.lastPaymentError)?.let {
                promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), it))
              } ?: run {
                promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), "The payment has been canceled"))
              }
            }
          }
          StripeIntent.Status.RequiresPaymentMethod -> {
            promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), result.lastPaymentError))
          }
          StripeIntent.Status.Canceled -> {
            promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), result.lastPaymentError))
          }
          else -> {
            promise.resolve(createError(ConfirmPaymentErrorType.Unknown.toString(), "unhandled error: ${result.status}"))
          }
        }
      }
    })
  }

  /**
   * Check if paymentIntent.nextAction is out-of-band, such as voucher-based or waiting
   * on customer verification. If it is, then being in this state is considered "successful".
   */
  private fun isNextActionSuccessState(nextAction: StripeIntent.NextActionType?): Boolean {
    return when (nextAction) {
      StripeIntent.NextActionType.DisplayOxxoDetails,
      StripeIntent.NextActionType.VerifyWithMicrodeposits -> true
      StripeIntent.NextActionType.RedirectToUrl,
      StripeIntent.NextActionType.UseStripeSdk,
      StripeIntent.NextActionType.AlipayRedirect,
      StripeIntent.NextActionType.BlikAuthorize,
      StripeIntent.NextActionType.WeChatPayRedirect,
      null -> false
    }
  }
}

