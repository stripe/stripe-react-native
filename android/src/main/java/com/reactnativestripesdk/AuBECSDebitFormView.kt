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

class AuBECSDebitFormView(private val context: ThemedReactContext) : FrameLayout(context) {
  private lateinit var becsDebitWidget: BecsDebitWidget
  private var mEventDispatcher: EventDispatcher? = context.getNativeModule(UIManagerModule::class.java)?.eventDispatcher

  fun setCompanyName(name: String?) {
    becsDebitWidget = BecsDebitWidget(context = context, companyName = name as String);

    addView(becsDebitWidget)

    setFormStyle()
    setListeners()
  }


  fun setFormStyle() {
    val binding = BecsDebitWidgetBinding.bind(becsDebitWidget)
//    val textColor = getValOr(value, "textColor")


      binding.accountNumberEditText.setTextColor(Color.parseColor("#c0c0c0"))

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
