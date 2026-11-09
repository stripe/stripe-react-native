@file:OptIn(PaymentMethodMessagingElementPreview::class)

package com.reactnativestripesdk

import androidx.appcompat.view.ContextThemeWrapper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
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
  fun setConfiguration_MissingCurrency_EmitsFailedConfigureResult() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 301)
    try {
      val config =
        readableMapOf(
          "amount" to 1000,
        )
      manager.setConfiguration(fixture.view, DynamicFromObject(config))
      assertNull(fixture.view.latestElementConfig)
      assertEquals(1, fixture.configureResults.size)
      val result = fixture.configureResults.single()
      assertEquals("failed", result.getString("status"))
      assertEquals("`currency` is required", result.getString("message"))
      assertEquals(301, result.getInt("viewTag"))
      assertEquals(
        listOf("topConfigureResult", "topHeightChanged"),
        fixture.eventNames,
      )
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setAppearance_InvalidTextColorHex_EmitsFailedConfigureResult() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 302)
    try {
      val appearance =
        readableMapOf(
          "textColor" to "#FF",
        )
      manager.setAppearance(fixture.view, DynamicFromObject(appearance))
      assertEquals(1, fixture.configureResults.size)
      val result = fixture.configureResults.single()
      assertEquals("failed", result.getString("status"))
      assertEquals(
        "Failed to set appearance. Expected hex string of length 3, 6, or 8, but received: FF",
        result.getString("message"),
      )
      assertEquals(302, result.getInt("viewTag"))
      assertEquals(
        listOf("topConfigureResult", "topHeightChanged"),
        fixture.eventNames,
      )
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
    val configureResults: MutableList<ReadableMap>,
    val eventNames: MutableList<String>,
    private val bridgeContext: BridgeReactContext,
  ) {
    fun close() {
      bridgeContext.destroy()
    }
  }

  private fun messagingElementFixture(viewTag: Int): MessagingElementFixture {
    val app = RuntimeEnvironment.getApplication()
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(app)
    val configureResults = mutableListOf<ReadableMap>()
    val eventNames = mutableListOf<String>()
    val bridgeContext =
      BridgeReactContext(app)
    val themed =
      ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    val themedContext = ThemedReactContext(bridgeContext, themed, null, -1)
    val view = PaymentMethodMessagingElementView(themedContext)
    view.id = viewTag
    view.eventDispatcherForTest = { eventName, eventData ->
      eventNames.add(eventName)
      if (eventName == "topConfigureResult") {
        configureResults.add(requireNotNull(eventData).getMap("result")!!)
      }
    }
    return MessagingElementFixture(view, configureResults, eventNames, bridgeContext)
  }
}
