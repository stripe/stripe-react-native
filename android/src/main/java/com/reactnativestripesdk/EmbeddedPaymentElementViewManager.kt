package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.EmbeddedPaymentElementViewManagerDelegate
import com.facebook.react.viewmanagers.EmbeddedPaymentElementViewManagerInterface
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.asMapOrNull
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.reactnativestripesdk.utils.parseCustomPaymentMethods
import com.stripe.android.ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalCustomPaymentMethodsApi
import com.stripe.android.paymentsheet.PaymentSheet
import org.json.JSONArray
import org.json.JSONObject

@ReactModule(name = EmbeddedPaymentElementViewManager.NAME)
class EmbeddedPaymentElementViewManager :
  ViewGroupManager<EmbeddedPaymentElementView>(),
  EmbeddedPaymentElementViewManagerInterface<EmbeddedPaymentElementView> {
  companion object {
    const val NAME = "EmbeddedPaymentElementView"
  }

  private val delegate = EmbeddedPaymentElementViewManagerDelegate(this)

  override fun getName() = NAME

  override fun getDelegate() = delegate

  override fun createViewInstance(ctx: ThemedReactContext): EmbeddedPaymentElementView = EmbeddedPaymentElementView(ctx)

  override fun onDropViewInstance(view: EmbeddedPaymentElementView) {
    super.onDropViewInstance(view)

    view.handleOnDropViewInstance()
  }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "configuration")
  override fun setConfiguration(
    view: EmbeddedPaymentElementView,
    cfg: Dynamic,
  ) {
    val readableMap = cfg.asMapOrNull()
    if (readableMap == null) return

    val rowSelectionBehaviorType = mapToRowSelectionBehaviorType(readableMap)
    view.rowSelectionBehaviorType.value = rowSelectionBehaviorType

    val elementConfig = parseElementConfiguration(readableMap, view.context)
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
  override fun setIntentConfiguration(
    view: EmbeddedPaymentElementView,
    cfg: Dynamic,
  ) {
    val readableMap = cfg.asMapOrNull()
    if (readableMap == null) return

    // Detect which callback type to use based on the presence of the confirmation token handler
    val useConfirmationTokenCallback = readableMap.hasKey("confirmationTokenConfirmHandler")
    view.setUseConfirmationTokenCallback(useConfirmationTokenCallback)

    val intentConfig = parseIntentConfiguration(readableMap)
    view.latestIntentConfig = intentConfig
    view.latestElementConfig?.let { elemCfg ->
      view.configure(elemCfg, intentConfig)
    }
  }

  @SuppressLint("RestrictedApi")
  @OptIn(
    ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class,
    ExperimentalCustomPaymentMethodsApi::class,
  )
  private fun parseElementConfiguration(
    map: ReadableMap,
    context: Context,
  ): EmbeddedPaymentElement.Configuration {
    val merchantDisplayName = map.getString("merchantDisplayName").orEmpty()
    val allowsDelayedPaymentMethods = map.getBooleanOr("allowsDelayedPaymentMethods", false)
    val defaultBillingDetails = buildBillingDetails(map.getMap("defaultBillingDetails"))

    val customerConfiguration =
      try {
        buildCustomerConfiguration(map)
      } catch (_: PaymentSheetException) {
        throw Error() // TODO handle error
      }

    val googlePayConfig = buildGooglePayConfig(map.getMap("googlePay"))
    val linkConfig = buildLinkConfig(map.getMap("link"))
    val shippingDetails =
      map.getMap("defaultShippingDetails")?.let {
        AddressSheetView.buildAddressDetails(it)
      }
    val appearance =
      try {
        buildPaymentSheetAppearance(map.getMap("appearance"), context)
      } catch (_: PaymentSheetAppearanceException) {
        throw Error() // TODO handle error
      }
    val billingDetailsConfig =
      buildBillingDetailsCollectionConfiguration(
        map.getMap("billingDetailsCollectionConfiguration"),
      )
    val allowsRemovalOfLastSavedPaymentMethod = map.getBooleanOr("allowsRemovalOfLastSavedPaymentMethod", true)
    val primaryButtonLabel = map.getString("primaryButtonLabel")
    val paymentMethodOrder = map.getStringList("paymentMethodOrder")

    val formSheetAction = mapToFormSheetAction(map)

    val configurationBuilder =
      EmbeddedPaymentElement.Configuration
        .Builder(merchantDisplayName)
        .formSheetAction(formSheetAction)
        .allowsDelayedPaymentMethods(allowsDelayedPaymentMethods)
        .defaultBillingDetails(defaultBillingDetails)
        .customer(customerConfiguration)
        .googlePay(googlePayConfig)
        .link(linkConfig)
        .appearance(appearance)
        .shippingDetails(shippingDetails)
        .billingDetailsCollectionConfiguration(billingDetailsConfig)
        .preferredNetworks(
          mapToPreferredNetworks(
            map
              .getIntegerList("preferredNetworks")
              ?.let { ArrayList(it) },
          ),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .cardBrandAcceptance(mapToCardBrandAcceptance(map))
        .embeddedViewDisplaysMandateText(
          map.getBooleanOr("embeddedViewDisplaysMandateText", true),
        ).customPaymentMethods(
          parseCustomPaymentMethods(
            map.getMap("customPaymentMethodConfiguration"),
          ),
        )

    primaryButtonLabel?.let { configurationBuilder.primaryButtonLabel(it) }
    paymentMethodOrder?.let { configurationBuilder.paymentMethodOrder(it) }

    return configurationBuilder.build()
  }

  private fun parseIntentConfiguration(map: ReadableMap): PaymentSheet.IntentConfiguration {
    val intentConfig = buildIntentConfiguration(map)
    return intentConfig ?: throw IllegalArgumentException("IntentConfiguration is null")
  }

  override fun confirm(view: EmbeddedPaymentElementView) {
    view.confirm()
  }

  override fun clearPaymentOption(view: EmbeddedPaymentElementView) {
    view.clearPaymentOption()
  }

  override fun update(
    view: EmbeddedPaymentElementView,
    intentConfigurationJson: String?,
  ) {
    intentConfigurationJson?.let { json ->
      try {
        val jsonObject = JSONObject(json)
        val cfg = jsonToWritableMap(jsonObject)
        val intentConfig = buildIntentConfiguration(cfg)
        if (intentConfig != null) {
          view.update(intentConfig)
        }
      } catch (e: Exception) {
        android.util.Log.e("EmbeddedPaymentElement", "Failed to parse intent config JSON", e)
      }
    }
  }

  private fun jsonToWritableMap(json: JSONObject): WritableMap {
    val map = Arguments.createMap()
    val keys = json.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      when (val value = json.get(key)) {
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Double -> map.putDouble(key, value)
        is Long -> map.putDouble(key, value.toDouble())
        is String -> map.putString(key, value)
        is JSONObject -> map.putMap(key, jsonToWritableMap(value))
        is JSONArray -> map.putArray(key, jsonToWritableArray(value))
        JSONObject.NULL -> map.putNull(key)
        else -> map.putString(key, value.toString())
      }
    }
    return map
  }

  private fun jsonToWritableArray(json: JSONArray): WritableArray {
    val array = Arguments.createArray()
    for (i in 0 until json.length()) {
      when (val value = json.get(i)) {
        is Boolean -> array.pushBoolean(value)
        is Int -> array.pushInt(value)
        is Double -> array.pushDouble(value)
        is Long -> array.pushDouble(value.toDouble())
        is String -> array.pushString(value)
        is JSONObject -> array.pushMap(jsonToWritableMap(value))
        is JSONArray -> array.pushArray(jsonToWritableArray(value))
        JSONObject.NULL -> array.pushNull()
        else -> array.pushString(value.toString())
      }
    }
    return array
  }
}

internal fun mapToRowSelectionBehaviorType(map: ReadableMap?): RowSelectionBehaviorType {
  val rowSelectionBehavior =
    map
      ?.getMap("rowSelectionBehavior")
      ?.getString("type")
      ?.let { type ->
        when (type) {
          "immediateAction" -> RowSelectionBehaviorType.ImmediateAction
          else -> RowSelectionBehaviorType.Default
        }
      }
      ?: RowSelectionBehaviorType.Default
  return rowSelectionBehavior
}

internal fun mapToFormSheetAction(map: ReadableMap?): EmbeddedPaymentElement.FormSheetAction {
  val formSheetAction =
    map
      ?.getMap("formSheetAction")
      ?.getString("type")
      ?.let { type ->
        when (type) {
          "confirm" -> EmbeddedPaymentElement.FormSheetAction.Confirm
          else -> EmbeddedPaymentElement.FormSheetAction.Continue
        }
      }
      ?: EmbeddedPaymentElement.FormSheetAction.Continue
  return formSheetAction
}
