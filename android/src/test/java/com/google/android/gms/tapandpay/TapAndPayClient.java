package com.google.android.gms.tapandpay;

import android.app.Activity;
import java.util.Arrays;
import java.util.List;

/** Records the tokenize call with the signature of the play-services-tapandpay client. */
public class TapAndPayClient {
  public static List<Object> lastTokenizeArguments;

  public void tokenize(
      Activity activity,
      String tokenReferenceId,
      int tokenServiceProvider,
      String displayName,
      int network,
      int requestCode) {
    lastTokenizeArguments =
        Arrays.asList(
            activity, tokenReferenceId, tokenServiceProvider, displayName, network, requestCode);
  }
}
