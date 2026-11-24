package com.reactnativestripesdk.pushprovisioning

import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.BridgeReactContext
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PushProvisioningProxyTest {
  private val reactApplicationContext =
    BridgeReactContext(
      ApplicationProvider.getApplicationContext(),
    )

  @Test
  fun getApiVersion() {
    Assert.assertEquals(
      "2026-05-27.dahlia",
      PushProvisioningProxy.getApiVersion(),
    )
  }

  @Test
  fun isNFCEnabled() {
    Assert.assertEquals(
      false,
      PushProvisioningProxy.isNFCEnabled(reactApplicationContext),
    )
  }

  @Test
  fun isTokenInWallet() {
    Assert.assertEquals(TapAndPayProxy.isTokenInWallet({}, "4242"), false)
  }
}
