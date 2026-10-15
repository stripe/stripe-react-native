package com.reactnativestripesdk

import com.facebook.react.bridge.BridgeReactContext
import org.junit.rules.ExternalResource
import org.robolectric.RuntimeEnvironment

internal class ReactContextRule : ExternalResource() {
  lateinit var context: BridgeReactContext
    private set

  override fun before() {
    context = BridgeReactContext(RuntimeEnvironment.getApplication())
  }

  override fun after() {
    context.onHostPause()
    context.onHostDestroy()
    context.destroy()
  }
}
