package com.reactnativestripesdk.utils;

import com.stripe.android.checkout.CheckoutSession;
import com.stripe.android.paymentsheet.verticalmode.CurrencySelectorOptions;
import java.util.Arrays;
import java.util.Collections;

public final class CheckoutTestFixtures {
  private CheckoutTestFixtures() {}

  public static CheckoutSession fullSession() {
    CheckoutSession.TotalSummary totals =
        new CheckoutSession.TotalSummary(
            5000L,
            4044L,
            4044L,
            Arrays.asList(
                new CheckoutSession.DiscountAmount(500L, "SUMMER10"),
                new CheckoutSession.DiscountAmount(250L, "LOYALTY5")),
            Collections.singletonList(
                new CheckoutSession.TaxAmount(294L, false, "Sales Tax", 6.875d)),
            new CheckoutSession.ShippingRate(
                "shr_standard", 500L, "Standard Shipping", "5-7 business days"),
            null);

    return new CheckoutSession(
        "cs_test_123",
        "usd",
        totals,
        Arrays.asList(
            new CheckoutSession.LineItem("li_item1", "Llama Figure", 2, null, 1998L, 1998L),
            new CheckoutSession.LineItem("li_item2", "Alpaca Plushie", 1, 2499L, 2499L, 2499L)),
        Arrays.asList(
            new CheckoutSession.ShippingRate("shr_standard", 500L, "Standard Shipping", null),
            new CheckoutSession.ShippingRate(
                "shr_express", 1500L, "Express Shipping", "1-2 business days")),
        (CurrencySelectorOptions) null);
  }

  public static CheckoutSession blankCurrencySession() {
    return new CheckoutSession(
        "cs_test_blank_currency",
        "",
        null,
        Collections.<CheckoutSession.LineItem>emptyList(),
        Collections.<CheckoutSession.ShippingRate>emptyList(),
        (CurrencySelectorOptions) null);
  }
}
