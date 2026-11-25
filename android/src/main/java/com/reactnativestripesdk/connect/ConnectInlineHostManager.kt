package com.reactnativestripesdk.connect

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.StripeConnectInlineHostManagerDelegate
import com.facebook.react.viewmanagers.StripeConnectInlineHostManagerInterface

@ReactModule(name = ConnectInlineHostManager.REACT_CLASS)
class ConnectInlineHostManager :
  ViewGroupManager<ConnectInlineHostView>(),
  StripeConnectInlineHostManagerInterface<ConnectInlineHostView> {
  private val delegate = StripeConnectInlineHostManagerDelegate(this)

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  override fun createViewInstance(reactContext: ThemedReactContext) = ConnectInlineHostView(reactContext)

  override fun onDropViewInstance(view: ConnectInlineHostView) {
    view.detach()
    super.onDropViewInstance(view)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    (super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()).apply {
      put(ConnectInlineHostView.EVENT_ATTACH, mapOf("registrationName" to ConnectInlineHostView.EVENT_ATTACH))
      put(ConnectInlineHostView.EVENT_OPEN_URL, mapOf("registrationName" to ConnectInlineHostView.EVENT_OPEN_URL))
    }

  @ReactProp(name = "connectJsOrigin")
  override fun setConnectJsOrigin(
    view: ConnectInlineHostView,
    value: String?,
  ) {
    view.connectJsOrigin = value
  }

  // Only iOS reinstalls its message filter when react-native-webview resets its scripts.
  @ReactProp(name = "scriptsRevision")
  override fun setScriptsRevision(
    view: ConnectInlineHostView,
    value: Int,
  ) = Unit

  @ReactProp(name = "sheetBackgroundColor", customType = "Color")
  override fun setSheetBackgroundColor(
    view: ConnectInlineHostView,
    value: Int?,
  ) {
    view.sheetBackgroundColor = value
  }

  override fun sheetChanged(
    view: ConnectInlineHostView,
    sheetId: String,
    height: Double,
    dismissible: Boolean,
  ) {
    view.onSheetChanged(sheetId, height, dismissible)
  }

  override fun resetSheets(view: ConnectInlineHostView) {
    view.resetSheets()
  }

  companion object {
    const val REACT_CLASS = "StripeConnectInlineHost"
  }
}
