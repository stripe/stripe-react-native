@file:OptIn(PaymentMethodMessagingElementPreview::class)

package com.reactnativestripesdk

import androidx.appcompat.view.ContextThemeWrapper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementConfigurationException
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.atLeastOnce
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class PaymentMethodMessagingElementViewManagerTest {
  @Test
  fun setConfiguration_MissingCurrency_DoesNotSetLatestElementConfig() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 301)
    try {
      val dispatcher = fixture.dispatcher
      val config =
        readableMapOf(
          "amount" to 1000,
        )
      manager.setConfiguration(fixture.view, DynamicFromObject(config))
      assertNull(fixture.view.latestElementConfig)

      val result = requireNotNull(captureConfigureResult(dispatcher))
      assertEquals("failed", result.getString("status"))
      assertEquals("`currency` is required", result.getString("message"))
      assertEquals("InvalidConfiguration", result.getString("code"))
      assertEquals(301, result.getInt("viewTag"))
    } finally {
      fixture.close()
    }
  }

  @Test
  fun configureFailurePayload_MapsThrowableMessageCodeAndViewTag() {
    val error =
      PaymentMethodMessagingElementConfigurationException("`currency` is required")
    val payload = configureFailurePayload(error, viewTag = 301)
    val result = requireNotNull(payload.getMap("result"))

    assertEquals("failed", result.getString("status"))
    assertEquals("`currency` is required", result.getString("message"))
    assertEquals("InvalidConfiguration", result.getString("code"))
    assertEquals(301, result.getInt("viewTag"))
  }

  @Test
  fun setAppearance_InvalidTextColorHex_DispatchesFailedAndDoesNotCrash() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 302)
    try {
      val dispatcher = fixture.dispatcher
      val appearance =
        readableMapOf(
          "textColor" to "#FF",
        )
      manager.setAppearance(fixture.view, DynamicFromObject(appearance))
      assertNull(fixture.view.latestElementConfig)

      val result = requireNotNull(captureConfigureResult(dispatcher))
      assertEquals("failed", result.getString("status"))
      assertEquals(
        "Failed to set appearance. Expected hex string of length 3, 6, or 8, but received: FF",
        result.getString("message"),
      )
      assertEquals("InvalidConfiguration", result.getString("code"))
      assertEquals(302, result.getInt("viewTag"))
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setAppearance_Invalid_AfterQueuedConfigure_ClearsConfigAndSupersedesGeneration() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 304)
    try {
      val dispatcher = fixture.dispatcher
      val validConfig =
        readableMapOf(
          "amount" to 1000,
          "currency" to "usd",
        )
      manager.setConfiguration(fixture.view, DynamicFromObject(validConfig))
      assertTrue(fixture.view.latestElementConfig != null)
      val queuedGeneration = fixture.view.currentConfigureGeneration()
      assertTrue(fixture.view.isConfigureGenerationCurrent(queuedGeneration))

      manager.setAppearance(
        fixture.view,
        DynamicFromObject(readableMapOf("textColor" to "#FF")),
      )

      assertNull(fixture.view.latestElementConfig)
      assertFalse(fixture.view.isConfigureGenerationCurrent(queuedGeneration))

      val result = requireNotNull(captureConfigureResult(dispatcher))
      assertEquals("failed", result.getString("status"))
      assertEquals("InvalidConfiguration", result.getString("code"))
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setConfiguration_Invalid_AfterQueuedConfigure_ClearsConfigAndSupersedesGeneration() {
    val manager = PaymentMethodMessagingElementViewManager()
    val fixture = messagingElementFixture(viewTag = 305)
    try {
      val dispatcher = fixture.dispatcher
      manager.setConfiguration(
        fixture.view,
        DynamicFromObject(
          readableMapOf(
            "amount" to 1000,
            "currency" to "usd",
          ),
        ),
      )
      val queuedGeneration = fixture.view.currentConfigureGeneration()
      assertTrue(fixture.view.latestElementConfig != null)

      manager.setConfiguration(
        fixture.view,
        DynamicFromObject(readableMapOf("amount" to 1000)),
      )

      assertNull(fixture.view.latestElementConfig)
      assertFalse(fixture.view.isConfigureGenerationCurrent(queuedGeneration))

      val result = requireNotNull(captureConfigureResult(dispatcher))
      assertEquals("failed", result.getString("status"))
      assertEquals("`currency` is required", result.getString("message"))
      assertEquals("InvalidConfiguration", result.getString("code"))
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

  /**
   * Test-only subclass: overrides [PaymentMethodMessagingElementView.dispatchEvent] so unit
   * tests can observe events without a mutable injection field on the release view.
   */
  private class RecordingPaymentMethodMessagingElementView(
    context: android.content.Context,
    private val recordingDispatcher: EventDispatcher,
  ) : PaymentMethodMessagingElementView(context) {
    override fun dispatchEvent(eventFactory: () -> Event<*>) {
      recordingDispatcher.dispatchEvent(eventFactory())
    }
  }

  private class MessagingElementFixture(
    val view: RecordingPaymentMethodMessagingElementView,
    val dispatcher: EventDispatcher,
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
    val dispatcher = mock(EventDispatcher::class.java)
    val view = RecordingPaymentMethodMessagingElementView(themedContext, dispatcher)
    view.id = viewTag
    return MessagingElementFixture(view, dispatcher, bridgeContext)
  }

  private fun captureConfigureResult(dispatcher: EventDispatcher): com.facebook.react.bridge.ReadableMap? {
    @Suppress("UNCHECKED_CAST")
    val captor = ArgumentCaptor.forClass(Event::class.java) as ArgumentCaptor<Event<*>>
    // Mockito's capture() returns null during verification; cast avoids Kotlin NPE checks.
    verify(dispatcher, atLeastOnce()).dispatchEvent(uncheckedCapture(captor))
    val configureEvents =
      captor.allValues.filterIsInstance<PaymentMethodMessagingElementConfigureEvent>()
    assertEquals(1, configureEvents.size)
    return configureEvents[0].resultMap()
  }

  @Suppress("UNCHECKED_CAST")
  private fun <T> uncheckedCapture(captor: ArgumentCaptor<T>): T = captor.capture() as T
}
