package com.reactnativestripesdk

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.GooglePayErrorType
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntOrNull
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayLauncher

@OptIn(ReactNativeSdkInternal::class)
class GooglePayLauncherManager(
  context: ReactApplicationContext,
  private val clientSecret: String,
  private val mode: Mode,
  googlePayParams: ReadableMap,
  private val callback: (GooglePayLauncher.Result?, error: WritableMap?) -> Unit,
) : StripeUIManager(context) {
  enum class Mode {
    ForSetup,
    ForPayment,
  }

  private var launcher: GooglePayLauncher? = null
  private var configuration =
    GooglePayLauncher.Config(
      environment =
        if (googlePayParams.getBooleanOr("testEnv", false)) {
          GooglePayEnvironment.Test
        } else {
          GooglePayEnvironment.Production
        },
      merchantCountryCode = googlePayParams.getString("merchantCountryCode").orEmpty(),
      merchantName = googlePayParams.getString("merchantName").orEmpty(),
      isEmailRequired = googlePayParams.getBooleanOr("isEmailRequired", false),
      billingAddressConfig =
        buildBillingAddressParameters(googlePayParams.getMap("billingAddressConfig")),
      existingPaymentMethodRequired =
        googlePayParams.getBooleanOr("existingPaymentMethodRequired", false),
      allowCreditCards = googlePayParams.getBooleanOr("allowCreditCards", true),
    )
  private var currencyCode = googlePayParams.getString("currencyCode") ?: "USD"
  private var amount = googlePayParams.getIntOrNull("amount")
  private var label = googlePayParams.getString("label")

  override fun onPresent() {
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return
    @SuppressLint("RestrictedApi")
    launcher =
      GooglePayLauncher(
        activity = activity,
        signal = signal,
        config = configuration,
        readyCallback = ::onGooglePayReady,
        resultCallback = ::onGooglePayResult,
      )
  }

  private fun onGooglePayReady(isReady: Boolean) {
    if (isReady) {
      when (mode) {
        Mode.ForSetup -> {
          launcher?.presentForSetupIntent(clientSecret, currencyCode, amount?.toLong(), label)
        }
        Mode.ForPayment -> {
          launcher?.presentForPaymentIntent(clientSecret, label)
        }
      }
    } else {
      callback(
        null,
        createError(
          GooglePayErrorType.Failed.toString(),
          "Google Pay is not available on this device. You can use isPlatformPaySupported to preemptively check for Google Pay support.",
        ),
      )
    }
  }

  private fun onGooglePayResult(result: GooglePayLauncher.Result) {
    callback(result, null)
  }

  companion object {
    private fun buildBillingAddressParameters(params: ReadableMap?): GooglePayLauncher.BillingAddressConfig {
      val isRequired = params?.getBooleanOr("isRequired", false)
      val isPhoneNumberRequired = params?.getBooleanOr("isPhoneNumberRequired", false)
      val format =
        when (params?.getString("format").orEmpty()) {
          "FULL" -> GooglePayLauncher.BillingAddressConfig.Format.Full
          "MIN" -> GooglePayLauncher.BillingAddressConfig.Format.Min
          else -> GooglePayLauncher.BillingAddressConfig.Format.Min
        }

      return GooglePayLauncher.BillingAddressConfig(
        isRequired = isRequired ?: false,
        format = format,
        isPhoneNumberRequired = isPhoneNumberRequired ?: false,
      )
    }
  }
}
