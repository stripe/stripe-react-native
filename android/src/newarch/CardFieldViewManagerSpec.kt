package com.reactnativestripesdk

import android.view.View
import com.facebook.react.bridge.ReadableArray

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.CardFieldManagerDelegate

import com.facebook.react.viewmanagers.CardFieldManagerInterface

abstract class CardFieldViewManagerSpec<T : View> : SimpleViewManager<T>(),
  CardFieldManagerInterface<T> {

  private val mDelegate: ViewManagerDelegate<T>

  init {
    mDelegate = CardFieldManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<T>? {
    return mDelegate
  }

  override fun receiveCommand(root: T, commandId: String?, args: ReadableArray?) {
    mDelegate.receiveCommand(root, commandId, args)
  }
}
