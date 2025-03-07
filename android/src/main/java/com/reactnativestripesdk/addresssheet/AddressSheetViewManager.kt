package com.reactnativestripesdk.addresssheet

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = AddressSheetViewManager.REACT_CLASS)
class AddressSheetViewManager : SimpleViewManager<AddressSheetView>() {
  override fun getName() = REACT_CLASS

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      AddressSheetEvent.ON_SUBMIT to
        mutableMapOf("registrationName" to "onSubmitAction"),
      AddressSheetEvent.ON_ERROR to
        mutableMapOf("registrationName" to "onErrorAction"),
    )

  @ReactProp(name = "visible")
  fun setVisible(
    view: AddressSheetView,
    visibility: Boolean,
  ) {
    view.setVisible(visibility)
  }

  @ReactProp(name = "appearance")
  fun setAppearance(
    view: AddressSheetView,
    appearance: ReadableMap,
  ) {
    view.setAppearance(appearance)
  }

  @ReactProp(name = "defaultValues")
  fun setDefaultValues(
    view: AddressSheetView,
    defaults: ReadableMap,
  ) {
    view.setDefaultValues(defaults)
  }

  @ReactProp(name = "additionalFields")
  fun setAdditionalFields(
    view: AddressSheetView,
    fields: ReadableMap,
  ) {
    view.setAdditionalFields(fields)
  }

  @ReactProp(name = "allowedCountries")
  fun setAllowedCountries(
    view: AddressSheetView,
    countries: ReadableArray,
  ) {
    view.setAllowedCountries(countries.toArrayList().filterIsInstance<String>())
  }

  @ReactProp(name = "autocompleteCountries")
  fun setAutocompleteCountries(
    view: AddressSheetView,
    countries: ReadableArray,
  ) {
    view.setAutocompleteCountries(countries.toArrayList().filterIsInstance<String>())
  }

  @ReactProp(name = "primaryButtonTitle")
  fun setPrimaryButtonTitle(
    view: AddressSheetView,
    title: String,
  ) {
    view.setPrimaryButtonTitle(title)
  }

  @ReactProp(name = "sheetTitle")
  fun setSheetTitle(
    view: AddressSheetView,
    title: String,
  ) {
    view.setSheetTitle(title)
  }

  @ReactProp(name = "googlePlacesApiKey")
  fun setGooglePlacesApiKey(
    view: AddressSheetView,
    key: String,
  ) {
    view.setGooglePlacesApiKey(key)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): AddressSheetView = AddressSheetView(reactContext)

  companion object {
    const val REACT_CLASS = "AddressSheetView"
  }
}
