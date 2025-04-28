package com.reactnativestripesdk.addresssheet

import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.AddressSheetViewManagerDelegate
import com.facebook.react.viewmanagers.AddressSheetViewManagerInterface
import com.reactnativestripesdk.utils.asMapOrNull

@ReactModule(name = AddressSheetViewManager.REACT_CLASS)
class AddressSheetViewManager :
  SimpleViewManager<AddressSheetView>(),
  AddressSheetViewManagerInterface<AddressSheetView> {
  private val delegate = AddressSheetViewManagerDelegate(this)

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      AddressSheetEvent.ON_SUBMIT to
        mutableMapOf("registrationName" to "onSubmitAction"),
      AddressSheetEvent.ON_ERROR to
        mutableMapOf("registrationName" to "onErrorAction"),
    )

  @ReactProp(name = "visible")
  override fun setVisible(
    view: AddressSheetView,
    visibility: Boolean,
  ) {
    view.setVisible(visibility)
  }

  @ReactProp(name = "appearance")
  override fun setAppearance(
    view: AddressSheetView,
    appearance: Dynamic,
  ) {
    view.setAppearance(appearance.asMap())
  }

  @ReactProp(name = "defaultValues")
  override fun setDefaultValues(
    view: AddressSheetView,
    defaults: Dynamic,
  ) {
    view.setDefaultValues(defaults.asMap())
  }

  @ReactProp(name = "additionalFields")
  override fun setAdditionalFields(
    view: AddressSheetView,
    fields: Dynamic,
  ) {
    view.setAdditionalFields(fields.asMapOrNull())
  }

  @ReactProp(name = "allowedCountries")
  override fun setAllowedCountries(
    view: AddressSheetView,
    countries: ReadableArray?,
  ) {
    view.setAllowedCountries(countries?.toArrayList()?.filterIsInstance<String>())
  }

  @ReactProp(name = "autocompleteCountries")
  override fun setAutocompleteCountries(
    view: AddressSheetView,
    countries: ReadableArray?,
  ) {
    view.setAutocompleteCountries(countries?.toArrayList()?.filterIsInstance<String>())
  }

  @ReactProp(name = "primaryButtonTitle")
  override fun setPrimaryButtonTitle(
    view: AddressSheetView,
    title: String?,
  ) {
    view.setPrimaryButtonTitle(title)
  }

  @ReactProp(name = "sheetTitle")
  override fun setSheetTitle(
    view: AddressSheetView,
    title: String?,
  ) {
    view.setSheetTitle(title)
  }

  @ReactProp(name = "googlePlacesApiKey")
  override fun setGooglePlacesApiKey(
    view: AddressSheetView,
    key: String?,
  ) {
    view.setGooglePlacesApiKey(key)
  }

  @ReactProp(name = "presentationStyle")
  override fun setPresentationStyle(
    view: AddressSheetView,
    value: String?,
  ) {
    // noop iOS only.
  }

  @ReactProp(name = "animationStyle")
  override fun setAnimationStyle(
    view: AddressSheetView,
    value: String?,
  ) {
    // noop iOS only.
  }

  override fun createViewInstance(reactContext: ThemedReactContext): AddressSheetView = AddressSheetView(reactContext)

  companion object {
    const val REACT_CLASS = "AddressSheetView"
  }
}
