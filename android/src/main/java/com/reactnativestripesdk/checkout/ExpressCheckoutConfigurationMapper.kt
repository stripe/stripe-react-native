package com.reactnativestripesdk.checkout

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.getStringList
import com.stripe.android.elements.ExpressCheckoutElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.GooglePayConfiguration as ExpressGooglePay
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.LinkConfiguration as ExpressLink

@SuppressLint("RestrictedApi")
@OptIn(CheckoutSessionPreview::class)
internal object ExpressCheckoutConfigurationMapper {
  fun map(params: ReadableMap): ExpressCheckoutElement.Configuration =
    ExpressCheckoutElement.Configuration().apply {
      params.getMap("googlePay")?.let { googlePayConfiguration(mapGooglePay(it)) }
      params.getMap("link")?.let { linkConfiguration(mapLink(it)) }
    }

  private fun mapGooglePay(params: ReadableMap): ExpressGooglePay = ExpressGooglePay().apply {
    params.getString("display")?.let {
      display(mapEnum("googlePay.display", it))
    }
    params.getString("label")?.let(::label)
    params.getStringList("additionalEnabledNetworks")?.let(::additionalEnabledNetworks)
    params.getString("buttonType")?.let { buttonType(mapEnum("googlePay.buttonType", it)) }
  }

  private fun mapLink(params: ReadableMap): ExpressLink = ExpressLink().apply {
    params.getString("display")?.let { display(mapEnum("link.display", it)) }
  }

  // Follow native enum names so newly supported native values do not need another bridge switch case.
  // Keep invalid values as configuration errors, matching the other Checkout mappers.
  private inline fun <reified T : Enum<T>> mapEnum(path: String, value: String): T =
    enumValues<T>().firstOrNull { it.name.equals(value, ignoreCase = true) }
      ?: throw IllegalArgumentException(
      "Unsupported Checkout configuration value `$value` for `expressCheckoutElement.$path`.",
    )
}
