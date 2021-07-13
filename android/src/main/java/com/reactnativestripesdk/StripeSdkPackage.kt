package com.reactnativestripesdk

import java.util.Arrays

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class StripeSdkPackage : ReactPackage {
  lateinit var cardFieldManager: StripeSdkCardViewManager
  lateinit var cardFormViewManager: CardFormViewManager

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        if (!this::cardFieldManager.isInitialized) {
          cardFieldManager = StripeSdkCardViewManager()
        }
        if (!this::cardFormViewManager.isInitialized) {
          cardFormViewManager = CardFormViewManager()
        }
        return listOf<NativeModule>(StripeSdkModule(reactContext, cardFieldManager, cardFormViewManager))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
      if (!this::cardFieldManager.isInitialized) {
        cardFieldManager = StripeSdkCardViewManager()
      }
      if (!this::cardFormViewManager.isInitialized) {
        cardFormViewManager = CardFormViewManager()
      }
      return listOf<ViewManager<*, *>>(cardFieldManager, AuBECSDebitFormViewManager(), StripeContainerManager(), cardFormViewManager)
    }
}
