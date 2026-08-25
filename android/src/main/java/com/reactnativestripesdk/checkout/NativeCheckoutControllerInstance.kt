package com.reactnativestripesdk.checkout

import androidx.annotation.MainThread
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.EventEmitterCompat
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

@OptIn(CheckoutSessionPreview::class)
internal class NativeCheckoutControllerInstance(
  val controller: CheckoutController,
  private val registry: CheckoutControllerRegistry,
  private val eventEmitter: EventEmitterCompat,
  private val scope: CoroutineScope,
  initialNativeSession: CheckoutController.Session,
  initialSession: WritableMap,
) : CheckoutControllerInstance {
  internal enum class Status(
    val serializedValue: String,
  ) {
    Ready("ready"),
    Updating("updating"),
    Confirming("confirming"),
    Destroyed("destroyed"),
  }

  private var controllerId: String? = null
  private var observationJob: Job? = null
  private var latestNativeSession = initialNativeSession
  private var latestSession = initialSession
  private var confirming = false
  private var mutating = false
  private var destroyed = false

  @MainThread
  fun start(controllerId: String) {
    UiThreadUtil.assertOnUiThread()
    check(this.controllerId == null)
    this.controllerId = controllerId

    observationJob = scope.launch {
      combine(controller.session, controller.isUpdating) { session, updating -> session to updating }
        .collect { (session, updating) ->
          if (session == null) {
            return@collect
          }
          if (session !== latestNativeSession) {
            latestNativeSession = session
            latestSession = CheckoutSessionSerializer.serialize(session)
          }
          emit(status(updating), latestSession)
        }
    }
  }

  @MainThread
  fun setConfirming(value: Boolean) {
    UiThreadUtil.assertOnUiThread()
    if (destroyed || confirming == value) {
      return
    }
    confirming = value
    emit(status(controller.isUpdating.value), latestSession)
  }

  @MainThread
  fun beginMutation(): Boolean {
    UiThreadUtil.assertOnUiThread()
    if (destroyed || confirming || mutating || controller.isUpdating.value) {
      return false
    }
    mutating = true
    emit(Status.Updating, latestSession)
    return true
  }

  @MainThread
  fun finishMutation() {
    UiThreadUtil.assertOnUiThread()
    if (destroyed || !mutating) {
      return
    }
    mutating = false
    emit(status(controller.isUpdating.value), latestSession)
  }

  @MainThread
  fun launchMutation(block: suspend () -> Unit) {
    UiThreadUtil.assertOnUiThread()
    scope.launch { block() }
  }

  @MainThread
  fun emitDestroyed() {
    UiThreadUtil.assertOnUiThread()
    if (destroyed) {
      return
    }
    destroyed = true
    observationJob?.cancel()
    emit(Status.Destroyed, latestSession, allowDestroyed = true)
  }

  @MainThread
  override fun destroy() {
    UiThreadUtil.assertOnUiThread()
    if (destroyed && observationJob == null) {
      return
    }
    destroyed = true
    observationJob?.cancel()
    observationJob = null
    controller.destroy()
    scope.cancel()
  }

  private fun emit(
    status: Status,
    session: WritableMap,
    allowDestroyed: Boolean = false,
  ) {
    if (destroyed && !allowDestroyed) {
      return
    }
    val controllerId = controllerId ?: return
    val sequence = registry.nextEventSequence(controllerId) ?: return
    eventEmitter.emitCheckoutControllerDidUpdate(
      Arguments.createMap().apply {
        putString("controllerId", controllerId)
        putInt("sequence", sequence)
        putString("status", status.serializedValue)
        putMap("session", session)
      },
    )
  }

  private fun status(updating: Boolean): Status = when {
    confirming -> Status.Confirming
    mutating || updating -> Status.Updating
    else -> Status.Ready
  }
}
