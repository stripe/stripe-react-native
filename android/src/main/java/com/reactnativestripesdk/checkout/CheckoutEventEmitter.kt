package com.reactnativestripesdk.checkout

import com.facebook.react.bridge.ReadableMap

/** The events a [NativeCheckoutControllerInstance] sends to JavaScript. */
interface CheckoutEventEmitter {
  fun emitCheckoutControllerDidUpdate(value: ReadableMap)

  fun emitCheckoutExpressCheckoutDidComplete(value: ReadableMap)
}
