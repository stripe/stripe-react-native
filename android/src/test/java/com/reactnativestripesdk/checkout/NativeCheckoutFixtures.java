package com.reactnativestripesdk.checkout;

import android.graphics.drawable.Drawable;
import androidx.compose.ui.text.AnnotatedString;
import com.stripe.android.checkout.CheckoutController;
import com.stripe.android.checkout.CheckoutController.Session;
import java.util.Collections;
import kotlin.coroutines.Continuation;
import kotlin.jvm.functions.Function1;

// The SDK keeps model constructors internal to Kotlin but exposes public JVM constructors.
// Use those constructors for real test models without compiler visibility suppressions.
final class NativeCheckoutFixtures {
  private NativeCheckoutFixtures() {}

  static Session session(
      String email,
      Session.Status status,
      Session.Tax.Status taxStatus,
      Session.PaymentOptionDisplayData paymentOption) {
    Session.Amount subtotal = new Session.Amount("$21.00", 2100.0);
    Session.Amount total = new Session.Amount("$22.50", 2250.0);
    Session.Amount zero = new Session.Amount("$0.00", 0.0);
    Session.OrderSummaryItem.OneTimePrice.Item item = new Session.OrderSummaryItem.OneTimePrice.Item(
        "item_1", "Shirt", Collections.emptyList(), new Session.Amount("$10.50", 1050.0),
        new Session.Amount("$10.5025", 1050.25), null, 2, new Session.AdjustableQuantity(true, 5, 1),
        new Session.OrderSummaryItem.OneTimePrice.Item.AmountDetails(total, subtotal, null, zero, zero));
    return new Session(
        "cs_test", "Test business", status, false, "usd", null, Collections.emptyList(), email,
        Collections.singletonList(new Session.OrderSummaryItem.OneTimePrice("group_1", null, Collections.singletonList(item))),
        100, paymentOption, null, taxStatus == null ? null : new Session.Tax(taxStatus), null,
        new Session.Totals(subtotal, zero, zero, zero, total), null, Collections.emptyList());
  }

  static CheckoutController.Result completedResult() { return new CheckoutController.Result.Completed(); }
  static CheckoutController.Result canceledResult() { return new CheckoutController.Result.Canceled(); }
  static CheckoutController.Result failedResult(Throwable error) { return new CheckoutController.Result.Failed(error); }

  static Session.Status openStatus() { return new Session.Status.Open(); }
  static Session.Status expiredStatus() { return new Session.Status.Expired(); }
  static Session.Status completeStatus() { return new Session.Status.Complete(Session.Status.PaymentStatus.Paid); }

  static Session.PaymentOptionDisplayData paymentOption(
      Function1<? super Continuation<? super Drawable>, ? extends Object> imageLoader,
      Session.PaymentOptionDisplayData.BillingDetails billingDetails,
      AnnotatedString mandateText) {
    return new Session.PaymentOptionDisplayData(imageLoader, "Visa 4242", billingDetails, "card", mandateText);
  }

  static Session.PaymentOptionDisplayData.BillingDetails postalBillingDetails(String postalCode) {
    return new Session.PaymentOptionDisplayData.BillingDetails(
        new Session.PaymentOptionDisplayData.BillingDetails.Address(null, null, null, null, postalCode, null),
        null, null, "555-0100");
  }
}
