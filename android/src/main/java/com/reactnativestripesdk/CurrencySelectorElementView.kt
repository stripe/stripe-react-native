package com.reactnativestripesdk

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper

class CurrencySelectorElementView(
  context: Context,
) : StripeAbstractComposeView(context) {
  private val reactContext get() = context as ReactContext

  @Suppress("UnusedParameter")
  fun setSessionKey(value: String?) {
    reportHeightChange(0f)
  }

  @Suppress("UnusedParameter")
  fun setDisabled(value: Boolean) = Unit

  fun setAppearance() = Unit

  @Composable
  override fun Content() {
    LaunchedEffect(Unit) {
      reportHeightChange(0f)
    }
  }

  private fun reportHeightChange(height: Float) {
    val params = Arguments.createMap().apply {
      putDouble("height", height.toDouble())
    }
    dispatchEvent(CurrencySelectorElementEvent.EventType.OnHeightChange, params)
  }

  private fun dispatchEvent(
    eventType: CurrencySelectorElementEvent.EventType,
    params: WritableMap,
  ) {
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    dispatcher?.dispatchEvent(
      CurrencySelectorElementEvent(surfaceId, id, eventType, params),
    )
  }
}
