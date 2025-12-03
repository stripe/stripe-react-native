package com.reactnativestripesdk

import android.annotation.SuppressLint
import androidx.activity.ComponentActivity
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.mapFromFinancialConnectionsEvent
import com.reactnativestripesdk.utils.mapFromPaymentIntentResult
import com.reactnativestripesdk.utils.mapFromSetupIntentResult
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.financialconnections.FinancialConnections
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.SetupIntent
import com.stripe.android.model.StripeIntent
import com.stripe.android.payments.bankaccount.CollectBankAccountConfiguration
import com.stripe.android.payments.bankaccount.CollectBankAccountLauncher
import com.stripe.android.payments.bankaccount.navigation.CollectBankAccountResult

@OptIn(ReactNativeSdkInternal::class)
class CollectBankAccountLauncherManager(
  context: ReactApplicationContext,
  private val publishableKey: String,
  private val stripeAccountId: String? = null,
  private val clientSecret: String,
  private val isPaymentIntent: Boolean,
  private val collectParams: CollectBankAccountConfiguration.USBankAccount,
) : StripeUIManager(context) {
  private lateinit var collectBankAccountLauncher: CollectBankAccountLauncher

  override fun onPresent() {
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return
    collectBankAccountLauncher = createBankAccountLauncher(activity)

    val stripeSdkModule: StripeSdkModule? = context.getNativeModule(StripeSdkModule::class.java)
    if (stripeSdkModule != null) {
      FinancialConnections.setEventListener { event ->
        val params = mapFromFinancialConnectionsEvent(event)
        stripeSdkModule.eventEmitter.emitOnFinancialConnectionsEvent(params)
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

  private fun createBankAccountLauncher(activity: ComponentActivity): CollectBankAccountLauncher =
    @SuppressLint("RestrictedApi")
    CollectBankAccountLauncher.create(activity, signal) { result ->
      when (result) {
        is CollectBankAccountResult.Completed -> {
          val intent = result.response.intent
          if (intent.status === StripeIntent.Status.RequiresPaymentMethod) {
            promise?.resolve(
              createError(ErrorType.Canceled.toString(), "Bank account collection was canceled."),
            )
          } else if (intent.status === StripeIntent.Status.RequiresConfirmation) {
            promise?.resolve(
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
          promise?.resolve(
            createError(ErrorType.Canceled.toString(), "Bank account collection was canceled."),
          )
        }

        is CollectBankAccountResult.Failed -> {
          promise?.resolve(createError(ErrorType.Failed.toString(), result.error))
        }
      }
    }
}
