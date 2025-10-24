package com.reactnativestripesdk

import android.annotation.SuppressLint
import com.facebook.react.bridge.ReactApplicationContext
import com.reactnativestripesdk.utils.StripeUIManager
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher

@ReactNativeSdkInternal
class GooglePayPaymentMethodLauncherManager(
  context: ReactApplicationContext,
  private val isTestEnv: Boolean,
  private val paymentMethodRequired: Boolean,
) : StripeUIManager(context) {
  override fun onPresent() {
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return
    @SuppressLint("RestrictedApi")
    GooglePayPaymentMethodLauncher(
      activity = activity,
      signal = signal,
      config =
        GooglePayPaymentMethodLauncher.Config(
          environment =
            if (isTestEnv) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
          existingPaymentMethodRequired = paymentMethodRequired,
          merchantCountryCode =
            "", // Unnecessary since all we are checking for is Google Pay availability
          merchantName = "", // Same as above
        ),
      readyCallback = {
        promise?.resolve(it)
      },
      resultCallback = {},
    )
  }
}
