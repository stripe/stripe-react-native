package com.reactnativestripesdk

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import com.facebook.react.bridge.ReadableMap
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayLauncher
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher

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
    val createPaymentMethod = arguments?.getBoolean("createPaymentMethod")
    val merchantName = arguments?.getString("merchantName").orEmpty()
    val countryCode = arguments?.getString("countryCode").orEmpty()

    if (createPaymentMethod == true) {
      googlePayMethodLauncher = GooglePayPaymentMethodLauncher(
        fragment = this,
        config = GooglePayPaymentMethodLauncher.Config(
          environment = if (testEnv == true) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
          merchantCountryCode = "FR",
          merchantName = "Widget Store"
        ),
        readyCallback = ::onGooglePayReady,
        resultCallback = ::onGooglePayResult
      )
    } else {
      googlePayLauncher = GooglePayLauncher(
        fragment = this,
        config = GooglePayLauncher.Config(
          environment = if (testEnv == true) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
          merchantCountryCode = countryCode,
          merchantName = merchantName
        ),
        readyCallback = ::onGooglePayReady,
        resultCallback = ::onGooglePayResult
      )
    }

    val intent = Intent(ON_GOOGLE_PAY_FRAGMENT_CREATED)
    activity?.sendBroadcast(intent)
  }

  fun payWithGoogle(clientSecret: String) {
    if (googlePayLauncher == null) {
      val intent = Intent(ON_GOOGLE_PAY_RESULT)
      intent.putExtra("error", "GooglePayLauncher is not initialized. Please make sure that createPaymentMethod option is set to false")
      activity?.sendBroadcast(intent)
      return
    }
    googlePayLauncher?.presentForPaymentIntent(clientSecret)
  }

  fun createPaymentMethod(currencyCode: String, amount: Int) {
    if (googlePayMethodLauncher == null) {
      val intent = Intent(ON_GOOGLE_PAYMENT_METHOD_RESULT)
      intent.putExtra("error", "GooglePayPaymentMethodLauncher is not initialized. Please make sure that createPaymentMethod option is set to true")
      activity?.sendBroadcast(intent)
      return
    }
    googlePayMethodLauncher?.present(
      currencyCode = currencyCode,
      amount = amount
    )
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
}
