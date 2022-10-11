package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.stripe.android.paymentsheet.addresselement.AddressDetails
import com.stripe.android.paymentsheet.addresselement.AddressLauncher

class AddressSheetViewManager : SimpleViewManager<AddressSheetView>() {
  override fun getName() = "AddressSheet"

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      AddressSheetEvent.ON_SUBMIT, MapBuilder.of("registrationName", "onSubmitAction"),
      AddressSheetEvent.ON_CANCEL, MapBuilder.of("registrationName", "onCancelAction"))
  }

  @ReactProp(name = "visible")
  fun setVisible(view: AddressSheetView, visibility: Boolean) {
    view.setVisible(visibility)
  }

  @ReactProp(name = "appearance")
  fun setAppearance(view: AddressSheetView, appearance: ReadableMap) {
    view.setAppearance(appearance)
  }

  @ReactProp(name = "defaultValues")
  fun setDefaultValues(view: AddressSheetView, defaults: ReadableMap) {
    view.setDefaultValues(defaults)
  }

  @ReactProp(name = "additionalFields")
  fun setAdditionalFields(view: AddressSheetView, fields: ReadableMap) {
    view.setAdditionalFields(fields)
  }

  @ReactProp(name = "allowedCountries")
  fun setAllowedCountries(view: AddressSheetView, countries: ReadableArray) {
    view.setAllowedCountries(countries.toArrayList().filterIsInstance<String>())
  }

  @ReactProp(name = "autocompleteCountries")
  fun setAutocompleteCountries(view: AddressSheetView, countries: ReadableArray) {
    view.setAutocompleteCountries(countries.toArrayList().filterIsInstance<String>())
  }

  @ReactProp(name = "visible")
  fun setPrimaryButtonTitle(view: AddressSheetView, title: String) {
    view.setPrimaryButtonTitle(title)
  }

  @ReactProp(name = "sheetTitle")
  fun setSheetTitle(view: AddressSheetView, title: String) {
    view.setSheetTitle(title)
  }

  @ReactProp(name = "googlePlacesApiKey")
  fun setGooglePlacesApiKey(view: AddressSheetView, key: String) {
    view.setGooglePlacesApiKey(key)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): AddressSheetView {
    return AddressSheetView(reactContext)
  }
}
