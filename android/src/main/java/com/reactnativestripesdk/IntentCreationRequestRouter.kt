package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.stripe.android.paymentsheet.CreateIntentResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import java.util.UUID

internal class IntentCreationRequestRouter {
  internal class Owner {
    internal var retired = false
  }

  internal enum class Component(val value: String) {
    PaymentSheet("paymentSheet"),
    EmbeddedPaymentElement("embeddedPaymentElement"),
  }

  internal enum class Kind { PaymentMethod, ConfirmationToken }

  private data class Request(
    val owner: Owner,
    val component: Component,
    val kind: Kind,
    val result: CompletableDeferred<ReadableMap> = CompletableDeferred(),
  )

  private val pending = mutableMapOf<String, Request>()
  private var closed = false

  @Suppress("TooGenericExceptionCaught")
  suspend fun request(
    owner: Owner,
    component: Component,
    kind: Kind,
    params: WritableMap,
    emit: (WritableMap) -> Unit,
  ): CreateIntentResult {
    val id = UUID.randomUUID().toString()
    val request = Request(owner, component, kind)
    synchronized(this) {
      if (closed || owner.retired) throw CancellationException("Intent callback owner is no longer active")
      pending[id] = request
    }
    try {
      params.putString("requestId", id)
      params.putString("component", component.value)
      emit(params)
      return toResult(request.result.await())
    } catch (error: CancellationException) {
      throw error
    } catch (error: Exception) {
      return CreateIntentResult.Failure(error, "An unexpected error occurred")
    } finally {
      synchronized(this) { pending.remove(id) }
      request.result.cancel()
    }
  }

  @Synchronized
  fun complete(params: ReadableMap, kind: Kind) {
    val id = params.stringOrNull("requestId") ?: return
    val component = params.stringOrNull("component") ?: return
    val request = pending[id] ?: return
    if (request.component.value != component || request.kind != kind) return
    pending.remove(id)
    request.result.complete(params)
  }

  @Synchronized
  fun cancelPending(owner: Owner) {
    val entries = pending.filterValues { it.owner === owner }
    entries.forEach { (id, request) ->
      pending.remove(id)
      request.result.cancel()
    }
  }

  @Synchronized
  fun retire(owner: Owner) {
    owner.retired = true
    cancelPending(owner)
  }

  @Synchronized
  fun close() {
    closed = true
    val requests = pending.values.toList()
    pending.clear()
    requests.forEach { it.result.cancel() }
  }

  private fun toResult(params: ReadableMap): CreateIntentResult {
    val secret = params.stringOrNull("clientSecret")
    if (!secret.isNullOrBlank()) return CreateIntentResult.Success(secret)
    val error =
      if (params.hasKey("error") && params.getType("error") == ReadableType.Map) {
        params.getMap("error")
      } else {
        null
      }
    return CreateIntentResult.Failure(
      cause = Exception(error?.stringOrNull("message") ?: "Invalid Intent creation response"),
      displayMessage = error?.stringOrNull("localizedMessage"),
    )
  }

  private fun ReadableMap.stringOrNull(key: String): String? =
    if (hasKey(key) && getType(key) == ReadableType.String) getString(key) else null
}
