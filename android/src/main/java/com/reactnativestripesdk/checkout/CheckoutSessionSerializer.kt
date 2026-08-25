package com.reactnativestripesdk.checkout

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.convertDrawableToBase64
import com.reactnativestripesdk.toHtmlString
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import kotlin.math.pow

@OptIn(CheckoutSessionPreview::class)
internal object CheckoutSessionSerializer {
  suspend fun serialize(session: CheckoutController.Session): WritableMap =
    Arguments.createMap().apply {
      putString("id", session.id)
      putBoolean("livemode", session.liveMode)
      putString("currency", session.currency)
      putDouble("minorUnitsAmountDivisor", minorUnitsAmountDivisor(session.currency))
      session.email?.let { putString("email", it) }
      putArray("orderSummaryItems", serializeOrderSummaryItems(session))
      putArray("discountAmounts", serializeDiscountAmounts(session))
      serializeTax(session)?.let { putMap("tax", it) }
      session.totalSummary?.let { putArray("taxAmounts", serializeTaxAmounts(session)) }
      putMap("totals", serializeTotals(session))
      putMap("status", serializeStatus(session.status))
      session.paymentOptionDisplayData?.let {
        putMap("paymentOption", serializePaymentOption(it))
      }
      // TODO(porter): Uncomment when the reviewed native fields ship.
      // putString("businessName", session.businessName)
      // putMap("presentmentDetails", serializePresentmentDetails(session.presentmentDetails))
      // putMap("shippingAddress", serializeShippingAddress(session.shippingAddress))
      // putMap("lastPaymentError", serializeError(session.lastPaymentError))
    }

  private fun serializeOrderSummaryItems(session: CheckoutController.Session): WritableArray =
    Arguments.createArray().apply {
      session.lineItems.forEach { lineItem ->
        val unitAmount = lineItem.unitAmount ?: if (lineItem.quantity == 0) {
          0
        } else {
          lineItem.total / lineItem.quantity
        }
        val item = Arguments.createMap().apply {
          putString("key", lineItem.id)
          putString("displayName", lineItem.name)
          putArray("images", Arguments.createArray())
          putMap("unitAmount", amount(unitAmount, session.currency))
          putInt("quantity", lineItem.quantity)
          // TODO(porter): Uncomment when the reviewed native line item ships.
          // putMap("unitAmountDecimal", amount(lineItem.unitAmountDecimal, session.currency))
          // putString("unitLabel", lineItem.unitLabel)
          // putMap("adjustableQuantity", serializeAdjustableQuantity(lineItem.adjustableQuantity))
        }
        val amountDetails = Arguments.createMap().apply {
          putMap("total", amount(lineItem.total, session.currency))
          putMap("subtotal", amount(lineItem.subtotal, session.currency))
          putMap("discount", amount(0, session.currency))
          putMap("taxInclusive", amount(0, session.currency))
          putMap("taxExclusive", amount(0, session.currency))
        }
        pushMap(
          Arguments.createMap().apply {
            putString("type", "one_time_price")
            putString("key", lineItem.id)
            putArray("items", Arguments.createArray().apply { pushMap(item) })
            putMap("amountDetails", amountDetails)
          },
        )
      }
    }

  private fun serializeDiscountAmounts(session: CheckoutController.Session): WritableArray =
    Arguments.createArray().apply {
      session.totalSummary?.discountAmounts.orEmpty().forEach { discount ->
        pushMap(
          amount(discount.amount, session.currency).apply {
            putString("displayName", discount.displayName)
            // TODO(porter): Uncomment when the reviewed native fields ship.
            // putString("promotionCode", discount.promotionCode)
            // putDouble("percentOff", discount.percentOff)
          },
        )
      }
    }

  private fun serializeTax(session: CheckoutController.Session): WritableMap? {
    val status = when (session.tax.status) {
      CheckoutController.Session.Tax.Status.Ready -> "ready"
      CheckoutController.Session.Tax.Status.RequiresShippingAddress -> "requiresShippingAddress"
      CheckoutController.Session.Tax.Status.RequiresBillingAddress -> "requiresBillingAddress"
      CheckoutController.Session.Tax.Status.Unknown -> return null
    }
    return Arguments.createMap().apply { putString("status", status) }
  }

