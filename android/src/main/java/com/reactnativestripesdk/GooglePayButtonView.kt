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
      BUTTON_TYPE_BUY_DEFAULT,
      BUTTON_TYPE_BUY_ALT,
      -> ButtonType.BUY
      BUTTON_TYPE_BOOK -> ButtonType.BOOK
      BUTTON_TYPE_CHECKOUT -> ButtonType.CHECKOUT
      BUTTON_TYPE_DONATE -> ButtonType.DONATE
      BUTTON_TYPE_ORDER -> ButtonType.ORDER
      BUTTON_TYPE_SUBSCRIBE -> ButtonType.SUBSCRIBE
      BUTTON_TYPE_PAY -> ButtonType.PAY
      BUTTON_TYPE_PLAIN -> ButtonType.PLAIN
      else -> null
    }

  private fun getButtonTheme(): Int? =
    when (this.appearance) {
      BUTTON_THEME_LIGHT_DEFAULT, BUTTON_THEME_LIGHT_ALT -> ButtonTheme.LIGHT
      BUTTON_THEME_DARK -> ButtonTheme.DARK
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
      layout(left, top, right, bottom)
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

  private companion object {
    const val BUTTON_TYPE_BUY_DEFAULT = 0
    const val BUTTON_TYPE_BUY_ALT = 1
    const val BUTTON_TYPE_DONATE = 4
    const val BUTTON_TYPE_CHECKOUT = 5
    const val BUTTON_TYPE_BOOK = 6
    const val BUTTON_TYPE_SUBSCRIBE = 7
    const val BUTTON_TYPE_ORDER = 11
    const val BUTTON_TYPE_PAY = 1000
    const val BUTTON_TYPE_PLAIN = 1001
    const val BUTTON_THEME_LIGHT_DEFAULT = 0
    const val BUTTON_THEME_LIGHT_ALT = 1
    const val BUTTON_THEME_DARK = 2
  }
}
