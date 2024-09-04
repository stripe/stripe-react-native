package com.reactnativestripesdk

import android.view.View
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.stripe.android.view.TestComposeView

class TestComposeViewManager : SimpleViewManager<View>() {
  override fun getName(): String {
    return "TestComposeView"
  }

  override fun createViewInstance(reactContext: ThemedReactContext): View {
    val composeView = TestComposeView(reactContext)
    return composeView
  }
}
