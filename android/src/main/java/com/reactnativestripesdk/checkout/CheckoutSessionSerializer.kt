package com.reactnativestripesdk.checkout

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.convertDrawableToBase64
import com.reactnativestripesdk.toHtmlString
import com.stripe.android.checkout.CheckoutController.Session
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

@OptIn(CheckoutSessionPreview::class)
internal object CheckoutSessionSerializer {
  suspend fun serialize(session: Session): WritableMap =
    Arguments.createMap().apply {
      putString("id", session.id)
      putBoolean("livemode", session.livemode)
      putString("currency", session.currency)
      session.email?.let { putString("email", it) }
      session.tax?.let { putMap("tax", serializeTax(it)) }
      putMap("status", serializeStatus(session.status))
      session.paymentOption?.let {
        putMap("paymentOption", serializePaymentOption(it))
      }
      putInt("minorUnitsAmountDivisor", session.minorUnitsAmountDivisor)
      session.businessName?.let { putString("businessName", it) }
      session.presentmentDetails?.let {
        putMap(
            "presentmentDetails",
            Arguments.createMap().apply {
          putString("presentmentCurrency", it.presentmentCurrency)
        }
        )
      }
      session.shippingAddress?.let { putMap("shippingAddress", serialize(it)) }
      putArray("orderSummaryItems", serializeList(session.orderSummaryItems, ::serialize))
      putArray("discountAmounts", serializeList(session.discountAmounts, ::serialize))
      session.taxAmounts?.let { putArray("taxAmounts", serializeList(it, ::serialize)) }
      putMap("totals", serialize(session.totals))
    }

  private fun serializeTax(tax: Session.Tax): WritableMap {
    val status = when (tax.status) {
      Session.Tax.Status.Ready -> "ready"
      Session.Tax.Status.RequiresShippingAddress -> "requiresShippingAddress"
      Session.Tax.Status.RequiresBillingAddress -> "requiresBillingAddress"
    }
    return Arguments.createMap().apply { putString("status", status) }
  }

  private fun serializeStatus(status: Session.Status): WritableMap =
    Arguments.createMap().apply {
      when (status) {
        is Session.Status.Open -> putString("type", "open")
        is Session.Status.Expired -> putString("type", "expired")
        is Session.Status.Complete -> {
          putString("type", "complete")
          putString("paymentStatus", serializePaymentStatus(status.paymentStatus))
        }
      }
    }

  fun serializePaymentStatus(status: Session.Status.PaymentStatus): String = when (status) {
    Session.Status.PaymentStatus.Paid -> "paid"
    Session.Status.PaymentStatus.Unpaid -> "unpaid"
    Session.Status.PaymentStatus.NoPaymentRequired -> "noPaymentRequired"
  }

  private fun serialize(amount: Session.Amount): WritableMap = Arguments.createMap().apply {
    putString("amount", amount.amount)
    putDouble("minorUnitsAmount", amount.minorUnitsAmount)
  }

  private fun serialize(amount: Session.DiscountAmount): WritableMap = Arguments.createMap().apply {
    putString("amount", amount.amount)
    putDouble("minorUnitsAmount", amount.minorUnitsAmount)
    putString("displayName", amount.displayName)
    amount.promotionCode?.let { putString("promotionCode", it) }
    amount.percentOff?.let { putDouble("percentOff", it) }
  }

  private fun serialize(amount: Session.TaxAmount): WritableMap = Arguments.createMap().apply {
    putString("amount", amount.amount)
    putDouble("minorUnitsAmount", amount.minorUnitsAmount)
    putBoolean("inclusive", amount.inclusive)
    putString("displayName", amount.displayName)
    amount.percentage?.let { putDouble("percentage", it) }
  }

  private fun serialize(totals: Session.Totals): WritableMap = Arguments.createMap().apply {
    putMap("subtotal", serialize(totals.subtotal))
    putMap("taxExclusive", serialize(totals.taxExclusive))
    putMap("taxInclusive", serialize(totals.taxInclusive))
    putMap("discount", serialize(totals.discount))
    putMap("total", serialize(totals.total))
  }

