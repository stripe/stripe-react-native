package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.reactnativestripesdk.utils.createFailedError

@ReactModule(name = NativeOnrampSdkModuleSpec.NAME)
class FakeOnrampSdkModule(
  reactContext: ReactApplicationContext,
) : NativeOnrampSdkModuleSpec(reactContext) {
  override fun initialise(
    params: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(null)
  }

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

  override fun hasLinkAccount(
    email: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun registerLinkUser(
    info: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun registerWalletAddress(
    walletAddress: String?,
    network: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun attachKycInfo(
    kycInfo: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun updatePhoneNumber(
    phone: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun authenticateUser(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun verifyIdentity(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun collectPaymentMethod(
    paymentMethod: String?,
    platformPayParams: ReadableMap?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun provideCheckoutClientSecret(clientSecret: String?) {
    // No-op
  }

  override fun createCryptoPaymentToken(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun performCheckout(
    onrampSessionId: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun onrampAuthorize(
    linkAuthIntentId: String?,
    promise: Promise?,
  ) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }

  override fun logout(promise: Promise?) {
    promise?.resolve(createFailedError(NotImplementedError()))
  }
}
