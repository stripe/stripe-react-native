package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import java.util.UUID

/** Routes asynchronous JavaScript responses to the native request that emitted them. */
internal class IntentCreationCallbackRegistry {
  private val lock = Any()
  private val pending = mutableMapOf<String, CompletableDeferred<ReadableMap>>()
  private var disposed = false

  suspend fun awaitResult(
    owner: Job,
    emit: (String) -> Unit,
  ): ReadableMap {
    currentCoroutineContext().ensureActive()
    val requestId = UUID.randomUUID().toString()
    val response = CompletableDeferred<ReadableMap>(owner)

    try {
      synchronized(lock) {
        if (disposed) {
          throw CancellationException("Intent creation callback registry has been disposed.")
        }
        pending[requestId] = response
        response.invokeOnCompletion {
          synchronized(lock) { pending.remove(requestId) }
        }
      }

      response.ensureActive()
      emit(requestId)
      return response.await()
    } finally {
      synchronized(lock) { pending.remove(requestId) }
      response.cancel()
    }
  }

  fun complete(
    requestId: String?,
    result: ReadableMap,
  ) {
    if (requestId == null) return
    val response = synchronized(lock) { pending.remove(requestId) }
    response?.complete(result)
  }

  fun dispose() {
    val requests =
      synchronized(lock) {
        if (disposed) return
        disposed = true
        pending.values.toList().also { pending.clear() }
      }
    requests.forEach { it.cancel() }
  }
}
