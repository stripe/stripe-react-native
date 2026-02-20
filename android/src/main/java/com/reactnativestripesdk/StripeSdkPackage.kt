package com.reactnativestripesdk

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.reactnativestripesdk.addresssheet.AddressSheetViewManager
import com.reactnativestripesdk.pushprovisioning.AddToWalletButtonManager

// Fool autolinking for older versions that do not support BaseReactPackage.
// public class StripeSdkPackage implements ReactPackage {
class StripeSdkPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    when (name) {
      StripeSdkModule.NAME -> StripeSdkModule(reactContext)
      NativeOnrampSdkModuleSpec.NAME -> {
        val onrampModuleClass = getOnrampModuleClass()
        val constructor = onrampModuleClass.getConstructor(ReactApplicationContext::class.java)
        constructor.newInstance(reactContext) as NativeModule
      }
      else -> null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    val moduleList: Array<Class<out NativeModule?>> =
      arrayOf(
        StripeSdkModule::class.java,
        getOnrampModuleClass(),
      )
    val reactModuleInfoMap: MutableMap<String, ReactModuleInfo> = HashMap()
    for (moduleClass in moduleList) {
      val reactModule = moduleClass.getAnnotation(ReactModule::class.java) ?: continue
      reactModuleInfoMap[reactModule.name] =
        ReactModuleInfo(
          reactModule.name,
          moduleClass.name,
          true,
          reactModule.needsEagerInit,
          reactModule.isCxxModule,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
        )
    }
    return ReactModuleInfoProvider { reactModuleInfoMap }
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf<ViewManager<*, *>>(
      CardFieldViewManager(),
      AuBECSDebitFormViewManager(),
      StripeContainerManager(),
      CardFormViewManager(),
      GooglePayButtonManager(),
      AddToWalletButtonManager(),
      AddressSheetViewManager(),
      EmbeddedPaymentElementViewManager(),
      NavigationBarManager(),
    )

  private fun getOnrampModuleClass(): Class<out NativeModule?> {
    if (BuildConfig.IS_ONRAMP_INCLUDED) {
      @Suppress("UNCHECKED_CAST")
      return Class.forName("com.reactnativestripesdk.OnrampSdkModule") as Class<out NativeModule?>
    } else {
      return FakeOnrampSdkModule::class.java
    }
  }
}
