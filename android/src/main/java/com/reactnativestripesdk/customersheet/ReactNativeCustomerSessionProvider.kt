package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.stripe.android.customersheet.CustomerSheet
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class ReactNativeCustomerSessionProvider internal constructor(
  private val intentConfiguration: CustomerSheet.IntentConfiguration,
  private val emitSetupIntentRequest: (String) -> Unit,
  private val emitCustomerSessionRequest: (String) -> Unit,
) : CustomerSheet.CustomerSessionProvider() {
  constructor(
    context: ReactApplicationContext,
    intentConfiguration: CustomerSheet.IntentConfiguration,
  ) : this(
    intentConfiguration,
    { requestId ->
      val emitter = checkNotNull(context.getNativeModule(StripeSdkModule::class.java)?.eventEmitter)
      emitter.emitOnCustomerSessionProviderSetupIntentClientSecret(
        Arguments.createMap().apply { putString("requestId", requestId) },
      )
    },
    { requestId ->
      val emitter = checkNotNull(context.getNativeModule(StripeSdkModule::class.java)?.eventEmitter)
      emitter.emitOnCustomerSessionProviderCustomerSessionClientSecret(
        Arguments.createMap().apply { putString("requestId", requestId) },
      )
    },
  )

  private val setupIntentRequests = ConcurrentHashMap<String, CompletableDeferred<String>>()
  private val customerSessionRequests =
    ConcurrentHashMap<String, CompletableDeferred<CustomerSheet.CustomerSessionClientSecret>>()
  private val lifecycleLock = Any()
  private var isInvalidated = false

  internal val pendingRequestCount: Int
    get() = setupIntentRequests.size + customerSessionRequests.size

  override suspend fun intentConfiguration(): Result<CustomerSheet.IntentConfiguration> =
    Result.success(intentConfiguration)

  override suspend fun provideSetupIntentClientSecret(customerId: String): Result<String> =
    request(setupIntentRequests, emitSetupIntentRequest)

  override suspend fun providesCustomerSessionClientSecret(): Result<CustomerSheet.CustomerSessionClientSecret> =
    request(customerSessionRequests, emitCustomerSessionRequest)

  internal fun resolveSetupIntent(
    requestId: String,
    result: ReadableMap,
  ): Boolean =
    resolve(setupIntentRequests, requestId) {
      clientSecret(result)
    }

  internal fun resolveCustomerSession(
    requestId: String,
    result: ReadableMap,
  ): Boolean =
    resolve(customerSessionRequests, requestId) {
      val clientSecret = clientSecret(result)
      CustomerSheet.CustomerSessionClientSecret.create(
        customerId = requiredString(result, "customerId"),
        clientSecret = clientSecret,
      )
    }

  internal fun invalidate() {
    synchronized(lifecycleLock) {
      isInvalidated = true
    }
    // Claim each request before cancellation, just as a response claims it.
    setupIntentRequests.keys.forEach { setupIntentRequests.remove(it)?.cancel() }
    customerSessionRequests.keys.forEach { customerSessionRequests.remove(it)?.cancel() }
  }

  // CustomerSheet consumes arbitrary provider/emitter failures as Result, but
  // coroutine cancellation must propagate instead of becoming a provider error.
  @Suppress("TooGenericExceptionCaught")
  private suspend fun <T> request(
    requests: ConcurrentHashMap<String, CompletableDeferred<T>>,
    emit: (String) -> Unit,
  ): Result<T> {
    val requestId = UUID.randomUUID().toString()
    val deferred = CompletableDeferred<T>()
    try {
      currentCoroutineContext().ensureActive()
      synchronized(lifecycleLock) {
        if (isInvalidated) throw CancellationException("CustomerSheet was invalidated")
        requests[requestId] = deferred
      }
      emit(requestId)
      return Result.success(deferred.await())
    } catch (error: CancellationException) {
      throw error
    } catch (error: Exception) {
      return Result.failure(error)
    } finally {
      // Caller cancellation or an emitter failure must not leave a pending request.
      if (requests.remove(requestId, deferred)) deferred.cancel()
    }
  }

  private fun <T> resolve(
    requests: ConcurrentHashMap<String, CompletableDeferred<T>>,
    requestId: String,
    parse: () -> T,
  ): Boolean {
    val deferred = requests.remove(requestId) ?: return false
    runCatching(parse).fold(deferred::complete, deferred::completeExceptionally)
    return true
  }

  private fun clientSecret(result: ReadableMap): String {
    if (result.hasKey("error")) {
      throw IllegalArgumentException(requiredString(result, "error"))
    }
    return requiredString(result, "clientSecret")
  }

  private fun requiredString(
    result: ReadableMap,
    key: String,
  ): String {
    require(result.hasKey(key) && result.getType(key) == ReadableType.String) {
      "Missing or invalid $key"
    }
    return requireNotNull(result.getString(key)?.takeIf { it.isNotEmpty() }) {
      "Missing or invalid $key"
    }
  }
}
