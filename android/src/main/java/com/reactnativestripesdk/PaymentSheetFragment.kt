package com.reactnativestripesdk

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import com.stripe.android.paymentsheet.PaymentOptionCallback
import com.stripe.android.paymentsheet.PaymentResult
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import com.stripe.android.paymentsheet.model.PaymentOption

class PaymentSheetFragment : Fragment() {
  private var paymentSheet: PaymentSheet? = null
  private var flowController: PaymentSheet.FlowController? = null
  private lateinit var paymentSheetConfiguration: PaymentSheet.Configuration

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
    val merchantDisplayName = arguments?.getString("merchantDisplayName").orEmpty()
    val customerId = arguments?.getString("customerId").orEmpty()
    val customerEphemeralKeySecret = arguments?.getString("customerEphemeralKeySecret").orEmpty()
    val paymentIntentClientSecret = arguments?.getString("paymentIntentClientSecret").orEmpty()

    val paymentOptionCallback = object: PaymentOptionCallback {
      override fun onPaymentOption(paymentOption: PaymentOption?) {
        val intent = Intent(ON_PAYMENT_OPTION_ACTION)

        if (paymentOption != null) {
          intent.putExtra("label", paymentOption.label)
          intent.putExtra("drawableResourceId", paymentOption.drawableResourceId)
        }
        activity?.sendBroadcast(intent)
      }
    }

    val paymentResultCallback = object : PaymentSheetResultCallback {
      override fun onPaymentResult(paymentResult: PaymentResult) {
        val intent = Intent(ON_PAYMENT_RESULT_ACTION)

        intent.putExtra("paymentResult", paymentResult)
          activity?.sendBroadcast(intent)
      }
    }

    this.paymentSheetConfiguration = PaymentSheet.Configuration(
      merchantDisplayName = merchantDisplayName,
      customer = PaymentSheet.CustomerConfiguration(
        id = customerId,
        ephemeralKeySecret = customerEphemeralKeySecret
      )
    )

    if (arguments?.getBoolean("customFlow") == true) {
      flowController = PaymentSheet.FlowController.create(this, paymentOptionCallback, paymentResultCallback)
      configureFlowController(paymentIntentClientSecret)
    } else {
      paymentSheet = PaymentSheet(this, paymentResultCallback)
    }

    val intent = Intent(ON_FRAGMENT_CREATED)
    activity?.sendBroadcast(intent)
  }

  fun present(clientSecret: String) {
    paymentSheet?.present(clientSecret)
  }

  fun presentPaymentOptions() {
    flowController?.presentPaymentOptions()
  }

  fun confirmPayment() {
    flowController?.confirmPayment()
  }

  private fun configureFlowController(paymentIntentClientSecret: String) {
    val onFlowControllerConfigure = object : PaymentSheet.FlowController.ConfigCallback {
      override fun onConfigured(success: Boolean, error: Throwable?) {
        val paymentOption = flowController?.getPaymentOption()
        val intent = Intent(ON_CONFIGURE_FLOW_CONTROLLER)

        if (paymentOption != null) {
          intent.putExtra("label", paymentOption.label)
          intent.putExtra("drawableResourceId", paymentOption.drawableResourceId)
        }
        activity?.sendBroadcast(intent)
      }
    }

    flowController?.configure(
      paymentIntentClientSecret = paymentIntentClientSecret,
      configuration = this.paymentSheetConfiguration,
      callback = onFlowControllerConfigure
    )
  }
}
