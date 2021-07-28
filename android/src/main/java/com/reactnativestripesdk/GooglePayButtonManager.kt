package com.reactnativestripesdk

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class GooglePayButtonManager : SimpleViewManager<GooglePayButtonView?>() {
  override fun getName(): String {
    return REACT_CLASS
  }

  override fun onAfterUpdateTransaction(view: GooglePayButtonView) {
    super.onAfterUpdateTransaction(view)

    view.initialize()
  }

  @ReactProp(name = "buttonType")
  fun buttonType(view: GooglePayButtonView, buttonType: String) {
    view.setType(buttonType)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): GooglePayButtonView {
    return GooglePayButtonView(reactContext)
  }

  companion object {
    const val REACT_CLASS = "GooglePayButton"
  }
}