  private fun serialize(shipping: Session.ShippingAddress): WritableMap = Arguments.createMap().apply {
    shipping.name?.let { putString("name", it) }
    putMap(
        "address",
        Arguments.createMap().apply {
      putString("country", shipping.address.country)
      shipping.address.line1?.let { putString("line1", it) }
      shipping.address.line2?.let { putString("line2", it) }
      shipping.address.city?.let { putString("city", it) }
      shipping.address.state?.let { putString("state", it) }
      shipping.address.postalCode?.let { putString("postalCode", it) }
    }
    )
  }

  private fun serialize(item: Session.OrderSummaryItem): WritableMap = when (item) {
    is Session.OrderSummaryItem.OneTimePrice -> Arguments.createMap().apply {
      putString("type", "one_time_price")
      putString("key", item.key)
      item.description?.let { putString("description", it) }
      putArray("items", serializeList(item.items, ::serialize))
    }
  }

  private fun serialize(item: Session.OrderSummaryItem.OneTimePrice.Item): WritableMap = Arguments.createMap().apply {
    putString("key", item.key)
    putString("displayName", item.displayName)
    putArray("images", Arguments.fromList(item.images))
    putMap("unitAmount", serialize(item.unitAmount))
    item.unitAmountDecimal?.let { putMap("unitAmountDecimal", serialize(it)) }
    item.unitLabel?.let { putString("unitLabel", it) }
    putInt("quantity", item.quantity)
    item.adjustableQuantity?.let {
      putMap(
          "adjustableQuantity",
          Arguments.createMap().apply {
        putBoolean("enabled", it.enabled)
        putInt("minimum", it.minimum)
        putInt("maximum", it.maximum)
      }
      )
    }
    putMap(
        "amountDetails",
        Arguments.createMap().apply {
      putMap("total", serialize(item.amountDetails.total))
      putMap("subtotal", serialize(item.amountDetails.subtotal))
      putMap("taxInclusive", serialize(item.amountDetails.taxInclusive))
      putMap("taxExclusive", serialize(item.amountDetails.taxExclusive))
      item.amountDetails.taxAmounts?.let { putArray("taxAmounts", serializeList(it, ::serialize)) }
    }
    )
  }

  private fun <T> serializeList(values: List<T>, serialize: (T) -> WritableMap): WritableArray =
    Arguments.createArray().apply { values.forEach { pushMap(serialize(it)) } }

  private suspend fun serializePaymentOption(
    paymentOption: Session.PaymentOptionDisplayData,
  ): WritableMap = Arguments.createMap().apply {
    putString("label", paymentOption.label)
    putString("paymentMethodType", paymentOption.paymentMethodType)
    paymentOption.mandateText?.let { putString("mandateHTML", it.toHtmlString()) }
    paymentOption.billingDetails?.let { putMap("billingDetails", serializeBillingDetails(it)) }
    val imageBase64 = try {
      withContext(Dispatchers.Default) {
        withTimeoutOrNull(IMAGE_TIMEOUT_MILLIS) {
          val image = withContext(Dispatchers.IO) { paymentOption.imageLoader() }
          convertDrawableToBase64(image)
        }
      }
    } catch (error: CancellationException) {
      throw error
    } catch (_: Exception) {
      null
    }
    putString("image", imageBase64.orEmpty())
  }

  private fun serializeBillingDetails(
    billingDetails: Session.PaymentOptionDisplayData.BillingDetails,
  ): WritableMap = Arguments.createMap().apply {
    billingDetails.name?.let { putString("name", it) }
    billingDetails.email?.let { putString("email", it) }
    billingDetails.address?.let { address ->
      putMap(
        "address",
        Arguments.createMap().apply {
          address.country?.let { putString("country", it) }
          address.line1?.let { putString("line1", it) }
          address.line2?.let { putString("line2", it) }
          address.city?.let { putString("city", it) }
          address.state?.let { putString("state", it) }
          address.postalCode?.let { putString("postalCode", it) }
        },
      )
    }
    billingDetails.phone?.let { putString("phone", it) }
  }
}

private const val IMAGE_TIMEOUT_MILLIS = 5_000L
