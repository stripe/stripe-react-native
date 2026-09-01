package com.reactnativestripesdk.checkout

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.convertDrawableToBase64
import com.reactnativestripesdk.toHtmlString
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

@OptIn(CheckoutSessionPreview::class)
internal object CheckoutSessionSerializer {
  suspend fun serialize(session: CheckoutController.Session): WritableMap =
    Arguments.createMap().apply {
      putString("id", session.id)
      putBoolean("livemode", session.liveMode)
      putString("currency", session.currency)
      session.email?.let { putString("email", it) }
      serializeTax(session)?.let { putMap("tax", it) }
      putMap("status", serializeStatus(session.status))
      session.paymentOptionDisplayData?.let {
        putMap("paymentOption", serializePaymentOption(it))
      }
      // TODO(porter): Serialize minorUnitsAmountDivisor, orderSummaryItems,
      // discountAmounts, taxAmounts, and totals when the reviewed native fields ship.
      // TODO(porter): Uncomment when the reviewed native fields ship.
      // putString("businessName", session.businessName)
      // putMap("presentmentDetails", serializePresentmentDetails(session.presentmentDetails))
      // putMap("shippingAddress", serializeShippingAddress(session.shippingAddress))
      // putMap("lastPaymentError", serializeError(session.lastPaymentError))
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
    val imageBase64 = try {
      withContext(Dispatchers.Default) {
        withTimeoutOrNull(IMAGE_TIMEOUT_MILLIS) {
          val image = withContext(Dispatchers.IO) { paymentOption.imageLoader() }
          convertDrawableToBase64(image)
        }
      }
    } catch (_: Exception) {
      null
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
          billingDetails.address?.line1?.let { putString("line1", it) }
          billingDetails.address?.line2?.let { putString("line2", it) }
          billingDetails.address?.city?.let { putString("city", it) }
          billingDetails.address?.state?.let { putString("state", it) }
          billingDetails.address?.postalCode?.let { putString("postalCode", it) }
        },
      )
    }
    // TODO(porter): Uncomment when the reviewed native field ships.
    // putString("phone", billingDetails.phone)
  }
}

private const val IMAGE_TIMEOUT_MILLIS = 5_000L
