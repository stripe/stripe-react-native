package com.stripesdk

import android.view.View
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.ModuleSpec
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.NativeModule
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager
import java.util.HashMap

class StripeSdkPackage : TurboReactPackage() {

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return listOf<ViewManager<*, *>>(CardFieldViewManager())
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (name.equals(StripeSdkModule.NAME)) {
      return StripeSdkModule(reactContext)
    } else {
      return null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      moduleInfos[StripeSdkModule.NAME] = ReactModuleInfo(
        StripeSdkModule.NAME,
        StripeSdkModule.NAME,
        false,  // canOverrideExistingModule
        false,  // needsEagerInit
        true,  // hasConstants
        false,  // isCxxModule
        isTurboModule // isTurboModule
      )
      moduleInfos
    }
  }
}
