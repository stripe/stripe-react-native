package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.EmbeddedPaymentElementViewManagerDelegate
import com.facebook.react.viewmanagers.EmbeddedPaymentElementViewManagerInterface
import com.reactnativestripesdk.PaymentSheetFragment.Companion.buildCustomerConfiguration
import com.reactnativestripesdk.PaymentSheetFragment.Companion.buildGooglePayConfig
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.reactnativestripesdk.utils.toBundleObject
import com.stripe.android.ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi
import com.stripe.android.paymentsheet.PaymentSheet

@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
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

  override fun createViewInstance(ctx: ThemedReactContext): EmbeddedPaymentElementView =
    EmbeddedPaymentElementView(ctx).apply {
      setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed,
      )
    }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "configuration")
  override fun setConfiguration(
    view: EmbeddedPaymentElementView,
    cfg: Dynamic,
  ) {
    val elementConfig = parseElementConfiguration(cfg.asMap(), view.context)
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
    val intentConfig = parseIntentConfiguration(cfg.asMap())
    view.latestIntentConfig = intentConfig
    view.latestElementConfig?.let { elemCfg ->
      view.configure(elemCfg, intentConfig)
    }
  }

  @SuppressLint("RestrictedApi")
  @OptIn(ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class)
  private fun parseElementConfiguration(
    map: ReadableMap,
    context: Context,
  ): EmbeddedPaymentElement.Configuration {
    val merchantDisplayName = map.getString("merchantDisplayName").orEmpty()
    val allowsDelayedPaymentMethods = map.getBoolean("allowsDelayedPaymentMethods")
    var defaultBillingDetails: PaymentSheet.BillingDetails? = null
    val billingDetailsMap = map.getMap("defaultBillingDetails")
    if (billingDetailsMap != null) {
      val addressBundle = billingDetailsMap.getMap("address")
      val address =
        PaymentSheet.Address(
          addressBundle?.getString("city"),
          addressBundle?.getString("country"),
          addressBundle?.getString("line1"),
          addressBundle?.getString("line2"),
          addressBundle?.getString("postalCode"),
          addressBundle?.getString("state"),
        )
      defaultBillingDetails =
        PaymentSheet.BillingDetails(
          address,
          billingDetailsMap.getString("email"),
          billingDetailsMap.getString("name"),
          billingDetailsMap.getString("phone"),
        )
    }

    val customerConfiguration =
      try {
        buildCustomerConfiguration(toBundleObject(map))
      } catch (error: PaymentSheetException) {
        throw Error() // TODO handle error
      }

    val googlePayConfig = buildGooglePayConfig(toBundleObject(map.getMap("googlePay")))
    val shippingDetails =
      map.getMap("defaultShippingDetails")?.let {
        AddressSheetView.buildAddressDetails(it)
      }
    val appearance =
      try {
        buildPaymentSheetAppearance(toBundleObject(map.getMap("appearance")), context)
      } catch (error: PaymentSheetAppearanceException) {
        throw Error() // TODO handle error
      }
    val billingConfigParams = map.getMap("billingDetailsCollectionConfiguration")
    val billingDetailsConfig =
      PaymentSheet.BillingDetailsCollectionConfiguration(
        name = mapToCollectionMode(billingConfigParams?.getString("name")),
        phone = mapToCollectionMode(billingConfigParams?.getString("phone")),
        email = mapToCollectionMode(billingConfigParams?.getString("email")),
        address = mapToAddressCollectionMode(billingConfigParams?.getString("address")),
        attachDefaultsToPaymentMethod =
          billingConfigParams?.getBoolean("attachDefaultsToPaymentMethod") ?: false,
      )
    val allowsRemovalOfLastSavedPaymentMethod =
      if (map.hasKey("allowsRemovalOfLastSavedPaymentMethod")) {
        map.getBoolean("allowsRemovalOfLastSavedPaymentMethod")
      } else {
        true
      }
    val primaryButtonLabel = map.getString("primaryButtonLabel")
    val paymentMethodOrder = map.getStringArrayList("paymentMethodOrder")

    val formSheetAction =
      map
        .getMap("formSheetAction")
        ?.getString("type")
        ?.let { type ->
          when (type) {
            "confirm" -> EmbeddedPaymentElement.FormSheetAction.Confirm
            else -> EmbeddedPaymentElement.FormSheetAction.Continue
          }
        }
        ?: EmbeddedPaymentElement.FormSheetAction.Continue

    val configurationBuilder =
      EmbeddedPaymentElement.Configuration
        .Builder(merchantDisplayName)
        .formSheetAction(formSheetAction)
        .allowsDelayedPaymentMethods(allowsDelayedPaymentMethods ?: false)
        .defaultBillingDetails(defaultBillingDetails)
        .customer(customerConfiguration)
        .googlePay(googlePayConfig)
        .appearance(appearance)
        .shippingDetails(shippingDetails)
        .billingDetailsCollectionConfiguration(billingDetailsConfig)
        .preferredNetworks(
          mapToPreferredNetworks(
            map
              .getIntegerArrayList("preferredNetworks")
              ?.let { ArrayList(it) },
          ),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .cardBrandAcceptance(mapToCardBrandAcceptance(toBundleObject(map)))

    primaryButtonLabel?.let { configurationBuilder.primaryButtonLabel(it) }
    paymentMethodOrder?.let { configurationBuilder.paymentMethodOrder(it) }

    return configurationBuilder.build()
  }

  private fun parseIntentConfiguration(map: ReadableMap): PaymentSheet.IntentConfiguration {
    val intentConfig = PaymentSheetFragment.buildIntentConfiguration(toBundleObject(map))
    return intentConfig ?: throw IllegalArgumentException("IntentConfiguration is null")
  }
}

/**
 * Returns a List of Strings if the key exists and points to an array of strings, or null otherwise.
 */
fun ReadableMap.getStringArrayList(key: String): List<String>? {
  if (!hasKey(key) || getType(key) != ReadableType.Array) return null
  val array: ReadableArray = getArray(key) ?: return null

  val result = mutableListOf<String>()
  for (i in 0 until array.size()) {
    // getString returns null if the element isn't actually a string
    array.getString(i)?.let { result.add(it) }
  }
  return result
}

/**
 * Returns a List of Ints if the key exists and points to an array of numbers, or null otherwise.
 */
fun ReadableMap.getIntegerArrayList(key: String): List<Int>? {
  if (!hasKey(key) || getType(key) != ReadableType.Array) return null
  val array: ReadableArray = getArray(key) ?: return null

  val result = mutableListOf<Int>()
  for (i in 0 until array.size()) {
    // getType check to skip non-number entries
    if (array.getType(i) == ReadableType.Number) {
      // if it's actually a float/double, this will truncate; adjust as needed
      result.add(array.getInt(i))
    }
  }
  return result
}
