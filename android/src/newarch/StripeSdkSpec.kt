package com.reactnativestripesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.stripesdk.NativeStripeSdkSpec

abstract class StripeSdkSpec internal constructor(context: ReactApplicationContext) :
  NativeStripeSdkSpec(context) {
}
