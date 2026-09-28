package com.reactnativestripesdk.identity

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap

/** Keeps Identity's optional Android dependency out of the core module. */
internal interface IdentityVerificationSheetManager {
  fun present(options: ReadableMap, promise: Promise)

  fun invalidate()

  companion object {
    fun create(context: ReactApplicationContext): IdentityVerificationSheetManager =
      IdentityVerificationSheetManagerImpl(context)
  }
}
