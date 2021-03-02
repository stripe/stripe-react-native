package com.reactnativestripesdk

import android.os.Bundle
import android.util.Log
import android.view.Window
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.paymentsheet.PaymentOptionCallback
import com.stripe.android.paymentsheet.PaymentResult
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheet.FlowController
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import com.stripe.android.paymentsheet.model.PaymentOption

internal class PaymentSheetActivity : AppCompatActivity() {
  private var paymentSheet: PaymentSheet? = null
  private var flowController: FlowController? = null

  private val paymentResultCallback = object : PaymentSheetResultCallback {
    override fun onPaymentResult(paymentResult: PaymentResult) {
      finish()
      paymentSheet = null
      flowController = null
      when (paymentResult) {
        is PaymentResult.Canceled -> {
        }
        is PaymentResult.Failed -> {
        }
        is PaymentResult.Completed -> {
        }
      }
    }
  }

  private val paymentOptionCallback = object : PaymentOptionCallback {
    override fun onPaymentOption(paymentOption: PaymentOption?) {
      if (paymentOption != null) {
        val option: WritableMap = WritableNativeMap()
        option.putString("label", paymentOption?.label)
        option.putInt("image", paymentOption?.drawableResourceId)
      } else {
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    overridePendingTransition(0, 0)

    paymentSheet = PaymentSheet(this, paymentResultCallback)
    flowController = FlowController.create(this, paymentOptionCallback, paymentResultCallback)

    paymentSheet?.present("pi_1IQJeJJICD58aXTF1ealAESP_secret_ELfRhDS6wgPGR3CiWCqWorfPl")
  }
}
