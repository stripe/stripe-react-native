package com.reactnativestripesdk

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayLauncher
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher
import com.stripe.android.model.StripeIntent

class GooglePayFragment : Fragment() {
  private var googlePayLauncher: GooglePayLauncher? = null
  private var googlePayMethodLauncher: GooglePayPaymentMethodLauncher? = null

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    return FrameLayout(requireActivity()).also {
      it.visibility = View.GONE
    }
  }

  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    val testEnv = arguments?.getBoolean("testEnv")
    val merchantName = arguments?.getString("merchantName").orEmpty()
    val countryCode = arguments?.getString("countryCode").orEmpty()
    val isEmailRequired = arguments?.getBoolean("isEmailRequired") ?: false
    val existingPaymentMethodRequired = arguments?.getBoolean("existingPaymentMethodRequired") ?: false

    val billingAddressConfigBundle = arguments?.getBundle("billingAddressConfig") ?: Bundle()
    val isRequired = billingAddressConfigBundle.getBoolean("isRequired")
    val formatString = billingAddressConfigBundle.getString("format").orEmpty()
    val isPhoneNumberRequired = billingAddressConfigBundle.getBoolean("isPhoneNumberRequired")

    val billingAddressConfig = mapToGooglePayPaymentMethodLauncherBillingAddressConfig(formatString, isRequired, isPhoneNumberRequired)

    googlePayMethodLauncher = GooglePayPaymentMethodLauncher(
      fragment = this,
      config = GooglePayPaymentMethodLauncher.Config(
        environment = if (testEnv == true) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
        merchantCountryCode = countryCode,
        merchantName = merchantName,
        billingAddressConfig = billingAddressConfig,
        isEmailRequired = isEmailRequired,
        existingPaymentMethodRequired = existingPaymentMethodRequired
      ),
      readyCallback = ::onGooglePayReady,
      resultCallback = ::onGooglePayResult
    )

    val paymentMethodBillingAddressConfig = mapToGooglePayLauncherBillingAddressConfig(formatString, isRequired, isPhoneNumberRequired)
    googlePayLauncher = GooglePayLauncher(
      fragment = this,
      config = GooglePayLauncher.Config(
        environment = if (testEnv == true) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
        merchantCountryCode = countryCode,
        merchantName = merchantName,
        billingAddressConfig = paymentMethodBillingAddressConfig,
        isEmailRequired = isEmailRequired,
        existingPaymentMethodRequired = existingPaymentMethodRequired
      ),
      readyCallback = ::onGooglePayReady,
      resultCallback = ::onGooglePayResult
    )

    val intent = Intent(ON_GOOGLE_PAY_FRAGMENT_CREATED)
    activity?.sendBroadcast(intent)
  }

  fun presentForPaymentIntent(clientSecret: String) {
    val launcher = googlePayLauncher ?: run {
      val intent = Intent(ON_GOOGLE_PAY_RESULT)
      intent.putExtra("error", "GooglePayLauncher is not initialized.")
      activity?.sendBroadcast(intent)
      return
    }
    runCatching {
      launcher.presentForPaymentIntent(clientSecret)
    }.onFailure {
      val intent = Intent(ON_GOOGLE_PAY_RESULT)
      intent.putExtra("error", it.localizedMessage)
      activity?.sendBroadcast(intent)
    }
  }

  fun presentForSetupIntent(clientSecret: String, currencyCode: String) {
    val launcher = googlePayLauncher ?: run {
      val intent = Intent(ON_GOOGLE_PAY_RESULT)
      intent.putExtra("error", "GooglePayLauncher is not initialized.")
      activity?.sendBroadcast(intent)
      return
    }
    runCatching {
      launcher.presentForSetupIntent(clientSecret, currencyCode)
    }.onFailure {
      val intent = Intent(ON_GOOGLE_PAY_RESULT)
      intent.putExtra("error", it.localizedMessage)
      activity?.sendBroadcast(intent)
    }
  }

  fun createPaymentMethod(currencyCode: String, amount: Int) {
    val launcher = googlePayMethodLauncher ?: run {
      val intent = Intent(ON_GOOGLE_PAYMENT_METHOD_RESULT)
      intent.putExtra("error", "GooglePayPaymentMethodLauncher is not initialized.")
      activity?.sendBroadcast(intent)
      return
    }

    runCatching {
      launcher.present(
        currencyCode = currencyCode,
        amount = amount
      )
    }.onFailure {
      val intent = Intent(ON_GOOGLE_PAYMENT_METHOD_RESULT)
      intent.putExtra("error", it.localizedMessage)
      activity?.sendBroadcast(intent)
    }
  }

  private fun onGooglePayReady(isReady: Boolean) {
    val intent = Intent(ON_INIT_GOOGLE_PAY)
    intent.putExtra("isReady", isReady)
    activity?.sendBroadcast(intent)
  }

  private fun onGooglePayResult(result: GooglePayLauncher.Result) {
    val intent = Intent(ON_GOOGLE_PAY_RESULT)
    intent.putExtra("paymentResult", result)
    activity?.sendBroadcast(intent)
  }

  private fun onGooglePayResult(result: GooglePayPaymentMethodLauncher.Result) {
    val intent = Intent(ON_GOOGLE_PAYMENT_METHOD_RESULT)
    intent.putExtra("paymentResult", result)
    activity?.sendBroadcast(intent)
  }

  private fun mapToGooglePayLauncherBillingAddressConfig(formatString: String, isRequired: Boolean, isPhoneNumberRequired: Boolean): GooglePayLauncher.BillingAddressConfig {
    val format = when (formatString) {
      "FULL" -> GooglePayLauncher.BillingAddressConfig.Format.Full
      "MIN" -> GooglePayLauncher.BillingAddressConfig.Format.Min
      else -> GooglePayLauncher.BillingAddressConfig.Format.Min
    }
    return GooglePayLauncher.BillingAddressConfig(
      isRequired = isRequired,
      format = format,
      isPhoneNumberRequired = isPhoneNumberRequired
    )
  }

  private fun mapToGooglePayPaymentMethodLauncherBillingAddressConfig(formatString: String, isRequired: Boolean, isPhoneNumberRequired: Boolean): GooglePayPaymentMethodLauncher.BillingAddressConfig {
    val format = when (formatString) {
      "FULL" -> GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Full
      "MIN" -> GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Min
      else -> GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Min
    }
    return GooglePayPaymentMethodLauncher.BillingAddressConfig(
      isRequired = isRequired,
      format = format,
      isPhoneNumberRequired = isPhoneNumberRequired
    )
  }
}
