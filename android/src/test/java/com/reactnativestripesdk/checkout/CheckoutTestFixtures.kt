package com.reactnativestripesdk.checkout

import android.graphics.drawable.Drawable
import androidx.compose.ui.text.AnnotatedString
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlin.coroutines.intrinsics.startCoroutineUninterceptedOrReturn

@OptIn(CheckoutSessionPreview::class)
internal fun checkoutSession(
  email: String = "jenny@example.com",
  status: CheckoutController.Session.Status = NativeCheckoutFixtures.openStatus(),
  taxStatus: CheckoutController.Session.Tax.Status? = CheckoutController.Session.Tax.Status.Ready,
  paymentOption: CheckoutController.Session.PaymentOptionDisplayData? = null,
): CheckoutController.Session = NativeCheckoutFixtures.session(email, status, taxStatus, paymentOption)

@OptIn(CheckoutSessionPreview::class)
internal fun checkoutPaymentOption(
  imageLoader: suspend () -> Drawable,
  billingDetails: CheckoutController.Session.PaymentOptionDisplayData.BillingDetails? = null,
  mandateText: AnnotatedString? = null,
): CheckoutController.Session.PaymentOptionDisplayData = NativeCheckoutFixtures.paymentOption(
  // Adapt the suspend loader to the JVM constructor's continuation signature.
  { continuation -> imageLoader.startCoroutineUninterceptedOrReturn(continuation) },
  billingDetails,
  mandateText,
)
