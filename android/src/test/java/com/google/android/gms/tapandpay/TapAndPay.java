package com.google.android.gms.tapandpay;

import android.app.Activity;

/**
 * Stands in for the play-services-tapandpay entry point, which apps add themselves, so tests
 * can reach the reflective calls in TapAndPayProxy.
 */
public final class TapAndPay {
  private TapAndPay() {}

  public static TapAndPayClient getClient(Activity activity) {
    return new TapAndPayClient();
  }
}
