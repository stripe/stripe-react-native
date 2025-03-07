package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.google.android.gms.wallet.button.ButtonConstants.ButtonTheme
import com.google.android.gms.wallet.button.ButtonConstants.ButtonType
import com.google.android.gms.wallet.button.ButtonOptions
import com.google.android.gms.wallet.button.PayButton
import com.stripe.android.GooglePayJsonFactory
import org.json.JSONArray

@SuppressLint("ViewConstructor")
class GooglePayButtonView(
  private val context: ThemedReactContext,
) : FrameLayout(context) {
  private var type: Int? = null
  private var appearance: Int? = null
  private var borderRadius: Int = 4 // Matches the default on iOS's ApplePayButton
  private var button: PayButton? = null

  fun initialize() {
    if (button != null) {
      removeView(button)
    }
    button = configureGooglePayButton()
    addView(button)
    viewTreeObserver.addOnGlobalLayoutListener { requestLayout() }
  }

  private fun configureGooglePayButton(): PayButton {
    val googlePayButton =
      PayButton(
        context,
      )
    googlePayButton.initialize(buildButtonOptions())
    googlePayButton.setOnClickListener { _ ->
      // Call the Javascript TouchableOpacity parent where the onClick handler is set
      (this.parent as? View)?.performClick() ?: run {
        Log.e("StripeReactNative", "Unable to find parent of GooglePayButtonView.")
      }
    }
    return googlePayButton
  }

  @SuppressLint("RestrictedApi")
  private fun buildButtonOptions(): ButtonOptions {
    val allowedPaymentMethods =
      JSONArray()
        .put(
          GooglePayJsonFactory(context).createCardPaymentMethod(
            billingAddressParameters = null,
            allowCreditCards = null,
          ),
        ).toString()

    val options =
      ButtonOptions
        .newBuilder()
        .setAllowedPaymentMethods(allowedPaymentMethods)

    getButtonType()?.let {
      options.setButtonType(it)
    }

    getButtonTheme()?.let {
      options.setButtonTheme(it)
    }

    options.setCornerRadius(PixelUtil.toPixelFromDIP(this.borderRadius.toDouble()).toInt())

    return options.build()
  }

  private fun getButtonType(): Int? =
    when (this.type) {
      0,
      1,
      -> ButtonType.BUY
      6 -> ButtonType.BOOK
      5 -> ButtonType.CHECKOUT
      4 -> ButtonType.DONATE
      11 -> ButtonType.ORDER
      7 -> ButtonType.SUBSCRIBE
      1000 -> ButtonType.PAY
      1001 -> ButtonType.PLAIN
      else -> null
    }

  private fun getButtonTheme(): Int? =
    when (this.appearance) {
      0, 1 -> ButtonTheme.LIGHT
      2 -> ButtonTheme.DARK
      else -> null
    }

  override fun requestLayout() {
    super.requestLayout()
    post(mLayoutRunnable)
  }

  private val mLayoutRunnable =
    Runnable {
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
      )
      button?.layout(left, top, right, bottom)
    }

  fun setType(type: Int) {
    this.type = type
  }

  fun setAppearance(appearance: Int) {
    this.appearance = appearance
  }

  fun setBorderRadius(borderRadius: Int) {
    this.borderRadius = borderRadius
  }
}
