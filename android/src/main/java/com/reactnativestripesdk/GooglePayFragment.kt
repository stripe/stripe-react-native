package com.reactnativestripesdk

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import com.google.android.gms.wallet.*
import com.stripe.android.GooglePayConfig

class GooglePayFragment : Fragment() {
  private var paymentsClient: PaymentsClient? = null

  companion object {
    const val LOAD_PAYMENT_DATA_REQUEST_CODE = 53
  }

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
    val readyToPayParams = arguments?.getString("readyToPayParams")

    val intent = Intent(ON_GOOGLE_PAY_FRAGMENT_CREATED)
    activity?.sendBroadcast(intent)

    initGooglePay(readyToPayParams!!, testEnv)
  }

  private fun initGooglePay(requestParams: String, testEnv: Boolean?) {
    val env = if (testEnv == true) WalletConstants.ENVIRONMENT_TEST else WalletConstants.ENVIRONMENT_PRODUCTION
    paymentsClient = Wallet.getPaymentsClient(
      requireActivity(),
      Wallet.WalletOptions.Builder()
        .setEnvironment(env)
        .build()
    )

    val request = IsReadyToPayRequest.fromJson(requestParams)
    paymentsClient!!.isReadyToPay(request)
      .addOnCompleteListener { task ->
        if (task.isSuccessful) {
          val intent = Intent(ON_INIT_GOOGLE_PAY)
          intent.putExtra("isReady", true)
          activity?.sendBroadcast(intent)
        } else {
          val intent = Intent(ON_INIT_GOOGLE_PAY)
          intent.putExtra("isReady", false)
          activity?.sendBroadcast(intent)
        }
      }
  }

  fun payWithGoogle(requestParams: String) {
    AutoResolveHelper.resolveTask(
      paymentsClient?.loadPaymentData(PaymentDataRequest.fromJson(requestParams)),
      requireActivity(),
      LOAD_PAYMENT_DATA_REQUEST_CODE
    );
  }

  fun getTokenizationSpecification(): String {
    return GooglePayConfig(requireActivity()).tokenizationSpecification.toString()
  }
}
