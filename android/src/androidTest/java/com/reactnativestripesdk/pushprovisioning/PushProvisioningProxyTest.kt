package com.reactnativestripesdk.pushprovisioning

import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.BridgeReactContext
import org.junit.Assert
import org.junit.Test

class PushProvisioningProxyTest {
  private val reactApplicationContext =
    BridgeReactContext(
      ApplicationProvider.getApplicationContext(),
    )

  @Test
  fun getApiVersion() {
    /**
     * An empty string is returned because we do not include compileOnly dependencies in our tests.
     * Including the compileOnly dependency causes some linters to complain, and one single test
     * isn't worth it. Once the push provisioning library is split into it's own SDK, we can
     * add back this test. (it should equal "2019-09-09" if the dependency is included).
     */
    Assert.assertEquals(
      "",
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
