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
private fun mapFromCheckoutSession(session: CheckoutSession): WritableMap =
  Arguments.createMap().apply {
    putString("id", session.id)
    putBoolean("livemode", false)

    if (session.currency.isNotBlank()) {
      putString("currency", session.currency)
    }

    putMap("status", mapFromStatus(session.status))
    putMap("tax", mapFromTax(session.tax))
    session.totalSummary?.let { putMap("total", mapFromTotal(it)) }

    putArray("lineItems", mapFromLineItems(session))
    putArray("shippingOptions", mapFromShippingOptions(session))
    putArray("discountAmounts", Arguments.createArray())
    putArray("currencyOptions", Arguments.createArray())
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromStatus(status: CheckoutSession.Status): WritableMap =
  Arguments.createMap().apply {
    putString(
        "type",
        when (status) {
      CheckoutSession.Status.Open -> "open"
      CheckoutSession.Status.Complete -> "complete"
      CheckoutSession.Status.Expired -> "expired"
      else -> "unknown"
    }
    )
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromTax(tax: CheckoutSession.Tax): WritableMap =
  Arguments.createMap().apply {
    putString(
        "status",
        when (tax.status) {
      CheckoutSession.Tax.Status.Ready -> "ready"
      CheckoutSession.Tax.Status.RequiresShippingAddress -> "requiresShippingAddress"
      CheckoutSession.Tax.Status.RequiresBillingAddress -> "requiresBillingAddress"
      else -> "unknown"
    }
    )
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromTotal(totals: CheckoutSession.TotalSummary): WritableMap =
  Arguments.createMap().apply {
    val taxTotal = totals.taxAmounts.sumOf { it.amount }

    putMap("subtotal", makeAmount(totals.subtotal))
    putMap("taxExclusive", makeAmount(taxTotal))
    putMap("taxInclusive", makeAmount(0L))
    putMap("shippingRate", makeAmount(totals.shippingRate?.amount ?: 0L))
    putMap("discount", makeAmount(0L))
    putMap("total", makeAmount(totals.totalAmountDue))
    putMap("appliedBalance", makeAmount(0L))
    putBoolean("balanceAppliedToNextInvoice", false)
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromLineItems(session: CheckoutSession): WritableArray =
  Arguments.createArray().apply {
    session.lineItems.forEach { item ->
      pushMap(
        Arguments.createMap().apply {
          putString("id", item.id)
          putString("name", item.name)
          putInt("quantity", item.quantity)
          putArray("images", Arguments.createArray())
          putArray("discountAmounts", Arguments.createArray())
          putArray("taxAmounts", Arguments.createArray())
          item.unitAmount?.let { putMap("unitAmount", makeAmount(it)) }
        },
      )
    }
  }

@OptIn(CheckoutSessionPreview::class)
private fun mapFromShippingOptions(session: CheckoutSession): WritableArray =
  Arguments.createArray().apply {
    session.shippingOptions.forEach { option ->
      pushMap(
        Arguments.createMap().apply {
          putString("id", option.id)
          putString("displayName", option.displayName)
          putMap("amount", makeAmount(option.amount))
          putString("currency", session.currency)
        },
      )
    }
  }

private fun makeAmount(minorUnits: Long): WritableMap =
  Arguments.createMap().apply {
    putString("amount", "")
    putDouble("minorUnitsAmount", minorUnits.toDouble())
  }
