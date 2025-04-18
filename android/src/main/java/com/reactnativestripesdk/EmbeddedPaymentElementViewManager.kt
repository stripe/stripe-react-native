package com.reactnativestripesdk

import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.reactnativestripesdk.utils.toBundleObject
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi
import com.stripe.android.paymentsheet.PaymentSheet

@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
@ReactModule(name = StripeEmbeddedPaymentElementViewManager.NAME)
class StripeEmbeddedPaymentElementViewManager : ViewGroupManager<EmbeddedPaymentElementView>() {
  companion object {
    const val NAME = "StripeEmbeddedPaymentElementView"
  }

  override fun getName() = NAME

  override fun createViewInstance(ctx: ThemedReactContext): EmbeddedPaymentElementView =
    EmbeddedPaymentElementView(ctx).apply {
      setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
      )
    }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "configuration")
  fun setConfiguration(view: EmbeddedPaymentElementView, cfg: ReadableMap) {
    val elementConfig = parseElementConfiguration(cfg)
    view.latestElementConfig = elementConfig
    // if intentConfig is already set, configure immediately:
    view.latestIntentConfig?.let { intentCfg ->
      view.configure(elementConfig, intentCfg)
      view.post {
        view.requestLayout()
        view.invalidate()
      }
    }
  }

  @ReactProp(name = "intentConfiguration")
  fun setIntentConfiguration(view: EmbeddedPaymentElementView, cfg: ReadableMap) {
    val intentConfig = parseIntentConfiguration(cfg)
    view.latestIntentConfig = intentConfig
    view.latestElementConfig?.let { elemCfg ->
      view.configure(elemCfg, intentConfig)
    }
  }

  @ReactProp(name = "confirm", defaultBoolean = false)
  fun setConfirm(view: EmbeddedPaymentElementView, confirm: Boolean) {
    if (confirm) view.confirm()
  }

  override fun getExportedCustomDirectEventTypeConstants() = mapOf(
    "embeddedPaymentElementDidUpdatePaymentOption" to mapOf("registrationName" to "embeddedPaymentElementDidUpdatePaymentOption"),
    "onFormSheetConfirmComplete" to mapOf("registrationName" to "onFormSheetConfirmComplete"),
    "embeddedPaymentElementDidConfigure" to mapOf("registrationName" to "embeddedPaymentElementDidConfigure"),
    "embeddedPaymentElementDidUpdateHeight" to mapOf("registrationName" to "embeddedPaymentElementDidUpdateHeight")
  )

  private fun parseElementConfiguration(map: ReadableMap): EmbeddedPaymentElement.Configuration {
    val configuration = EmbeddedPaymentElement.Configuration.Builder("My Store")
      .allowsDelayedPaymentMethods(true)
      .build()
    return configuration
  }

  private fun parseIntentConfiguration(map: ReadableMap): PaymentSheet.IntentConfiguration {
    val intentConfig = PaymentSheetFragment.buildIntentConfiguration(toBundleObject(map))
    return intentConfig ?: throw IllegalArgumentException("IntentConfiguration is null")
  }
}
