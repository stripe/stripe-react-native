package com.reactnativestripesdk

import com.facebook.react.bridge.Dynamic
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.NavigationBarManagerDelegate
import com.facebook.react.viewmanagers.NavigationBarManagerInterface

@ReactModule(name = NavigationBarManager.REACT_CLASS)
class NavigationBarManager :
  SimpleViewManager<NavigationBarView>(),
  NavigationBarManagerInterface<NavigationBarView> {
  private val delegate = NavigationBarManagerDelegate(this)

  override fun getName() = REACT_CLASS

  override fun getDelegate() = delegate

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      "onCloseButtonPress" to mutableMapOf("registrationName" to "onCloseButtonPress")
    )

  @ReactProp(name = "title")
  override fun setTitle(
    view: NavigationBarView,
    title: String?,
  ) {
    view.setTitle(title)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): NavigationBarView =
    NavigationBarView(reactContext)

  companion object {
    const val REACT_CLASS = "NavigationBar"
  }
}
