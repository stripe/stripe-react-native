package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.res.ColorStateList
import android.widget.FrameLayout
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.google.android.material.shape.CornerFamily
import com.google.android.material.shape.MaterialShapeDrawable
import com.google.android.material.shape.ShapeAppearanceModel
import com.reactnativestripesdk.utils.getIntOr
import com.reactnativestripesdk.utils.getIntOrNull
import com.reactnativestripesdk.utils.getValOr
import com.stripe.android.databinding.StripeBecsDebitWidgetBinding
import com.stripe.android.model.PaymentMethodCreateParams
import com.stripe.android.view.BecsDebitWidget
import com.stripe.android.view.StripeEditText

@SuppressLint("ViewConstructor")
class AuBECSDebitFormView(
  private val context: ThemedReactContext,
) : FrameLayout(context) {
  private lateinit var becsDebitWidget: BecsDebitWidget
  private var formStyle: ReadableMap? = null

  fun setCompanyName(name: String?) {
    becsDebitWidget = BecsDebitWidget(context = context, companyName = name as String)

    setFormStyle(this.formStyle)
    addView(becsDebitWidget)
    setListeners()
  }

  fun setFormStyle(value: ReadableMap?) {
    this.formStyle = value
    if (!this::becsDebitWidget.isInitialized || value == null) {
      return
    }
    val binding = StripeBecsDebitWidgetBinding.bind(becsDebitWidget)
    val textColor = getValOr(value, "textColor", null)
    val textErrorColor = getValOr(value, "textErrorColor", null)
    val placeholderColor = getValOr(value, "placeholderColor", null)
    val fontSize = value.getIntOrNull("fontSize")
    val borderWidth = value.getIntOrNull("borderWidth")
    val backgroundColor = getValOr(value, "backgroundColor", null)
    val borderColor = getValOr(value, "borderColor", null)
    val borderRadius = value.getIntOr("borderRadius", 0)

    textColor?.let {
      val color = it.toColorInt()
      (binding.accountNumberEditText as StripeEditText).setTextColor(color)
      (binding.bsbEditText as StripeEditText).setTextColor(color)
      (binding.emailEditText as StripeEditText).setTextColor(color)
      (binding.nameEditText).setTextColor(color)
    }

    textErrorColor?.let {
      val color = it.toColorInt()
      (binding.accountNumberEditText as StripeEditText).setErrorColor(color)
      (binding.bsbEditText as StripeEditText).setErrorColor(color)
      (binding.emailEditText as StripeEditText).setErrorColor(color)
      (binding.nameEditText).setErrorColor(color)
    }

    placeholderColor?.let {
      val color = it.toColorInt()
      (binding.accountNumberEditText as StripeEditText).setHintTextColor(color)
      (binding.bsbEditText as StripeEditText).setHintTextColor(color)
      (binding.emailEditText as StripeEditText).setHintTextColor(color)
      (binding.nameEditText).setHintTextColor(color)
    }

    fontSize?.let {
      (binding.accountNumberEditText as StripeEditText).textSize = it.toFloat()
      (binding.bsbEditText as StripeEditText).textSize = it.toFloat()
      (binding.emailEditText as StripeEditText).textSize = it.toFloat()
      (binding.nameEditText).textSize = it.toFloat()
    }

    becsDebitWidget.background =
      MaterialShapeDrawable(
        ShapeAppearanceModel()
          .toBuilder()
          .setAllCorners(CornerFamily.ROUNDED, (borderRadius * 2).toFloat())
          .build(),
      ).also { shape ->
        shape.strokeWidth = 0.0f
        shape.strokeColor = ColorStateList.valueOf("#000000".toColorInt())
        shape.fillColor = ColorStateList.valueOf("#FFFFFF".toColorInt())
        borderWidth?.let { shape.strokeWidth = (it * 2).toFloat() }
        borderColor?.let { shape.strokeColor = ColorStateList.valueOf(it.toColorInt()) }
        backgroundColor?.let {
          shape.fillColor = ColorStateList.valueOf(it.toColorInt())
        }
      }
  }

  fun onFormChanged(params: PaymentMethodCreateParams) {
    val billingDetails = params.toParamMap()["billing_details"] as HashMap<*, *>
    val auBecsDebit = params.toParamMap()["au_becs_debit"] as HashMap<*, *>

    val formDetails: MutableMap<String, Any> =
      mutableMapOf(
        "accountNumber" to auBecsDebit["account_number"] as String,
        "bsbNumber" to auBecsDebit["bsb_number"] as String,
        "name" to billingDetails["name"] as String,
        "email" to billingDetails["email"] as String,
      )

    UIManagerHelper.getEventDispatcherForReactTag(context, id)?.dispatchEvent(FormCompleteEvent(context.surfaceId, id, formDetails))
  }

  private fun setListeners() {
    becsDebitWidget.validParamsCallback =
      object : BecsDebitWidget.ValidParamsCallback {
        override fun onInputChanged(isValid: Boolean) {
          becsDebitWidget.params?.let { params -> onFormChanged(params) }
        }
      }
  }
}
