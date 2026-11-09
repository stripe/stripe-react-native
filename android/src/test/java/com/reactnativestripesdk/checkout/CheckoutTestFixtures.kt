package com.reactnativestripesdk.checkout

import android.graphics.drawable.Drawable
import androidx.compose.ui.text.AnnotatedString
import com.stripe.android.checkout.CheckoutElementsController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import java.util.concurrent.atomic.AtomicReference
import kotlin.coroutines.intrinsics.startCoroutineUninterceptedOrReturn

@OptIn(CheckoutSessionPreview::class)
internal fun checkoutSession(
  email: String = "jenny@example.com",
  status: CheckoutElementsController.Session.Status = NativeCheckoutFixtures.openStatus(),
  taxStatus: CheckoutElementsController.Session.Tax.Status? = CheckoutElementsController.Session.Tax.Status.Ready,
  paymentOption: CheckoutElementsController.Session.PaymentOptionDisplayData? = null,
): CheckoutElementsController.Session = NativeCheckoutFixtures.session(email, status, taxStatus, paymentOption)

@OptIn(CheckoutSessionPreview::class)
internal fun checkoutPaymentOption(
  imageLoader: suspend () -> Drawable,
  billingDetails: CheckoutElementsController.Session.PaymentOptionDisplayData.BillingDetails? = null,
  mandateText: AnnotatedString? = null,
  requestedDarkTheme: AtomicReference<Boolean>? = null,
): CheckoutElementsController.Session.PaymentOptionDisplayData = NativeCheckoutFixtures.paymentOption(
  // Adapt the suspend loader to the JVM constructor's continuation signature.
  { continuation -> imageLoader.startCoroutineUninterceptedOrReturn(continuation) },
  billingDetails,
  mandateText,
  requestedDarkTheme,
)
