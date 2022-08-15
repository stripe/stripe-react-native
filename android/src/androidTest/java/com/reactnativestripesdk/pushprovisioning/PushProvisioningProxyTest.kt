package com.reactnativestripesdk.pushprovisioning

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.*
import org.junit.Test

class PushProvisioningProxyTest {
  private val reactApplicationContext = ReactApplicationContext(
    ApplicationProvider.getApplicationContext<Context>()
  )

  @Test
  fun getApiVersion() {
    /**
     * An empty string is returned because we do not include compileOnly dependencies in our tests.
     * Including the compileOnly dependency causes some linters to complain, and one single test
     * isn't worth it. Once the push provisioning library is split into it's own SDK, we can
     * add back this test. (it should equal "2019-09-09" if the dependency is included).
     */
    assertEquals(
      "",
      PushProvisioningProxy.getApiVersion()
    )
  }

  @Test
  fun isNFCEnabled() {
    assertEquals(
      false,
      PushProvisioningProxy.isNFCEnabled(reactApplicationContext)
    )
  }

  @Test
  fun isTokenInWallet() {
    assertEquals(TapAndPayProxy.isTokenInWallet({}, "4242"), false)
  }
}
