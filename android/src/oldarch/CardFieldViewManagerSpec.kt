package com.stripesdk

import android.view.View
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

import com.facebook.react.uimanager.SimpleViewManager

abstract class CardFieldViewManagerSpec<T : View> : SimpleViewManager<T>() {
  abstract fun setValue(view: T, value: ReadableMap?)
  abstract fun setPostalCodeEnabled(view: T, value: Boolean)
  abstract fun setAutofocus(view: T, value: Boolean)
  abstract fun setCountryCode(view: T, value: String?)
  abstract fun setCardStyle(view: T, value: ReadableMap?)
  abstract fun setPlaceholders(view: T, value: ReadableMap?)
  abstract fun focus(view: T)
  abstract fun blur(view: T)
  abstract fun clear(view: T)


  override fun receiveCommand(root: T, commandId: String?, args: ReadableArray?) {
    when (commandId) {
      "focus" -> focus(root)
      "blur" -> blur(root)
      "clear" -> clear(root)
    }
  }
}
