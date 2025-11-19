package com.reactnativestripesdk.addresssheet

import android.annotation.SuppressLint
import android.util.Log
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.reactnativestripesdk.buildPaymentSheetAppearance
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.getBooleanOr
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher

@SuppressLint("ViewConstructor")
class AddressSheetView(
  private val context: ThemedReactContext,
) : FrameLayout(context) {
  private var isVisible = false
  private var appearanceParams: ReadableMap? = null
  private var defaultAddress: AddressDetails? = null
  private var allowedCountries: Set<String> = emptySet()
  private var buttonTitle: String? = null
  private var sheetTitle: String? = null
  private var googlePlacesApiKey: String? = null
  private var autocompleteCountries: Set<String> = emptySet()
  private var additionalFields: AddressLauncher.AdditionalFieldsConfiguration? = null
  private var addressSheetManager: AddressLauncherManager? = null

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()

    addressSheetManager?.destroy()
    addressSheetManager = null
  }

  private fun onSubmit(params: WritableMap) {
    UIManagerHelper.getEventDispatcherForReactTag(context, id)?.dispatchEvent(
      AddressSheetEvent(context.surfaceId, id, AddressSheetEvent.EventType.OnSubmit, params),
    )
  }

  private fun onError(params: WritableMap?) {
    UIManagerHelper.getEventDispatcherForReactTag(context, id)?.dispatchEvent(
      AddressSheetEvent(context.surfaceId, id, AddressSheetEvent.EventType.OnError, params),
    )
  }

  fun setVisible(newVisibility: Boolean) {
    if (newVisibility && !isVisible) {
      launchAddressSheet()
    } else if (!newVisibility && isVisible) {
      Log.w(
        "StripeReactNative",
        "Programmatically dismissing the Address Sheet is not supported on Android.",
      )
    }
    isVisible = newVisibility
  }

  private fun launchAddressSheet() {
    val appearance =
      try {
        buildPaymentSheetAppearance(appearanceParams, context)
      } catch (error: PaymentSheetAppearanceException) {
        onError(createError(ErrorType.Failed.toString(), error))
        return
      }
    addressSheetManager?.destroy()
    addressSheetManager =
      AddressLauncherManager(
        context.reactApplicationContext,
        appearance,
        defaultAddress,
        allowedCountries,
        buttonTitle,
        sheetTitle,
        googlePlacesApiKey,
        autocompleteCountries,
        additionalFields,
      ) { error, address ->
        addressSheetManager?.destroy()
        addressSheetManager = null

        if (address != null) {
          onSubmit(buildResult(address))
        } else {
          onError(error)
        }
        isVisible = false
      }.also {
        it.create()
        it.present()
      }
  }

  fun setAppearance(appearanceParams: ReadableMap?) {
    this.appearanceParams = appearanceParams
  }

  fun setDefaultValues(defaults: ReadableMap?) {
    defaultAddress = defaults?.let { buildAddressDetails(it) }
  }

  fun setAdditionalFields(fields: ReadableMap?) {
    additionalFields = fields?.let { buildAdditionalFieldsConfiguration(it) }
  }

  fun setAllowedCountries(countries: List<String>?) {
    allowedCountries = countries?.toSet() ?: emptySet()
  }

  fun setAutocompleteCountries(countries: List<String>?) {
    autocompleteCountries = countries?.toSet() ?: emptySet()
  }

  fun setPrimaryButtonTitle(title: String?) {
    buttonTitle = title
  }

  fun setSheetTitle(title: String?) {
    sheetTitle = title
  }

  fun setGooglePlacesApiKey(key: String?) {
    googlePlacesApiKey = key
  }

  companion object {
    internal fun buildAddressDetails(map: ReadableMap): AddressDetails =
      AddressDetails(
        name = map.getString("name"),
        address = buildAddress(map.getMap("address")),
        phoneNumber = map.getString("phone"),
        isCheckboxSelected = map.getBooleanOr("isCheckboxSelected", false),
      )

    internal fun buildAddress(map: ReadableMap?): PaymentSheet.Address? {
      if (map == null) {
        return null
      }
      return PaymentSheet.Address(
        city = map.getString("city"),
        country = map.getString("country"),
        line1 = map.getString("line1"),
        line2 = map.getString("line2"),
        state = map.getString("state"),
        postalCode = map.getString("postalCode"),
      )
    }

    internal fun getFieldConfiguration(key: String?): AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration =
      when (key) {
        "hidden" -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN
        "optional" -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.OPTIONAL
        "required" -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.REQUIRED
        else -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN
      }

    internal fun buildAdditionalFieldsConfiguration(params: ReadableMap): AddressLauncher.AdditionalFieldsConfiguration {
      val phoneConfiguration = getFieldConfiguration(params.getString("phoneNumber"))

      return AddressLauncher.AdditionalFieldsConfiguration(
        phone = phoneConfiguration,
        checkboxLabel = params.getString("checkboxLabel"),
      )
    }

    internal fun buildResult(addressDetails: AddressDetails): WritableMap =
      Arguments.createMap().apply {
        putMap(
          "result",
          Arguments.createMap().apply {
            putString("name", addressDetails.name)
            putMap(
              "address",
              Arguments.createMap().apply {
                putString("city", addressDetails.address?.city)
                putString("country", addressDetails.address?.country)
                putString("line1", addressDetails.address?.line1)
                putString("line2", addressDetails.address?.line2)
                putString("postalCode", addressDetails.address?.postalCode)
                putString("state", addressDetails.address?.state)
              },
            )
            putString("phone", addressDetails.phoneNumber)
            putBoolean("isCheckboxSelected", addressDetails.isCheckboxSelected ?: false)
          },
        )
      }
  }
}
