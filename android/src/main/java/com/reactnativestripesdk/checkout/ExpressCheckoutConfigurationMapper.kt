package com.reactnativestripesdk.checkout

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.getFloatOrNull
import com.reactnativestripesdk.utils.getIntOrNull
import com.reactnativestripesdk.utils.getStringList
import com.stripe.android.elements.ExpressCheckoutElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.Appearance as ExpressAppearance
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.GooglePayConfiguration as ExpressGooglePay
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.LinkConfiguration as ExpressLink

@SuppressLint("RestrictedApi")
@OptIn(CheckoutSessionPreview::class)
internal object ExpressCheckoutConfigurationMapper {
  fun map(params: ReadableMap): ExpressCheckoutElement.Configuration =
    ExpressCheckoutElement.Configuration().apply {
      params.getMap("googlePay")?.let { googlePayConfiguration(mapGooglePay(it)) }
      params.getMap("link")?.let { linkConfiguration(mapLink(it)) }
      params.getMap("appearance")?.let { appearance(mapAppearance(it)) }
    }

  private fun mapGooglePay(params: ReadableMap): ExpressGooglePay = ExpressGooglePay().apply {
    params.getString("display")?.let {
      display(
        when (it) {
          "automatic" -> ExpressGooglePay.Display.Automatic
          "never" -> ExpressGooglePay.Display.Never
          else -> unsupportedValue("googlePay.display", it)
        },
      )
    }
    params.getString("label")?.let(::label)
    params.getStringList("additionalEnabledNetworks")?.let(::additionalEnabledNetworks)
    params.getString("buttonType")?.let { buttonType(mapGooglePayButtonType(it)) }
  }

  private fun mapLink(params: ReadableMap): ExpressLink = ExpressLink().apply {
    params.getString("display")?.let {
      display(
        when (it) {
          "automatic" -> ExpressLink.Display.Automatic
          "never" -> ExpressLink.Display.Never
          else -> unsupportedValue("link.display", it)
        },
      )
    }
  }

  private fun mapAppearance(params: ReadableMap): ExpressAppearance = ExpressAppearance().apply {
    params.getString("buttonTheme")?.let {
      buttonTheme(
        when (it) {
          "automatic" -> ExpressAppearance.ButtonTheme.Automatic
          "light" -> ExpressAppearance.ButtonTheme.Light
          "dark" -> ExpressAppearance.ButtonTheme.Dark
          else -> unsupportedValue("appearance.buttonTheme", it)
        },
      )
    }
    params.getFloatOrNull("borderRadius")?.let(::cornerRadiusDp)
    params.getMap("buttonLayout")?.let { layout ->
      buttonLayout(
        ExpressAppearance.ButtonLayout()
          .maxColumns(layout.getIntOrNull("maxColumns"))
          .maxRows(layout.getIntOrNull("maxRows")),
      )
    }
  }

  private fun mapGooglePayButtonType(value: String): ExpressGooglePay.ButtonType =
    when (value) {
      "buy" -> ExpressGooglePay.ButtonType.Buy
      "book" -> ExpressGooglePay.ButtonType.Book
      "checkout" -> ExpressGooglePay.ButtonType.Checkout
      "donate" -> ExpressGooglePay.ButtonType.Donate
      "order" -> ExpressGooglePay.ButtonType.Order
      "subscribe" -> ExpressGooglePay.ButtonType.Subscribe
      "plain" -> ExpressGooglePay.ButtonType.Plain
      "pay" -> ExpressGooglePay.ButtonType.Pay
      else -> unsupportedValue("googlePay.buttonType", value)
    }

  private fun unsupportedValue(path: String, value: String): Nothing =
    throw IllegalArgumentException(
      "Unsupported Checkout configuration value `$value` for `expressCheckoutElement.$path`.",
    )
}
