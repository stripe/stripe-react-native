package com.reactnativestripesdk;

import com.stripe.android.paymentsheet.PaymentSheetResult;

/** Creates real SDK result values, whose constructors are Kotlin-internal but public to Java. */
final class PaymentSheetTestResults {
  static PaymentSheetResult completed() {
    return new PaymentSheetResult.Completed(true);
  }

  static PaymentSheetResult canceled() {
    return new PaymentSheetResult.Canceled(true);
  }

  static PaymentSheetResult failed(Throwable error) {
    return new PaymentSheetResult.Failed(error);
  }

  private PaymentSheetTestResults() {}
}
