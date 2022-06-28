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
    // This value very rarely changes, so the test is hard coded
    assertEquals(
      "2019-09-09",
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
