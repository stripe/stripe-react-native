package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.reactnativestripesdk.utils.createFailedError

@ReactModule(name = NativeOnrampSdkModuleSpec.NAME)
class FakeOnrampSdkModule(
  reactContext: ReactApplicationContext,
) : NativeOnrampSdkModuleSpec(reactContext) {
  @ReactMethod
  override fun initialise(
    params: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(null)
  }

  @ReactMethod
  override fun configureOnramp(
    config: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(
      createFailedError(
        NotImplementedError(
          "StripeCryptoOnramp is not available. " +
            "To enable, add the 'ext { includeOnramp = true }' to your app's build.gradle.",
        ),
      ),
    )
  }

  @ReactMethod
  override fun hasLinkAccount(
    email: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun registerLinkUser(
    info: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun registerWalletAddress(
    walletAddress: String?,
    network: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun attachKycInfo(
    kycInfo: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun updatePhoneNumber(
    phone: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun authenticateUser(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun verifyIdentity(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun collectPaymentMethod(
    paymentMethod: String?,
    platformPayParams: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun provideCheckoutClientSecret(clientSecret: String?) {
    // No-op
  }

  @ReactMethod
  override fun createCryptoPaymentToken(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun performCheckout(
    onrampSessionId: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun onrampAuthorize(
    linkAuthIntentId: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  @ReactMethod
  override fun logout(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }
}
