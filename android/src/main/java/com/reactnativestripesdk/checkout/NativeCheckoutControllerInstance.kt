package com.reactnativestripesdk.checkout

import androidx.annotation.MainThread
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.EventEmitterCompat
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.launch

/** Owns a native Checkout controller and its session observation for the bridge. */
@OptIn(CheckoutSessionPreview::class, ExperimentalCoroutinesApi::class)
internal class NativeCheckoutControllerInstance(
  val controller: CheckoutController,
  private val eventEmitter: EventEmitterCompat,
  private val scope: CoroutineScope,
  initialSession: WritableMap,
) {
  private var controllerId: String? = null
  private var latestSession = initialSession
  private var destroyed = false

  /** Starts native snapshot observation for this bridge identifier. */
  @MainThread
  fun start(controllerId: String) {
    UiThreadUtil.assertOnUiThread()
    check(this.controllerId == null && !destroyed)
    this.controllerId = controllerId

    scope.launch {
      sessionStates().collect { (session, isUpdating) -> publish(session, isUpdating) }
    }
  }

  private fun sessionStates() =
    controller.session.combine(controller.isUpdating) { session, isUpdating -> session to isUpdating }
      .mapLatest { (session, isUpdating) ->
        session?.let { CheckoutSessionSerializer.serialize(it) to isUpdating }
      }.filterNotNull()

  /** Publishes the current native snapshot before its status or operation result reaches JS. */
  suspend fun publishCurrentState() {
    val (session, isUpdating) = sessionStates().first()
    publish(session, isUpdating)
  }

  private fun publish(session: WritableMap, isUpdating: Boolean) {
    if (!destroyed) {
      latestSession = session
      emit(if (isUpdating) "updating" else "ready")
    }
  }

  /** Starts bridge work before disposal can cancel its pending promise. */
  @MainThread
  fun launchMutation(block: suspend () -> Unit) {
    UiThreadUtil.assertOnUiThread()
    scope.launch(start = CoroutineStart.UNDISPATCHED) { block() }
  }

  @MainThread
  fun destroy() {
    UiThreadUtil.assertOnUiThread()
    if (destroyed) {
      return
    }
    destroyed = true
    scope.cancel()
    controller.destroy()
  }

  private fun emit(status: String) {
    val controllerId = controllerId ?: return
    eventEmitter.emitCheckoutControllerDidUpdate(
      Arguments.createMap().apply {
        putString("controllerId", controllerId)
        putString("status", status)
        // React Native consumes nested maps when sending them across the bridge.
        putMap("session", latestSession.copy())
      },
    )
  }
}
