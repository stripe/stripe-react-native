package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.StripeFragment
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.mapFromFinancialConnectionsEvent
import com.reactnativestripesdk.utils.mapFromPaymentIntentResult
import com.reactnativestripesdk.utils.mapFromSetupIntentResult
import com.reactnativestripesdk.utils.removeFragment
import com.stripe.android.financialconnections.FinancialConnections
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.SetupIntent
import com.stripe.android.model.StripeIntent
import com.stripe.android.payments.bankaccount.CollectBankAccountConfiguration
import com.stripe.android.payments.bankaccount.CollectBankAccountLauncher
import com.stripe.android.payments.bankaccount.navigation.CollectBankAccountResult

class CollectBankAccountLauncherFragment : StripeFragment() {
  private lateinit var context: ReactApplicationContext
  private lateinit var publishableKey: String
  private var stripeAccountId: String? = null
  private lateinit var clientSecret: String
  private var isPaymentIntent: Boolean = false
  private lateinit var collectParams: CollectBankAccountConfiguration.USBankAccount
  private lateinit var promise: Promise
  private lateinit var collectBankAccountLauncher: CollectBankAccountLauncher

  override fun prepare() {
    collectBankAccountLauncher = createBankAccountLauncher()

    val stripeSdkModule: StripeSdkModule? = context.getNativeModule(StripeSdkModule::class.java)
    if (stripeSdkModule != null) {
      FinancialConnections.setEventListener { event ->
        val params = mapFromFinancialConnectionsEvent(event)
        stripeSdkModule.emitOnFinancialConnectionsEvent(params)
      }
    }

    if (isPaymentIntent) {
      collectBankAccountLauncher.presentWithPaymentIntent(
        publishableKey,
        stripeAccountId,
        clientSecret,
        collectParams,
      )
    } else {
      collectBankAccountLauncher.presentWithSetupIntent(
        publishableKey,
        stripeAccountId,
        clientSecret,
        collectParams,
      )
    }
  }

  override fun onDestroy() {
    super.onDestroy()

    // Remove any event listener that might be set
    FinancialConnections.clearEventListener()
  }

  private fun createBankAccountLauncher(): CollectBankAccountLauncher =
    CollectBankAccountLauncher.create(this) { result ->
      when (result) {
        is CollectBankAccountResult.Completed -> {
          val intent = result.response.intent
          if (intent.status === StripeIntent.Status.RequiresPaymentMethod) {
            promise.resolve(
              createError(ErrorType.Canceled.toString(), "Bank account collection was canceled."),
            )
          } else if (intent.status === StripeIntent.Status.RequiresConfirmation) {
            promise.resolve(
              if (isPaymentIntent) {
                createResult(
                  "paymentIntent",
                  mapFromPaymentIntentResult(intent as PaymentIntent),
                )
              } else {
                createResult("setupIntent", mapFromSetupIntentResult(intent as SetupIntent))
              },
            )
          }
        }

        is CollectBankAccountResult.Cancelled -> {
          promise.resolve(
            createError(ErrorType.Canceled.toString(), "Bank account collection was canceled."),
          )
        }

        is CollectBankAccountResult.Failed -> {
          promise.resolve(createError(ErrorType.Failed.toString(), result.error))
        }
      }
      removeFragment(context)
    }

  companion object {
    internal const val TAG = "collect_bank_account_launcher_fragment"

    fun create(
      context: ReactApplicationContext,
      publishableKey: String,
      stripeAccountId: String? = null,
      clientSecret: String,
      isPaymentIntent: Boolean,
      collectParams: CollectBankAccountConfiguration.USBankAccount,
      promise: Promise,
    ): CollectBankAccountLauncherFragment {
      val instance = CollectBankAccountLauncherFragment()
      instance.context = context
      instance.publishableKey = publishableKey
      instance.stripeAccountId = stripeAccountId
      instance.clientSecret = clientSecret
      instance.isPaymentIntent = isPaymentIntent
      instance.collectParams = collectParams
      instance.promise = promise
      return instance
    }
  }
}
