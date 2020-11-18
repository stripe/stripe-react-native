package com.reactnativestripesdk

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.stripe.android.Stripe

class StripeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private lateinit var stripe: Stripe

  override fun getName(): String {
    return "StripeSdk"
  }

  @ReactMethod
  fun initialise(publishableKey: String) {
    stripe = Stripe(reactApplicationContext, publishableKey)
  }

}
