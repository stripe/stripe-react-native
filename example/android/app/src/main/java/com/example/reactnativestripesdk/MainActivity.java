package com.example.reactnativestripesdk;

import android.os.Bundle;
import android.os.PersistableBundle;

import androidx.activity.ComponentActivity;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.facebook.react.ReactActivity;
import com.reactnativestripesdk.StripeSdkModule;
import com.stripe.android.paymentsheet.PaymentResult;
import com.stripe.android.paymentsheet.PaymentSheet;

public class MainActivity extends ReactActivity {
  private PaymentSheet paymentSheet;

  private void onPaymentSheetResult(
    final PaymentResult paymentResult
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
  public void onCreate(@Nullable Bundle savedInstanceState, @Nullable PersistableBundle persistentState) {
    super.onCreate(savedInstanceState, persistentState);


    paymentSheet = new PaymentSheet(this, this::onPaymentSheetResult);

    StripeSdkModule.Companion.setPaymentSheet(paymentSheet);
  }
}
