package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = AuBECSDebitFormViewManager.REACT_CLASS)
class AuBECSDebitFormViewManager : SimpleViewManager<AuBECSDebitFormView>() {
  override fun getName() = REACT_CLASS

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    mutableMapOf(
      FormCompleteEvent.EVENT_NAME to
        mutableMapOf("registrationName" to "onCompleteAction"),
    )

  @ReactProp(name = "companyName")
  fun setCompanyName(
    view: AuBECSDebitFormView,
    name: String?,
  ) {
    view.setCompanyName(name)
  }

  @ReactProp(name = "formStyle")
  fun setFormStyle(
    view: AuBECSDebitFormView,
    style: ReadableMap,
  ) {
    view.setFormStyle(style)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): AuBECSDebitFormView = AuBECSDebitFormView(reactContext)

  companion object {
    const val REACT_CLASS = "AuBECSDebitForm"
  }
}
