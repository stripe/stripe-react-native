package com.reactnativestripesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.stripe.android.customersheet.CustomerSheet
import com.stripe.android.paymentsheet.ExperimentalCustomerSessionApi
import kotlinx.coroutines.CompletableDeferred

@OptIn(ExperimentalCustomerSessionApi::class)
class ReactNativeCustomerSessionProvider(
  val context: ReactApplicationContext,
  val intentConfiguration: CustomerSheet.IntentConfiguration,
) : CustomerSheet.CustomerSessionProvider() {
  private val stripeSdkModule = context.getNativeModule(StripeSdkModule::class.java)

  internal var provideSetupIntentClientSecretCallback: CompletableDeferred<String>? = null
  internal var providesCustomerSessionClientSecretCallback: CompletableDeferred<CustomerSheet.CustomerSessionClientSecret>? = null

  override suspend fun intentConfiguration(): Result<CustomerSheet.IntentConfiguration> = Result.success(intentConfiguration)

  override suspend fun provideSetupIntentClientSecret(customerId: String): Result<String> {
    CompletableDeferred<String>().also {
      provideSetupIntentClientSecretCallback = it
      stripeSdkModule?.eventEmitter?.emitOnCustomerSessionProviderSetupIntentClientSecret()
      val resultFromJavascript = it.await()
      return Result.success(resultFromJavascript)
    }
  }

  override suspend fun providesCustomerSessionClientSecret(): Result<CustomerSheet.CustomerSessionClientSecret> {
    CompletableDeferred<CustomerSheet.CustomerSessionClientSecret>().also {
      providesCustomerSessionClientSecretCallback = it
      stripeSdkModule?.eventEmitter?.emitOnCustomerSessionProviderCustomerSessionClientSecret()
      val resultFromJavascript = it.await()
      return Result.success(resultFromJavascript)
    }
  }
}
