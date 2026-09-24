package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.stripe.android.customersheet.CustomerSheet
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class ReactNativeCustomerSessionProvider(
  val context: ReactApplicationContext,
  val intentConfiguration: CustomerSheet.IntentConfiguration,
) : CustomerSheet.CustomerSessionProvider() {
  private val stripeSdkModule = context.getNativeModule(StripeSdkModule::class.java)

  internal var provideSetupIntentClientSecretCallback: CompletableDeferred<String>? = null
  private val pendingCustomerSessions =
    ConcurrentHashMap<String, CompletableDeferred<CustomerSheet.CustomerSessionClientSecret>>()
  private var isInvalidated = false

  override suspend fun intentConfiguration(): Result<CustomerSheet.IntentConfiguration> =
    Result.success(intentConfiguration)

  override suspend fun provideSetupIntentClientSecret(customerId: String): Result<String> {
    CompletableDeferred<String>().also {
      provideSetupIntentClientSecretCallback = it
      stripeSdkModule?.eventEmitter?.emitOnCustomerSessionProviderSetupIntentClientSecret()
      val resultFromJavascript = it.await()
      return Result.success(resultFromJavascript)
    }
  }

  override suspend fun providesCustomerSessionClientSecret(): Result<CustomerSheet.CustomerSessionClientSecret> {
    val requestId = UUID.randomUUID().toString()
    val deferred = CompletableDeferred<CustomerSheet.CustomerSessionClientSecret>()
    return try {
      runCatching {
        // Serialize registration and teardown so a retired sheet cannot add a new request.
        synchronized(pendingCustomerSessions) {
          if (isInvalidated) throw CancellationException("CustomerSheet was destroyed")
          pendingCustomerSessions[requestId] = deferred
          val emitter = checkNotNull(stripeSdkModule?.eventEmitter) { "StripeSdk module is unavailable" }
          emitter.emitOnCustomerSessionProviderCustomerSessionClientSecret(
            Arguments.createMap().apply { putString("requestId", requestId) },
          )
        }
        deferred.await()
      }.onFailure {
        if (it is CancellationException) throw it
      }
    } finally {
      pendingCustomerSessions.remove(requestId)
      deferred.cancel()
    }
  }

  internal fun completeCustomerSessionRequest(
    requestId: String,
    response: ReadableMap,
  ): Boolean {
    val deferred = pendingCustomerSessions.remove(requestId) ?: return false
    val result = runCatching {
      response.getString("error")?.let { throw IllegalStateException(it) }
      val customerId = response.getString("customerId")
      val clientSecret = response.getString("clientSecret")
      require(!customerId.isNullOrEmpty() && !clientSecret.isNullOrEmpty()) {
        "Invalid CustomerSessionClientSecret format"
      }
      CustomerSheet.CustomerSessionClientSecret.create(customerId, clientSecret)
    }
    result.fold(deferred::complete, deferred::completeExceptionally)
    return true
  }

  internal fun invalidate() {
    val requests = synchronized(pendingCustomerSessions) {
      isInvalidated = true
      val requests = pendingCustomerSessions.values.toList()
      pendingCustomerSessions.clear()
      requests
    }
    requests.forEach { it.cancel() }
  }
}
