package com.reactnativestripesdk.utils

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.stripe.android.checkout.Checkout
import com.stripe.android.checkout.CheckoutSession
import com.stripe.android.paymentelement.CheckoutSessionPreview

@OptIn(CheckoutSessionPreview::class)
internal fun mapFromCheckoutState(checkout: Checkout): WritableMap =
  mapFromCheckoutState(
    isLoading = checkout.isLoading.value,
    session = checkout.checkoutSession.value,
  )

@OptIn(CheckoutSessionPreview::class)
internal fun mapFromCheckoutState(
  isLoading: Boolean,
  session: CheckoutSession,
): WritableMap =
  Arguments.createMap().apply {
    putString("status", if (isLoading) "loading" else "loaded")
    putMap("session", mapFromCheckoutSession(session))
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromCheckoutSession(
  session: CheckoutSession,
): WritableMap =
  Arguments.createMap().apply {
    putString("id", session.id)
    // TODO(CheckoutSessionsPreview): Populate from public Android checkout fields once
    // stripe-android exposes status, paymentStatus, and livemode on CheckoutSession.
    putString("status", "unknown")
    putString("paymentStatus", "unknown")
    putBoolean("livemode", false)

    if (session.currency.isNotBlank()) {
      putString("currency", session.currency)
    }

    session.totalSummary?.let { putMap("totals", mapFromCheckoutTotals(it)) }
    putArray("lineItems", mapFromCheckoutLineItems(session))
    putArray("shippingOptions", mapFromCheckoutShippingOptions(session))

    // TODO(CheckoutSessionsPreview): Populate top-level discounts once stripe-android
    // exposes them directly instead of only exposing TotalSummary.discountAmounts.
    putArray("discounts", Arguments.createArray())

    // TODO(CheckoutSessionsPreview): Populate customerId, customerEmail, billingAddress,
    // and shippingAddress once stripe-android exposes them on public checkout models.
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromCheckoutTotals(totals: CheckoutSession.TotalSummary): WritableMap {
  val taxTotal = totals.taxAmounts.sumOf { it.amount }

  return Arguments.createMap().apply {
    putDouble("subtotal", totals.subtotal.toDouble())
    putDouble("total", totals.totalAmountDue.toDouble())
    putDouble("due", totals.totalDueToday.toDouble())
    // TODO(CheckoutSessionsPreview): Populate the top-level discount total once the
    // Android TotalSummary model exposes it directly.
    putDouble("discount", 0.0)
    putDouble("shipping", (totals.shippingRate?.amount ?: 0L).toDouble())
    putDouble("tax", taxTotal.toDouble())
  }
}

@OptIn(CheckoutSessionPreview::class)
private fun mapFromCheckoutLineItems(session: CheckoutSession): WritableArray =
  Arguments.createArray().apply {
    session.lineItems.forEach { item ->
      pushMap(
        Arguments.createMap().apply {
          putString("id", item.id)
          putString("name", item.name)
          putInt("quantity", item.quantity)
          putDouble("unitAmount", (item.unitAmount ?: 0L).toDouble())
          putString("currency", session.currency)
        },
      )
    }
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromCheckoutShippingOptions(session: CheckoutSession): WritableArray =
  Arguments.createArray().apply {
    session.shippingOptions.forEach { option ->
      pushMap(
        Arguments.createMap().apply {
          putString("id", option.id)
          putString("displayName", option.displayName)
          putDouble("amount", option.amount.toDouble())
          putString("currency", session.currency)
          option.deliveryEstimate?.let { putString("deliveryEstimate", it) }
        },
      )
    }
  }
