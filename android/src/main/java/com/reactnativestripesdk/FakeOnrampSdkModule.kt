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
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun hasLinkAccount(
    email: String?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun registerLinkUser(
    info: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun registerWalletAddress(
    walletAddress: String?,
    network: String?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun attachKycInfo(
    kycInfo: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun updatePhoneNumber(
    phone: String?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun authenticateUser(promise: Promise?) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun verifyIdentity(promise: Promise?) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun presentKycInfoVerification(
    updatedAddress: ReadableMap?,
    promise: Promise,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun collectPaymentMethod(
    paymentMethod: String?,
    platformPayParams: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun provideCheckoutClientSecret(clientSecret: String?) {
    // No-op
  }

  @ReactMethod
  override fun createCryptoPaymentToken(promise: Promise?) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun performCheckout(
    onrampSessionId: String?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun onrampAuthorize(
    linkAuthIntentId: String?,
    promise: Promise?,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun logout(promise: Promise?) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun getCryptoTokenDisplayData(
    token: ReadableMap,
    promise: Promise,
  ) {
    promise?.resolveNotImplemented()
  }

  @ReactMethod
  override fun authenticateUserWithToken(
    token: String,
    promise: Promise,
  ) {
    promise.resolveNotImplemented()
  }

  private fun Promise.resolveNotImplemented() {
    this.resolve(
      createFailedError(
        NotImplementedError(
          "To enable Onramp, add 'StripeSdk_includeOnramp=true' to gradle.properties.",
        ),
      ),
    )
  }
}
