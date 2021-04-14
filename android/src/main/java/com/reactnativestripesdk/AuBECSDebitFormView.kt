package com.reactnativestripesdk

import android.content.res.ColorStateList
import android.graphics.Color
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.EventDispatcher
import com.stripe.android.databinding.CardInputWidgetBinding
import com.google.android.material.shape.CornerFamily
import com.google.android.material.shape.MaterialShapeDrawable
import com.google.android.material.shape.ShapeAppearanceModel
import com.stripe.android.databinding.BecsDebitWidgetBinding
import com.stripe.android.model.PaymentMethodCreateParams
import com.stripe.android.view.BecsDebitWidget
import com.stripe.android.view.CardInputListener
import com.stripe.android.view.CardInputWidget
import com.stripe.android.view.StripeEditText

class AuBECSDebitFormView(private val context: ThemedReactContext) : FrameLayout(context) {
  private lateinit var becsDebitWidget: BecsDebitWidget
  private var mEventDispatcher: EventDispatcher? = context.getNativeModule(UIManagerModule::class.java)?.eventDispatcher
  private var formStyle: ReadableMap? = null

  fun setCompanyName(name: String?) {
    becsDebitWidget = BecsDebitWidget(context = context, companyName = name as String);

//    setFormStyle(this.formStyle)
    addView(becsDebitWidget)
    setListeners()
  }

  fun setFormStyle(value: ReadableMap?) {
    this.formStyle = value
    if (!this::becsDebitWidget.isInitialized || value == null) {
      return
    }
    val binding = BecsDebitWidgetBinding.bind(becsDebitWidget)
    val textColor = getValOr(value, "textColor")
    val textErrorColor = getValOr(value, "textErrorColor")
    val placeholderColor = getValOr(value, "placeholderColor")
    val fontSize = getIntOrNull(value, "fontSize")

    textColor?.let {
      (binding.accountNumberEditText as StripeEditText).setTextColor(Color.parseColor(it))
      (binding.bsbEditText as StripeEditText).setTextColor(Color.parseColor(it))
      (binding.emailEditText as StripeEditText).setTextColor(Color.parseColor(it))
      (binding.nameEditText).setTextColor(Color.parseColor(it))
    }

    textErrorColor?.let {
      (binding.accountNumberEditText as StripeEditText).setErrorColor(Color.parseColor(it))
      (binding.bsbEditText as StripeEditText).setErrorColor(Color.parseColor(it))
      (binding.emailEditText as StripeEditText).setErrorColor(Color.parseColor(it))
      (binding.nameEditText).setErrorColor(Color.parseColor(it))
    }

    placeholderColor?.let {
      (binding.accountNumberEditText as StripeEditText).setHintTextColor(Color.parseColor(it))
      (binding.bsbEditText as StripeEditText).setHintTextColor(Color.parseColor(it))
      (binding.emailEditText as StripeEditText).setHintTextColor(Color.parseColor(it))
      (binding.nameEditText).setHintTextColor(Color.parseColor(it))
    }

    fontSize?.let {
      (binding.accountNumberEditText as StripeEditText).textSize = it.toFloat()
      (binding.bsbEditText as StripeEditText).textSize = it.toFloat()
      (binding.emailEditText as StripeEditText).textSize = it.toFloat()
      (binding.nameEditText).textSize = it.toFloat()
    }
  }


  fun onCardChanged(params: PaymentMethodCreateParams) {
    val billingDetails = params.toParamMap()["billing_details"] as HashMap<*, *>
    val auBecsDebit = params.toParamMap()["au_becs_debit"] as HashMap<*, *>

    val formDetails: MutableMap<String, Any> = mutableMapOf(
      "accountNumber" to auBecsDebit["account_number"] as String,
      "bsbNumber" to auBecsDebit["bsb_number"] as String,
      "name" to billingDetails["name"] as String,
      "email" to billingDetails["email"] as String
    )

    mEventDispatcher?.dispatchEvent(
      FormCompleteEvent(id, formDetails))
  }

  private fun setListeners() {
    becsDebitWidget?.validParamsCallback =
      object : BecsDebitWidget.ValidParamsCallback {
        override fun onInputChanged(isValid: Boolean) {
          becsDebitWidget?.params?.let { params ->
            onCardChanged(params)
          }
        }
      }
  }
}
