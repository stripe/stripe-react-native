package com.stripe.android.testing;

import android.content.Intent;
import com.stripe.android.common.model.CommonConfigurationKt;
import com.stripe.android.paymentsheet.PaymentSheetContract;

/** Runs the native validation normally performed after the PaymentSheet activity launches. */
public final class PaymentSheetConfigurationValidator {
  public static void validate(Intent intent) {
    PaymentSheetContract.Args args = intent.getParcelableExtra(
        "com.stripe.android.paymentsheet.PaymentSheetContract.extra_args");
    CommonConfigurationKt.asCommonConfiguration(args.getConfig$paymentsheet_release()).validate(
        args.getInitializationMode$paymentsheet_release(),
        false,
        args.getPaymentElementCallbackIdentifier$paymentsheet_release(),
        false);
  }
}
