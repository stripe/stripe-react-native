package com.reactnativestripesdk.utils

import com.facebook.react.bridge.ReadableMap
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.checkout.Address as CheckoutAddress

@OptIn(CheckoutSessionPreview::class)
internal data class CheckoutAddressUpdate(
  val name: String? = null,
  val phone: String? = null,
  val country: String,
  val line1: String? = null,
  val line2: String? = null,
  val city: String? = null,
  val state: String? = null,
  val postalCode: String? = null,
)

internal fun buildCheckoutAddressUpdate(
  name: String?,
  phone: String?,
  address: ReadableMap,
): CheckoutAddressUpdate? {
  val country = address.getString("country")?.trim()?.takeIf { it.isNotEmpty() } ?: return null
  return CheckoutAddressUpdate(
    name = name?.trim(),
    phone = phone?.trim(),
    country = country,
    line1 = address.getString("line1")?.trim(),
    line2 = address.getString("line2")?.trim(),
    city = address.getString("city")?.trim(),
    state = address.getString("state")?.trim(),
    postalCode = address.getString("postalCode")?.trim(),
  )
}

@OptIn(CheckoutSessionPreview::class)
internal fun CheckoutAddressUpdate.toCheckoutAddress(): CheckoutAddress =
  CheckoutAddress()
    .country(country)
    .line1(line1)
    .line2(line2)
    .city(city)
    .state(state)
    .postalCode(postalCode)
