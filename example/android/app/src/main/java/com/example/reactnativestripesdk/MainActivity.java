package com.example.reactnativestripesdk;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.reactnativestripesdk.StripeSdkModule;
import com.stripe.android.paymentsheet.PaymentResult;
import com.stripe.android.paymentsheet.PaymentSheet;
import com.stripe.android.paymentsheet.model.PaymentOption;

public class MainActivity extends ReactActivity {
  private PaymentSheet paymentSheet;
  private PaymentSheet.FlowController flowController;

  private void onPaymentSheetResult(
    final PaymentResult paymentResult
  ) {
    // see below
  }

  private void onPaymentOptionResult(
    final PaymentOption paymentOption
  ) {
    // see below
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "StripeSdkExample";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    paymentSheet = new PaymentSheet(this, this::onPaymentSheetResult);
    flowController = PaymentSheet.FlowController.create(this, this::onPaymentOptionResult, this::onPaymentSheetResult);
    StripeSdkModule.Companion.setPaymentSheet(paymentSheet);
    StripeSdkModule.Companion.setFlowController(flowController);
  }
}
