package com.reactnativestripesdk.pushprovisioning

import android.app.Activity
import com.facebook.react.bridge.JavaOnlyMap
import com.google.android.gms.tapandpay.TapAndPayClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TapAndPayProxyTest {
  @After
  fun resetClient() {
    TapAndPayClient.lastTokenizeArguments = null
  }

  @Test
  fun `tokenize calls TapAndPayClient tokenize with the request`() {
    val activity = Robolectric.buildActivity(Activity::class.java).get()

    TapAndPayProxy.tokenize(
      activity,
      TapAndPayProxy.TokenizeRequest(
        tokenReferenceId = "tok_bridge_contracts",
        tokenServiceProvider = 1,
        displayName = "Bridge Contracts card",
        network = 3,
      ),
    )

    assertEquals(
      listOf(activity, "tok_bridge_contracts", 1, "Bridge Contracts card", 3, TapAndPayProxy.REQUEST_CODE_TOKENIZE),
      TapAndPayClient.lastTokenizeArguments,
    )
  }

  @Test
  fun `tokenizeRequest returns null when the token id is missing or blank`() {
    assertNull(TapAndPayProxy.tokenizeRequest(JavaOnlyMap(), "Bridge Contracts card"))
    assertNull(TapAndPayProxy.tokenizeRequest(JavaOnlyMap.of("id", ""), "Bridge Contracts card"))
    assertNull(TapAndPayProxy.tokenizeRequest(JavaOnlyMap.of("id", "   "), "Bridge Contracts card"))
  }

  @Test
  fun `tokenizeRequest defaults serviceProvider and network to zero when omitted`() {
    val request =
      TapAndPayProxy.tokenizeRequest(
        JavaOnlyMap.of("id", "tok_id_only"),
        "Bridge Contracts card",
      )

    assertEquals(
      TapAndPayProxy.TokenizeRequest(
        tokenReferenceId = "tok_id_only",
        tokenServiceProvider = 0,
        displayName = "Bridge Contracts card",
        network = 0,
      ),
      request,
    )
  }
}
