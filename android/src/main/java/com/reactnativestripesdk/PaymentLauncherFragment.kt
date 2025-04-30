package com.reactnativestripesdk

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.utils.ConfirmPaymentErrorType
import com.reactnativestripesdk.utils.ConfirmSetupIntentErrorType
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.StripeFragment
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createMissingActivityError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.mapFromPaymentIntentResult
import com.reactnativestripesdk.utils.mapFromSetupIntentResult
import com.reactnativestripesdk.utils.removeFragment
import com.stripe.android.ApiResultCallback
import com.stripe.android.Stripe
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.ConfirmSetupIntentParams
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.SetupIntent
import com.stripe.android.model.StripeIntent
import com.stripe.android.payments.paymentlauncher.PaymentLauncher
import com.stripe.android.payments.paymentlauncher.PaymentResult

/** Instances of this class should only be initialized with the companion's helper methods. */
class PaymentLauncherFragment : StripeFragment() {
  private lateinit var context: ReactApplicationContext
  private lateinit var stripe: Stripe
  private lateinit var publishableKey: String
  private var stripeAccountId: String? = null
  private lateinit var promise: Promise

  // Used when confirming a payment intent
  private var paymentIntentClientSecret: String? = null
  private var confirmPaymentParams: ConfirmPaymentIntentParams? = null

  // Used when confirming a setup intent
  private var setupIntentClientSecret: String? = null
  private var confirmSetupParams: ConfirmSetupIntentParams? = null

  // Used when handling the next action on a payment intent
  private var handleNextActionPaymentIntentClientSecret: String? = null

  // Used when handling the next action on a setup intent
  private var handleNextActionSetupIntentClientSecret: String? = null
  private lateinit var paymentLauncher: PaymentLauncher

  companion object {
    private fun create(
      context: ReactApplicationContext,
      stripe: Stripe,
      publishableKey: String,
      stripeAccountId: String?,
      promise: Promise,
      paymentIntentClientSecret: String? = null,
      confirmPaymentParams: ConfirmPaymentIntentParams? = null,
      setupIntentClientSecret: String? = null,
      confirmSetupParams: ConfirmSetupIntentParams? = null,
      handleNextActionPaymentIntentClientSecret: String? = null,
      handleNextActionSetupIntentClientSecret: String? = null,
    ): PaymentLauncherFragment {
      val instance = PaymentLauncherFragment()
      instance.context = context
      instance.stripe = stripe
      instance.publishableKey = publishableKey
      instance.stripeAccountId = stripeAccountId
      instance.promise = promise
      instance.paymentIntentClientSecret = paymentIntentClientSecret
      instance.confirmPaymentParams = confirmPaymentParams
      instance.setupIntentClientSecret = setupIntentClientSecret
      instance.confirmSetupParams = confirmSetupParams
      instance.handleNextActionPaymentIntentClientSecret = handleNextActionPaymentIntentClientSecret
      instance.handleNextActionSetupIntentClientSecret = handleNextActionSetupIntentClientSecret
      return instance
    }

    /** Helper-constructor used for confirming payment intents */
    fun forPayment(
      context: ReactApplicationContext,
      stripe: Stripe,
      publishableKey: String,
      stripeAccountId: String?,
      promise: Promise,
      paymentIntentClientSecret: String,
      confirmPaymentParams: ConfirmPaymentIntentParams,
    ): PaymentLauncherFragment {
      val paymentLauncherFragment =
        create(
          context,
          stripe,
          publishableKey,
          stripeAccountId,
          promise,
          paymentIntentClientSecret = paymentIntentClientSecret,
          confirmPaymentParams = confirmPaymentParams,
        )
      addFragment(paymentLauncherFragment, context, promise)
      return paymentLauncherFragment
    }

    /** Helper-constructor used for confirming setup intents */
    fun forSetup(
      context: ReactApplicationContext,
      stripe: Stripe,
      publishableKey: String,
      stripeAccountId: String?,
      promise: Promise,
      setupIntentClientSecret: String,
      confirmSetupParams: ConfirmSetupIntentParams,
    ): PaymentLauncherFragment {
      val paymentLauncherFragment =
        create(
          context,
          stripe,
          publishableKey,
          stripeAccountId,
          promise,
          setupIntentClientSecret = setupIntentClientSecret,
          confirmSetupParams = confirmSetupParams,
        )
      addFragment(paymentLauncherFragment, context, promise)
      return paymentLauncherFragment
    }

    /** Helper-constructor used for handling the next action on a payment intent */
    fun forNextActionPayment(
      context: ReactApplicationContext,
      stripe: Stripe,
      publishableKey: String,
      stripeAccountId: String?,
      promise: Promise,
      handleNextActionPaymentIntentClientSecret: String,
    ): PaymentLauncherFragment {
      val paymentLauncherFragment =
        create(
          context,
          stripe,
          publishableKey,
          stripeAccountId,
          promise,
          handleNextActionPaymentIntentClientSecret = handleNextActionPaymentIntentClientSecret,
        )
      addFragment(paymentLauncherFragment, context, promise)
      return paymentLauncherFragment
    }

    /** Helper-constructor used for handling the next action on a setup intent */
    fun forNextActionSetup(
      context: ReactApplicationContext,
      stripe: Stripe,
      publishableKey: String,
      stripeAccountId: String?,
      promise: Promise,
      handleNextActionSetupIntentClientSecret: String,
    ): PaymentLauncherFragment {
      val paymentLauncherFragment =
        create(
          context,
          stripe,
          publishableKey,
          stripeAccountId,
          promise,
          handleNextActionSetupIntentClientSecret = handleNextActionSetupIntentClientSecret,
        )
      addFragment(paymentLauncherFragment, context, promise)
      return paymentLauncherFragment
    }

    private fun addFragment(
      fragment: PaymentLauncherFragment,
      context: ReactApplicationContext,
      promise: Promise,
    ) {
      (context.currentActivity as? FragmentActivity)?.let {
        try {
          it.supportFragmentManager
            .beginTransaction()
            .add(fragment, TAG)
            .commit()
        } catch (error: IllegalStateException) {
          promise.resolve(createError(ErrorType.Failed.toString(), error.message))
        }
      } ?: run { promise.resolve(createMissingActivityError()) }
    }

    internal const val TAG = "payment_launcher_fragment"
  }

