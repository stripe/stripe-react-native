package com.reactnativestripesdk.identity

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.createError

internal class IdentityVerificationSheetManagerImpl(
  @Suppress("UNUSED_PARAMETER") context: ReactApplicationContext,
) : IdentityVerificationSheetManager {
  override fun present(options: ReadableMap, promise: Promise) {
    promise.resolve(
      createError(
        "FlowFailed",
        "Stripe Identity is not included. Set StripeSdk_includeIdentity=true in android/gradle.properties " +
          "and minSdkVersion to 24 or higher, then rebuild the app.",
      ).apply { putString("status", "FlowFailed") },
    )
  }

  override fun invalidate() = Unit
}
