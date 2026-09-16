package com.reactnativestripesdk.checkout

import androidx.activity.ComponentActivity
import androidx.annotation.MainThread
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.EventEmitterCompat
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.checkout.CheckoutPresenter
import com.stripe.android.elements.PaymentElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CompletableDeferred
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
  val serverUpdateCallbacks = CheckoutServerUpdateCallbacks()
  private var controllerId: String? = null
  private var latestSession = initialSession
  private var destroyed = false
  private var confirmation: CompletableDeferred<CheckoutController.Result>? = null
  private val destructionObservers = mutableSetOf<() -> Unit>()
  private var presenter: CheckoutPresenter? = null
  private var activity: ComponentActivity? = null
  private val activityObserver = LifecycleEventObserver { _, event ->
    if (event == Lifecycle.Event.ON_DESTROY) {
      releasePresenter()
    }
  }

  /** Reuses the native Payment Element for the lifetime of its activity. */
  fun paymentElement(activity: ComponentActivity): PaymentElement = getPresenter(activity).paymentElement()

  private fun getPresenter(activity: ComponentActivity): CheckoutPresenter {
    check(!destroyed) { "Checkout controller was destroyed." }
    if (this.activity !== activity) {
      releasePresenter()
      presenter = controller.createPresenter(activity)
      this.activity = activity
      activity.lifecycle.addObserver(activityObserver)
    }
    return checkNotNull(presenter)
  }

  /** Waits for the controller's existing result callback, within the bridge controller's lifetime. */
  @MainThread
  suspend fun confirm(activity: ComponentActivity): CheckoutController.Result {
    UiThreadUtil.assertOnUiThread()
    check(!destroyed) { "Checkout controller was destroyed." }
    check(confirmation == null) { "Checkout confirmation is already in progress." }
    val result = CompletableDeferred<CheckoutController.Result>()
    confirmation = result
    try {
      emit("confirming")
      // TODO(porter): Native can omit results for rejected starts and some cancellations; forward them when available.
      getPresenter(activity).confirm()
      val confirmationResult = result.await()
      publishCurrentState()
      return confirmationResult
    } finally {
      confirmation = null
      if (!destroyed) emit(if (controller.isUpdating.value) "updating" else "ready")
    }
  }

  @MainThread
  fun onConfirmationResult(result: CheckoutController.Result) {
    UiThreadUtil.assertOnUiThread()
    confirmation?.complete(result)
  }

  private fun releasePresenter() {
    activity?.lifecycle?.removeObserver(activityObserver)
    activity = null
    presenter = null
  }

  fun observeDestruction(observer: () -> Unit): () -> Unit {
    if (destroyed) {
      observer()
      return {}
    }
    destructionObservers.add(observer)
    return { destructionObservers.remove(observer) }
  }

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
      val status = when {
        confirmation != null -> "confirming"
        isUpdating -> "updating"
        else -> "ready"
      }
      emit(status)
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
    val observers = destructionObservers.toList()
    destructionObservers.clear()
    observers.forEach { it() }
    releasePresenter()
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
