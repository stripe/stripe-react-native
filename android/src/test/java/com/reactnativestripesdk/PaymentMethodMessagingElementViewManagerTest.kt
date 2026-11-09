@file:OptIn(PaymentMethodMessagingElementPreview::class)

package com.reactnativestripesdk

import androidx.appcompat.view.ContextThemeWrapper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementAppearanceException
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementConfigurationException
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class PaymentMethodMessagingElementViewManagerTest {
  @Test
  fun setConfiguration_MissingCurrency_DoesNotSetLatestElementConfig() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 301)
    try {
      val config =
        readableMapOf(
          "amount" to 1000,
        )
      manager.setConfiguration(fixture.view, DynamicFromObject(config))
      assertNull(fixture.view.latestElementConfig)
    } finally {
      fixture.close()
    }
  }

  @Test
  fun configureFailurePayload_MapsThrowableMessageAndViewTag() {
    val error =
      PaymentMethodMessagingElementConfigurationException("`currency` is required")
    val payload = configureFailurePayload(error, viewTag = 301)
    val result = requireNotNull(payload.getMap("result"))

    assertEquals("failed", result.getString("status"))
    assertEquals("`currency` is required", result.getString("message"))
    assertEquals(301, result.getInt("viewTag"))
  }

  @Test
  fun setAppearance_InvalidTextColorHex_DoesNotCrash() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 302)
    try {
      val appearance =
        readableMapOf(
          "textColor" to "#FF",
        )
      manager.setAppearance(fixture.view, DynamicFromObject(appearance))
      assertNull(fixture.view.latestElementConfig)

      val error =
        PaymentMethodMessagingElementAppearanceException(
          "Failed to set appearance. Expected hex string of length 3, 6, or 8, but received: FF",
        )
      val result = requireNotNull(configureFailurePayload(error, 302).getMap("result"))
      assertEquals("failed", result.getString("status"))
      assertEquals(
        "Failed to set appearance. Expected hex string of length 3, 6, or 8, but received: FF",
        result.getString("message"),
      )
      assertEquals(302, result.getInt("viewTag"))
    } finally {
      fixture.close()
    }
  }

  @Test
  fun getExportedCustomDirectEventTypeConstants_RegistersConfigureAndHeightEvents() {
    val manager = PaymentMethodMessagingElementViewManager()

    val eventTypes = manager.getExportedCustomDirectEventTypeConstants()

    assertEquals(
      "onConfigureResult",
      (eventTypes["topConfigureResult"] as Map<*, *>)["registrationName"],
    )
    assertEquals(
      "onHeightChanged",
      (eventTypes["topHeightChanged"] as Map<*, *>)["registrationName"],
    )
  }

  @Test
  fun configureEvent_DoesNotCoalesce() {
    val event =
      PaymentMethodMessagingElementConfigureEvent(
        surfaceId = 1,
        viewId = 303,
        payload = Arguments.createMap(),
      )

    assertFalse(event.canCoalesce())
  }

  private class MessagingElementFixture(
    val view: PaymentMethodMessagingElementView,
    private val bridgeContext: BridgeReactContext,
  ) {
    fun close() {
      bridgeContext.destroy()
    }
  }

  private fun messagingElementFixture(viewTag: Int): MessagingElementFixture {
    val app = RuntimeEnvironment.getApplication()
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(app)
    val bridgeContext = BridgeReactContext(app)
    val themed =
      ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    val themedContext = ThemedReactContext(bridgeContext, themed, null, -1)
    val view = PaymentMethodMessagingElementView(themedContext)
    view.id = viewTag
    return MessagingElementFixture(view, bridgeContext)
  }
}
