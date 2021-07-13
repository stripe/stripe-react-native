package com.reactnativestripesdk

import android.content.res.ColorStateList
import android.graphics.Color
import android.widget.FrameLayout
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.EventDispatcher
import com.google.android.material.shape.MaterialShapeDrawable
import com.stripe.android.databinding.StripeCardFormViewBinding
import com.stripe.android.model.PaymentMethodCreateParams
import com.stripe.android.view.CardFormView

class CardFormView(private val context: ThemedReactContext) : FrameLayout(context) {
  private var mCardWidget: CardFormView = CardFormView(context)
  private var mEventDispatcher: EventDispatcher? = context.getNativeModule(UIManagerModule::class.java)?.eventDispatcher
  private var dangerouslyGetFullCardDetails: Boolean = false
  var cardParams: PaymentMethodCreateParams.Card? = null

  init {
    val binding = StripeCardFormViewBinding.bind(mCardWidget)
    binding.cardMultilineWidget.setShouldShowPostalCode(false)
    binding.cardMultilineWidgetContainer.isFocusable = true
    binding.cardMultilineWidgetContainer.isFocusableInTouchMode = true
    binding.cardMultilineWidgetContainer.requestFocus()

    addView(mCardWidget)
    setListeners()

    viewTreeObserver.addOnGlobalLayoutListener { requestLayout() }
  }

  fun setAutofocus(value: Boolean) {
    if (value) {
      val binding = StripeCardFormViewBinding.bind(mCardWidget)
      binding.cardMultilineWidget.requestFocus()
      binding.cardMultilineWidget.showSoftKeyboard()
    }
  }

  fun requestFocusFromJS() {
    val binding = StripeCardFormViewBinding.bind(mCardWidget)
    binding.cardMultilineWidget.requestFocus()
    binding.cardMultilineWidget.showSoftKeyboard()
  }

  fun requestBlurFromJS() {
    val binding = StripeCardFormViewBinding.bind(mCardWidget)
    binding.cardMultilineWidget.hideSoftKeyboard()
    binding.cardMultilineWidget.clearFocus()
    binding.cardMultilineWidgetContainer.requestFocus()
  }

  fun setCardStyle(value: ReadableMap) {
    val binding = StripeCardFormViewBinding.bind(mCardWidget)
    val backgroundColor = getValOr(value, "backgroundColor", null)

    binding.cardMultilineWidgetContainer.background = MaterialShapeDrawable().also { shape ->
      shape.fillColor = ColorStateList.valueOf(Color.parseColor("#FFFFFF"))
      backgroundColor?.let {
        shape.fillColor = ColorStateList.valueOf(Color.parseColor(it))
      }
    }
  }

  fun setDangerouslyGetFullCardDetails(isEnabled: Boolean) {
    dangerouslyGetFullCardDetails = isEnabled
  }

  private fun setListeners() {
    mCardWidget.setCardValidCallback { isValid, _ ->
      if (isValid) {
        mCardWidget.cardParams?.let {
          val cardParamsMap = it.toParamMap()["card"] as HashMap<*, *>
          val cardDetails: MutableMap<String, Any> = mutableMapOf(
            "expiryMonth" to cardParamsMap["exp_month"] as Int,
            "expiryYear" to cardParamsMap["exp_year"] as Int,
            "last4" to it.last4,
            "brand" to mapCardBrand(it.brand),
            "postalCode" to (it.address?.postalCode ?: ""),
            "country" to (it.address?.country ?: "")
          )

          if (dangerouslyGetFullCardDetails) {
            cardDetails["number"] = cardParamsMap["number"] as String
          }

          mEventDispatcher?.dispatchEvent(
            CardFormCompleteEvent(id, cardDetails, isValid, dangerouslyGetFullCardDetails))

          val binding = StripeCardFormViewBinding.bind(mCardWidget)
          binding.cardMultilineWidget.paymentMethodCard?.let { params -> cardParams = params }
        }
      } else {
        cardParams = null
      }
    }
  }

  override fun requestLayout() {
    super.requestLayout()
    post(mLayoutRunnable)
  }

  private val mLayoutRunnable = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    layout(left, top, right, bottom)
  }
}