  override fun prepare() {
    paymentLauncher = createPaymentLauncher()
    if (paymentIntentClientSecret != null && confirmPaymentParams != null) {
      paymentLauncher.confirm(confirmPaymentParams!!)
    } else if (setupIntentClientSecret != null && confirmSetupParams != null) {
      paymentLauncher.confirm(confirmSetupParams!!)
    } else if (handleNextActionPaymentIntentClientSecret != null) {
      paymentLauncher.handleNextActionForPaymentIntent(handleNextActionPaymentIntentClientSecret!!)
    } else if (handleNextActionSetupIntentClientSecret != null) {
      paymentLauncher.handleNextActionForSetupIntent(handleNextActionSetupIntentClientSecret!!)
    } else {
      throw Exception(
        "Invalid parameters provided to PaymentLauncher. Ensure that you are providing the correct client secret and setup params (if necessary).",
      )
    }
  }

  private fun createPaymentLauncher(): PaymentLauncher =
    PaymentLauncher.create(this, publishableKey, stripeAccountId) { paymentResult ->
      when (paymentResult) {
        is PaymentResult.Completed -> {
          paymentIntentClientSecret?.let {
            retrievePaymentIntent(it, stripeAccountId)
          } ?: handleNextActionPaymentIntentClientSecret?.let {
            retrievePaymentIntent(it, stripeAccountId)
          } ?: setupIntentClientSecret?.let {
            retrieveSetupIntent(it, stripeAccountId)
          } ?: handleNextActionSetupIntentClientSecret?.let {
            retrieveSetupIntent(it, stripeAccountId)
          } ?: throw Exception("Failed to create Payment Launcher. No client secret provided.")
        }
        is PaymentResult.Canceled -> {
          promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), message = null))
          removeFragment(context)
        }
        is PaymentResult.Failed -> {
          promise.resolve(
            createError(ConfirmPaymentErrorType.Failed.toString(), paymentResult.throwable),
          )
          removeFragment(context)
        }
      }
    }

  private fun retrieveSetupIntent(
    clientSecret: String,
    stripeAccountId: String?,
  ) {
    stripe.retrieveSetupIntent(
      clientSecret,
      stripeAccountId,
      expand = listOf("payment_method"),
      object : ApiResultCallback<SetupIntent> {
        override fun onError(e: Exception) {
          promise.resolve(createError(ConfirmSetupIntentErrorType.Failed.toString(), e))
          removeFragment(context)
        }

        override fun onSuccess(result: SetupIntent) {
          when (result.status) {
            StripeIntent.Status.Succeeded,
            StripeIntent.Status.Processing,
            StripeIntent.Status.RequiresConfirmation,
            StripeIntent.Status.RequiresCapture,
            -> {
              promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(result)))
            }
            StripeIntent.Status.RequiresAction -> {
              if (isNextActionSuccessState(result.nextActionType)) {
                promise.resolve(createResult("setupIntent", mapFromSetupIntentResult(result)))
              } else {
                (result.lastSetupError)?.let {
                  promise.resolve(
                    createError(ConfirmSetupIntentErrorType.Canceled.toString(), it),
                  )
                }
                  ?: run {
                    promise.resolve(
                      createError(
                        ConfirmSetupIntentErrorType.Canceled.toString(),
                        "Setup has been canceled",
                      ),
                    )
                  }
              }
            }
            StripeIntent.Status.RequiresPaymentMethod -> {
              promise.resolve(
                createError(
                  ConfirmSetupIntentErrorType.Failed.toString(),
                  result.lastSetupError,
                ),
              )
            }
            StripeIntent.Status.Canceled -> {
              promise.resolve(
                createError(
                  ConfirmSetupIntentErrorType.Canceled.toString(),
                  result.lastSetupError,
                ),
              )
            }
            else -> {
              promise.resolve(
                createError(
                  ConfirmSetupIntentErrorType.Unknown.toString(),
                  "unhandled error: ${result.status}",
                ),
              )
            }
          }
          removeFragment(context)
        }
      },
    )
  }

  private fun retrievePaymentIntent(
    clientSecret: String,
    stripeAccountId: String?,
  ) {
    stripe.retrievePaymentIntent(
      clientSecret,
      stripeAccountId,
      expand = listOf("payment_method"),
      object : ApiResultCallback<PaymentIntent> {
        override fun onError(e: Exception) {
          promise.resolve(createError(ConfirmPaymentErrorType.Failed.toString(), e))
          removeFragment(context)
        }

        override fun onSuccess(result: PaymentIntent) {
          when (result.status) {
            StripeIntent.Status.Succeeded,
            StripeIntent.Status.Processing,
            StripeIntent.Status.RequiresConfirmation,
            StripeIntent.Status.RequiresCapture,
            -> {
              promise.resolve(createResult("paymentIntent", mapFromPaymentIntentResult(result)))
            }
            StripeIntent.Status.RequiresAction -> {
              if (isNextActionSuccessState(result.nextActionType)) {
                promise.resolve(createResult("paymentIntent", mapFromPaymentIntentResult(result)))
              } else {
                (result.lastPaymentError)?.let {
                  promise.resolve(createError(ConfirmPaymentErrorType.Canceled.toString(), it))
                }
                  ?: run {
                    promise.resolve(
                      createError(
                        ConfirmPaymentErrorType.Canceled.toString(),
                        "The payment has been canceled",
                      ),
                    )
                  }
              }
            }
            StripeIntent.Status.RequiresPaymentMethod -> {
              promise.resolve(
                createError(ConfirmPaymentErrorType.Failed.toString(), result.lastPaymentError),
              )
            }
            StripeIntent.Status.Canceled -> {
              promise.resolve(
                createError(
                  ConfirmPaymentErrorType.Canceled.toString(),
                  result.lastPaymentError,
                ),
              )
            }
            else -> {
              promise.resolve(
                createError(
                  ConfirmPaymentErrorType.Unknown.toString(),
                  "unhandled error: ${result.status}",
                ),
              )
            }
          }
          removeFragment(context)
        }
      },
    )
  }

  /**
   * Check if paymentIntent.nextAction is out-of-band, such as voucher-based or waiting on customer
   * verification. If it is, then being in this state is considered "successful".
   */
  private fun isNextActionSuccessState(nextAction: StripeIntent.NextActionType?): Boolean =
    when (nextAction) {
      StripeIntent.NextActionType.DisplayOxxoDetails,
      StripeIntent.NextActionType.DisplayBoletoDetails,
      StripeIntent.NextActionType.DisplayKonbiniDetails,
      StripeIntent.NextActionType.VerifyWithMicrodeposits,
      StripeIntent.NextActionType.DisplayMultibancoDetails,
      -> true
      StripeIntent.NextActionType.RedirectToUrl,
      StripeIntent.NextActionType.UseStripeSdk,
      StripeIntent.NextActionType.AlipayRedirect,
      StripeIntent.NextActionType.BlikAuthorize,
      StripeIntent.NextActionType.WeChatPayRedirect,
      StripeIntent.NextActionType.UpiAwaitNotification,
      StripeIntent.NextActionType.CashAppRedirect,
      StripeIntent.NextActionType.SwishRedirect,
      null,
      -> false
    }
}
