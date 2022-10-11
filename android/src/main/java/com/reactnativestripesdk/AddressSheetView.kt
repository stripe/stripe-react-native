package com.reactnativestripesdk

import android.util.Log
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.uimanager.events.EventDispatcher
import com.reactnativestripesdk.utils.toBundleObject
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher
import com.stripe.android.paymentsheet.addresselement.AddressLauncherResult

class AddressSheetView(private val context: ThemedReactContext) : FrameLayout(context) {
  private var eventDispatcher: EventDispatcher? = context.getNativeModule(UIManagerModule::class.java)?.eventDispatcher
  private var isVisible = false
  private var appearance: PaymentSheet.Appearance = PaymentSheet.Appearance()
  private var defaultAddress: AddressDetails? = null
  private var allowedCountries: Set<String> = emptySet()
  private var buttonTitle: String? = null
  private var sheetTitle: String? = null
  private var googlePlacesApiKey: String? = null
  private var autocompleteCountries: Set<String> = emptySet()
  private var additionalFields: AddressLauncher.AdditionalFieldsConfiguration? = null

  private fun onSubmit(params: WritableMap) {
    eventDispatcher?.dispatchEvent(
      AddressSheetEvent(id, AddressSheetEvent.EventType.OnSubmit, params)
    )
  }

  private fun onCancel() {
    eventDispatcher?.dispatchEvent(
      AddressSheetEvent(id, AddressSheetEvent.EventType.OnCancel, null)
    )
  }

  fun setVisible(newVisibility: Boolean) {
    if (newVisibility && !isVisible) {
      AddressLauncherFragment.presentAddressSheet(
        context, appearance, defaultAddress, allowedCountries, buttonTitle, sheetTitle, googlePlacesApiKey, autocompleteCountries, additionalFields
      ) { result ->
        when (result) {
          is AddressLauncherResult.Canceled -> {
            onCancel()
          }
          is AddressLauncherResult.Succeeded -> {
            onSubmit(buildResult(result.address))
          }
        }
        isVisible = false
      }
    } else if (!newVisibility && isVisible) {
      Log.w("StripeReactNative", "Programmatically dismissing the Address Sheet is not supported on Android.")
    }

    isVisible = newVisibility
  }

  private fun buildResult(addressDetails: AddressDetails): WritableMap {
    val result = Arguments.createMap()
    result.putString("name", addressDetails.name)
    Arguments.createMap().let {
      it.putString("city", addressDetails.address?.city)
      it.putString("country", addressDetails.address?.country)
      it.putString("line1", addressDetails.address?.line1)
      it.putString("line2", addressDetails.address?.line2)
      it.putString("postalCode", addressDetails.address?.postalCode)
      it.putString("state", addressDetails.address?.state)
      result.putMap("address", it)
    }
    result.putString("phone", addressDetails.phoneNumber)
    result.putBoolean("isCheckboxSelected", addressDetails.isCheckboxSelected ?: false)
    return result
  }

  fun setAppearance(appearanceParams: ReadableMap) {
    appearance = buildPaymentSheetAppearance(toBundleObject(appearanceParams), context)
  }

  fun setDefaultValues(defaults: ReadableMap) {
    defaultAddress = AddressDetails(
      name = defaults.getString("name"),
      address = buildAddress(defaults.getMap("address")),
      phoneNumber = defaults.getString("phone"),
      isCheckboxSelected = defaults.getBoolean("isCheckboxSelected"),
    )
  }

  private fun buildAddress(map: ReadableMap?): PaymentSheet.Address? {
    if (map == null) {
      return null
    }
    return PaymentSheet.Address(
      city = map.getString("city"),
      country = map.getString("country"),
      line1 = map.getString("line1"),
      line2 = map.getString("line2"),
      state = map.getString("state"),
      postalCode = map.getString("postalCode")
    )
  }

  fun setAdditionalFields(fields: ReadableMap) {
    val phone = when (fields.getString("phoneNumber")) {
      "hidden" -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN
      "optional" -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.OPTIONAL
      "required" -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.REQUIRED
      else -> AddressLauncher.AdditionalFieldsConfiguration.FieldConfiguration.HIDDEN
    }
    additionalFields = AddressLauncher.AdditionalFieldsConfiguration(
      phone = phone,
      checkboxLabel = fields.getString("checkboxLabel")
    )
  }

  fun setAllowedCountries(countries: List<String>) {
    allowedCountries = countries.toSet()
  }

  fun setAutocompleteCountries(countries: List<String>) {
    autocompleteCountries = countries.toSet()
  }

  fun setPrimaryButtonTitle(title: String) {
    buttonTitle = title
  }

  fun setSheetTitle(title: String) {
    sheetTitle = title
  }

  fun setGooglePlacesApiKey(key: String) {
    googlePlacesApiKey = key
  }
}
