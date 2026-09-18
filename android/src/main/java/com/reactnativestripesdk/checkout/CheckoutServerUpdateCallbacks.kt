package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CompletableDeferred

/** Routes JS completions only to the callback waiting for that operation. Main-thread only. */
internal class CheckoutServerUpdateCallbacks {
  private val callbacks = mutableMapOf<String, CompletableDeferred<Unit>>()

  suspend fun request(operationId: String, request: () -> Unit): Result<Unit> {
    check(!callbacks.containsKey(operationId)) { "Checkout server update is already pending." }
    val callback = CompletableDeferred<Unit>()
    callbacks[operationId] = callback
    return try {
      request()
      callback.await()
      Result.success(Unit)
    } finally {
      callbacks.remove(operationId)
    }
  }

  fun complete(operationId: String, error: String?) {
    val callback = callbacks[operationId] ?: return
    if (error == null) {
      callback.complete(Unit)
    } else {
      callback.completeExceptionally(IllegalStateException(error))
    }
  }
}
