package com.reactnativestripesdk.pushprovisioning

import android.view.ContextThemeWrapper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativestripesdk.utils.readableMapOf
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class AddToWalletButtonViewTest {
  @Test
  fun setEphemeralKey_serializesReadableMapAsJson() {
    val (view, bridgeContext) = addToWalletButtonView()
    try {
      val secret = "ek_test_123,foo=bar}baz"
      view.setEphemeralKey(
        readableMapOf(
          "id" to "eph_test",
          "object" to "ephemeral_key",
          "secret" to secret,
        ),
      )

      val serialized = ephemeralKeyField(view)
      assertTrue(serialized!!.startsWith("{"))
      val json = JSONObject(serialized)
      assertEquals("eph_test", json.getString("id"))
      assertEquals(secret, json.getString("secret"))

      val roundTrip = JSONObject(serialized)
      assertEquals(secret, roundTrip.getString("secret"))
    } finally {
      bridgeContext.destroy()
    }
  }

  private fun ephemeralKeyField(view: AddToWalletButtonView): String? {
    val field = AddToWalletButtonView::class.java.getDeclaredField("ephemeralKey")
    field.isAccessible = true
    return field.get(view) as String?
  }

  private fun addToWalletButtonView(): Pair<AddToWalletButtonView, BridgeReactContext> {
    val app = RuntimeEnvironment.getApplication()
    val bridgeContext = BridgeReactContext(app)
    val themed =
      ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    val themedContext = ThemedReactContext(bridgeContext, themed, null, -1)
    return AddToWalletButtonView(themedContext) to bridgeContext
  }
}