  private fun serializeTaxAmounts(session: CheckoutController.Session): WritableArray =
    Arguments.createArray().apply {
      session.totalSummary?.taxAmounts.orEmpty().forEach { tax ->
        pushMap(
          amount(tax.amount, session.currency).apply {
            putBoolean("inclusive", tax.inclusive)
            putString("displayName", tax.displayName)
            putDouble("percentage", tax.percentage)
          },
        )
      }
    }

  private fun serializeTotals(session: CheckoutController.Session): WritableMap {
    val totalSummary = session.totalSummary
    val taxInclusive = totalSummary?.taxAmounts.orEmpty().filter { it.inclusive }.sumOf { it.amount }
    val taxExclusive = totalSummary?.taxAmounts.orEmpty().filterNot { it.inclusive }.sumOf { it.amount }
    val discount = totalSummary?.discountAmounts.orEmpty().sumOf { it.amount }
    return Arguments.createMap().apply {
      putMap("subtotal", amount(totalSummary?.subtotal ?: 0, session.currency))
      putMap("taxExclusive", amount(taxExclusive, session.currency))
      putMap("taxInclusive", amount(taxInclusive, session.currency))
      putMap("discount", amount(discount, session.currency))
      putMap("total", amount(totalSummary?.totalDueToday ?: 0, session.currency))
      // TODO(porter): Use the reviewed native totals fields when they ship.
    }
  }

  private fun serializeStatus(status: CheckoutController.Session.Status): WritableMap =
    Arguments.createMap().apply {
      when (status) {
        is CheckoutController.Session.Status.Open -> putString("type", "open")
        is CheckoutController.Session.Status.Expired -> putString("type", "expired")
        is CheckoutController.Session.Status.Complete -> {
          putString("type", "complete")
          // TODO(porter): Map the reviewed native payment status when it ships.
          // putString("paymentStatus", ...)
        }
      }
    }

  private suspend fun serializePaymentOption(
    paymentOption: CheckoutController.Session.PaymentOptionDisplayData,
  ): WritableMap = Arguments.createMap().apply {
    putString("label", paymentOption.label)
    putString("paymentMethodType", paymentOption.paymentMethodType)
    paymentOption.mandateText?.let { putString("mandateHTML", it.toHtmlString()) }
    paymentOption.billingDetails?.let { putMap("billingDetails", serializeBillingDetails(it)) }
    val imageBase64 = withContext(Dispatchers.Default) {
      withTimeoutOrNull(IMAGE_TIMEOUT_MILLIS) {
        val image = withContext(Dispatchers.IO) { paymentOption.imageLoader() }
        convertDrawableToBase64(image)
      }
    }
    putString("image", imageBase64.orEmpty())
  }

  private fun serializeBillingDetails(
    billingDetails: CheckoutController.Session.PaymentOptionDisplayData.BillingDetails,
  ): WritableMap = Arguments.createMap().apply {
    billingDetails.name?.let { putString("name", it) }
    billingDetails.email?.let { putString("email", it) }
    billingDetails.address?.country?.let { country ->
      putMap(
        "address",
        Arguments.createMap().apply {
          putString("country", country)
          putString("line1", billingDetails.address?.line1)
          putString("line2", billingDetails.address?.line2)
          putString("city", billingDetails.address?.city)
          putString("state", billingDetails.address?.state)
          putString("postalCode", billingDetails.address?.postalCode)
        },
      )
    }
    // TODO(porter): Uncomment when the reviewed native field ships.
    // putString("phone", billingDetails.phone)
  }

  private fun amount(value: Long, currencyCode: String): WritableMap =
    Arguments.createMap().apply {
      putString("amount", formattedAmount(value, currencyCode))
      putDouble("minorUnitsAmount", value.toDouble())
    }

  private fun formattedAmount(value: Long, currencyCode: String): String =
    runCatching {
      val currency = Currency.getInstance(currencyCode.uppercase(Locale.ROOT))
      NumberFormat.getCurrencyInstance().apply { this.currency = currency }.format(
        value / minorUnitsAmountDivisor(currencyCode),
      )
    }.getOrElse { value.toString() }

  private fun minorUnitsAmountDivisor(currencyCode: String): Double =
    runCatching {
      10.0.pow(Currency.getInstance(currencyCode.uppercase(Locale.ROOT)).defaultFractionDigits)
    }.getOrDefault(DEFAULT_MINOR_UNITS_AMOUNT_DIVISOR)
}

private const val IMAGE_TIMEOUT_MILLIS = 5_000L
private const val DEFAULT_MINOR_UNITS_AMOUNT_DIVISOR = 100.0
