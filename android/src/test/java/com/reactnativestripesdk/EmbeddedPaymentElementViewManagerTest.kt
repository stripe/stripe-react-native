package com.reactnativestripesdk

import android.view.ContextThemeWrapper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.DynamicFromObject
import com.facebook.react.bridge.JavaScriptModule
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class EmbeddedPaymentElementViewManagerTest {
  // ============================================
  // mapToRowSelectionBehaviorType Tests
  // ============================================

  @Test
  fun mapToRowSelectionBehaviorType_NullMap_DefaultsToDefault() {
    val result = mapToRowSelectionBehaviorType(null)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_EmptyMap_DefaultsToDefault() {
    val params = readableMapOf()
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_NoRowSelectionBehaviorKey_DefaultsToDefault() {
    val params =
      readableMapOf(
        "someOtherKey" to "value",
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_TypeDefault() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to
          readableMapOf(
            "type" to "default",
          ),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_TypeImmediateAction() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to
          readableMapOf(
            "type" to "immediateAction",
          ),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.ImmediateAction, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_InvalidType_DefaultsToDefault() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to
          readableMapOf(
            "type" to "invalid",
          ),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  @Test
  fun mapToRowSelectionBehaviorType_NullType_DefaultsToDefault() {
    val params =
      readableMapOf(
        "rowSelectionBehavior" to readableMapOf(),
      )
    val result = mapToRowSelectionBehaviorType(params)
    assertEquals(RowSelectionBehaviorType.Default, result)
  }

  // ============================================
  // mapToFormSheetAction Tests
  // ============================================

  @Test
  fun mapToFormSheetAction_NullMap_DefaultsToContinue() {
    val result = mapToFormSheetAction(null)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_EmptyMap_DefaultsToContinue() {
    val params = readableMapOf()
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_NoFormSheetActionKey_DefaultsToContinue() {
    val params =
      readableMapOf(
        "someOtherKey" to "value",
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_TypeContinue() {
    val params =
      readableMapOf(
        "formSheetAction" to
          readableMapOf(
            "type" to "continue",
          ),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_TypeConfirm() {
    val params =
      readableMapOf(
        "formSheetAction" to
          readableMapOf(
            "type" to "confirm",
          ),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Confirm, result)
  }

  @Test
  fun mapToFormSheetAction_InvalidType_DefaultsToContinue() {
    val params =
      readableMapOf(
        "formSheetAction" to
          readableMapOf(
            "type" to "invalid",
          ),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  @Test
  fun mapToFormSheetAction_NullType_DefaultsToContinue() {
    val params =
      readableMapOf(
        "formSheetAction" to readableMapOf(),
      )
    val result = mapToFormSheetAction(params)
    assertEquals(EmbeddedPaymentElement.FormSheetAction.Continue, result)
  }

  // ============================================
  // Configuration prop setters surface loading errors
  // ============================================

  @Test
  fun setConfiguration_InvalidAppearanceFont_EmitsLoadingFailed() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      val config =
        readableMapOf(
          "merchantDisplayName" to "Test Merchant",
          "appearance" to
            readableMapOf(
              "font" to readableMapOf("family" to "missing_font"),
            ),
        )
      manager.setConfiguration(fixture.view, DynamicFromObject(config))
      assertNull(fixture.view.latestElementConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
      assertEquals(
        "Encountered an error when setting a custom font: Failed to find font: missing_font",
        fixture.loadingFailedMessages.single(),
      )
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setConfiguration_InvalidCustomerConfiguration_EmitsLoadingFailed() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      val config =
        readableMapOf(
          "merchantDisplayName" to "Test Merchant",
          "customerId" to "cus_123",
          "customerEphemeralKeySecret" to "ek_test",
          "customerSessionClientSecret" to "cuss_test",
        )
      manager.setConfiguration(fixture.view, DynamicFromObject(config))
      assertNull(fixture.view.latestElementConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
      assertEquals(
        "`customerEphemeralKeySecret` and `customerSessionClientSecret` cannot both be set",
        fixture.loadingFailedMessages.single(),
      )
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setIntentConfiguration_MissingMode_EmitsLoadingFailed() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      val intentConfig = readableMapOf()
      manager.setIntentConfiguration(fixture.view, DynamicFromObject(intentConfig))
      assertNull(fixture.view.latestIntentConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
      assertEquals(
        "If `intentConfiguration` is provided, `intentConfiguration.mode` is required",
        fixture.loadingFailedMessages.single(),
      )
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setConfiguration_ValidThenInvalid_ClearsLatestElementConfig() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      manager.setConfiguration(fixture.view, DynamicFromObject(validConfiguration()))
      assertNotNull(fixture.view.latestElementConfig)

      manager.setConfiguration(fixture.view, DynamicFromObject(invalidConfiguration()))

      assertNull(fixture.view.latestElementConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setIntentConfiguration_ValidThenInvalid_ClearsLatestIntentConfig() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      manager.setIntentConfiguration(fixture.view, DynamicFromObject(validIntentConfiguration()))
      assertNotNull(fixture.view.latestIntentConfig)

      manager.setIntentConfiguration(fixture.view, DynamicFromObject(invalidIntentConfiguration()))

      assertNull(fixture.view.latestIntentConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setConfiguration_ValidThenInvalidThenIntent_DoesNotReuseOldConfiguration() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      manager.setConfiguration(fixture.view, DynamicFromObject(validConfiguration()))
      manager.setConfiguration(fixture.view, DynamicFromObject(invalidConfiguration()))

      manager.setIntentConfiguration(fixture.view, DynamicFromObject(validIntentConfiguration()))

      assertNull(fixture.view.latestElementConfig)
      assertNotNull(fixture.view.latestIntentConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
    } finally {
      fixture.close()
    }
  }

  @Test
  fun setIntentConfiguration_ValidThenInvalidThenConfiguration_DoesNotReuseOldIntent() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      manager.setIntentConfiguration(fixture.view, DynamicFromObject(validIntentConfiguration()))
      manager.setIntentConfiguration(fixture.view, DynamicFromObject(invalidIntentConfiguration()))

      manager.setConfiguration(fixture.view, DynamicFromObject(validConfiguration()))

      assertNotNull(fixture.view.latestElementConfig)
      assertNull(fixture.view.latestIntentConfig)
      assertEquals(1, fixture.loadingFailedMessages.size)
    } finally {
      fixture.close()
    }
  }

  @Test
  fun update_InvalidIntentConfiguration_ClearsLatestIntentConfigAndCompletesWithFailure() {
    val manager = EmbeddedPaymentElementViewManager()
    val fixture = embeddedElementFixture()
    try {
      manager.setIntentConfiguration(fixture.view, DynamicFromObject(validIntentConfiguration()))
      assertNotNull(fixture.view.latestIntentConfig)

      manager.update(fixture.view, "{}")

      assertNull(fixture.view.latestIntentConfig)
      assertEquals(
        "If `intentConfiguration` is provided, `intentConfiguration.mode` is required",
        fixture.loadingFailedMessages.single(),
      )
      assertEquals(listOf(null), fixture.updateCompletePayloads)
    } finally {
      fixture.close()
    }
  }

  private class EmbeddedElementFixture(
    val view: EmbeddedPaymentElementView,
    val loadingFailedMessages: MutableList<String>,
    val updateCompletePayloads: MutableList<Any?>,
    private val bridgeContext: BridgeReactContext,
  ) {
    fun close() {
      bridgeContext.destroy()
    }
  }

  private fun embeddedElementFixture(): EmbeddedElementFixture {
    val app = RuntimeEnvironment.getApplication()
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(app)
    val loadingFailedMessages = mutableListOf<String>()
    val updateCompletePayloads = mutableListOf<Any?>()
    val bridgeContext =
      object : BridgeReactContext(app) {
        private val stripeSdkModule by lazy { StripeSdkModule(this).also { it.initialize() } }

        override fun <T : NativeModule> getNativeModule(nativeModuleInterface: Class<T>): T? =
          nativeModuleInterface.cast(stripeSdkModule)

        override fun <T : JavaScriptModule> getJSModule(jsInterface: Class<T>): T =
          requireNotNull(
            jsInterface.cast(
              object : DeviceEventManagerModule.RCTDeviceEventEmitter {
                override fun emit(
                  eventName: String,
                  data: Any?,
                ) {
                  if (eventName == "embeddedPaymentElementLoadingFailed") {
                    loadingFailedMessages.add((data as ReadableMap).getString("message")!!)
                  } else if (eventName == "embeddedPaymentElementUpdateComplete") {
                    updateCompletePayloads.add(data)
                  }
                }
              },
            ),
          )
      }
    val themed =
      ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    val themedContext = ThemedReactContext(bridgeContext, themed, null, -1)
    val view = EmbeddedPaymentElementView(themedContext)
    return EmbeddedElementFixture(view, loadingFailedMessages, updateCompletePayloads, bridgeContext)
  }

  private fun validConfiguration(): ReadableMap =
    readableMapOf(
      "merchantDisplayName" to "Test Merchant",
    )

  private fun invalidConfiguration(): ReadableMap =
    readableMapOf(
      "merchantDisplayName" to "Test Merchant",
      "customerId" to "cus_123",
      "customerEphemeralKeySecret" to "ek_test",
      "customerSessionClientSecret" to "cuss_test",
    )

  private fun validIntentConfiguration(): ReadableMap =
    readableMapOf(
      "mode" to
        readableMapOf(
          "amount" to 1000,
          "currencyCode" to "usd",
        ),
    )

  private fun invalidIntentConfiguration(): ReadableMap = readableMapOf()
}
