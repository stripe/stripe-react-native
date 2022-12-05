package com.stripesdk

import com.facebook.react.bridge.ReactApplicationContext

abstract class StripeSdkSpec internal constructor(context: ReactApplicationContext) :
  NativeStripeSdkSpec(context) {
}
