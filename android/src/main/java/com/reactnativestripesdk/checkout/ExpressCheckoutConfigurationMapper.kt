package com.reactnativestripesdk.checkout

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.getFloatOrNull
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
      params.getMap("link")?.let { link ->
        val configuration = ExpressLink()
        link.getString("display")?.let {
          configuration.display(
            when (it) {
              "automatic" -> ExpressLink.Display.Automatic
              "never" -> ExpressLink.Display.Never
              else -> unsupported("link.display", it)
            },
          )
        }
        linkConfiguration(configuration)
      }
      params.getMap("appearance")?.let { appearance(mapAppearance(it)) }
    }

  private fun mapGooglePay(params: ReadableMap): ExpressGooglePay = ExpressGooglePay().apply {
    params.getString("display")?.let {
      display(
        when (it) {
          "automatic" -> ExpressGooglePay.Display.Automatic
          "never" -> ExpressGooglePay.Display.Never
          else -> unsupported("googlePay.display", it)
        },
      )
    }
    params.getString("label")?.let(::label)
    params.getStringList("additionalEnabledNetworks")?.let(::additionalEnabledNetworks)
    params.getString("buttonType")?.let { buttonType(mapButtonType(it)) }
  }

  private fun mapButtonType(value: String): ExpressGooglePay.ButtonType = when (value) {
    "buy" -> ExpressGooglePay.ButtonType.Buy
    "book" -> ExpressGooglePay.ButtonType.Book
    "checkout" -> ExpressGooglePay.ButtonType.Checkout
    "donate" -> ExpressGooglePay.ButtonType.Donate
    "order" -> ExpressGooglePay.ButtonType.Order
    "pay" -> ExpressGooglePay.ButtonType.Pay
    "subscribe" -> ExpressGooglePay.ButtonType.Subscribe
    "plain" -> ExpressGooglePay.ButtonType.Plain
    else -> unsupported("googlePay.buttonType", value)
  }

  private fun mapAppearance(params: ReadableMap): ExpressAppearance = ExpressAppearance().apply {
    params.getString("buttonTheme")?.let {
      buttonTheme(
        when (it) {
          "automatic" -> ExpressAppearance.ButtonTheme.Automatic
          "light" -> ExpressAppearance.ButtonTheme.Light
          "dark" -> ExpressAppearance.ButtonTheme.Dark
          else -> unsupported("appearance.buttonTheme", it)
        },
      )
    }
    params.getFloatOrNull("borderRadius")?.let(::cornerRadiusDp)
    params.getMap("buttonLayout")?.let { layout ->
      buttonLayout(
        ExpressAppearance.ButtonLayout()
          .maxColumns(layout.dimension("maxColumns"))
          .maxRows(layout.dimension("maxRows")),
      )
    }
  }

  private fun ReadableMap.dimension(key: String): Int? {
    if (!hasKey(key) || isNull(key)) return null
    val value = getDouble(key)
    require(value == value.toInt().toDouble() && value in 1.0..MAX_LAYOUT_DIMENSION.toDouble()) {
      "expressCheckoutElement.appearance.buttonLayout.$key must be an integer between 1 and 10."
    }
    return value.toInt()
  }

  private fun unsupported(path: String, value: String): Nothing =
    throw IllegalArgumentException(
      "Unsupported Checkout configuration value `$value` for `expressCheckoutElement.$path`.",
    )

  private const val MAX_LAYOUT_DIMENSION = 10
}
