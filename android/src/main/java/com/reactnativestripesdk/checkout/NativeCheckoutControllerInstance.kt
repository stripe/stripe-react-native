package com.reactnativestripesdk.checkout

import android.app.Activity
import androidx.activity.ComponentActivity
import androidx.annotation.MainThread
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.EventEmitterCompat
import com.reactnativestripesdk.utils.createError
import com.stripe.android.checkout.CheckoutElementsController
import com.stripe.android.checkout.CheckoutElementsPresenter
import com.stripe.android.elements.CurrencySelectorElement
import com.stripe.android.elements.ExpressCheckoutElement
import com.stripe.android.elements.PaymentElement
import com.stripe.android.elements.ShippingAddressElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CancellationException
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
@Suppress("TooManyFunctions")
internal class NativeCheckoutControllerInstance(
  val controller: CheckoutElementsController,
  private val eventEmitter: EventEmitterCompat,
  private val scope: CoroutineScope,
  initialSession: WritableMap,
  private val context: ReactApplicationContext,
  private val isShippingAddressElementConfigured: Boolean = false,
  private val isExpressCheckoutElementConfigured: Boolean = false,
) {

  private val serverUpdateCompletions = mutableMapOf<String, CompletableDeferred<Result<Unit>>>()
  private var controllerId: String? = null
  private var latestSession = initialSession
  private var destroyed = false
  private var confirmation: CompletableDeferred<CheckoutElementsController.Result>? = null
  private val destructionObservers = mutableSetOf<() -> Unit>()
  private var presenter: CheckoutElementsPresenter? = null
  private var activity: ComponentActivity? = null
  private val activityObserver = LifecycleEventObserver { source, event ->
    if (event == Lifecycle.Event.ON_DESTROY) {
      releasePresenter()
      // Android delivers a pending confirmation result to the activity that replaces this one, and
      // [confirmationHostListener] rebinds to it. A finishing activity has no replacement.
      if ((source as? Activity)?.isFinishing == true) {
        confirmation?.completeExceptionally(
          IllegalStateException(
            "The activity was destroyed before Checkout confirmation finished. " +
              "Check the Checkout Session status before retrying.",
          ),
        )
      }
    }
  }

  /** Rebinds a pending confirmation to a recreated activity, even after this controller is destroyed. */
  private val confirmationHostListener = object : LifecycleEventListener {
    override fun onHostResume() {
      val activity = context.currentActivity as? ComponentActivity ?: return
      if (confirmation != null && presenter == null) bindPresenter(activity)
    }

    override fun onHostPause() = Unit

    override fun onHostDestroy() = Unit
  }

  /** Reuses the native Payment Element for the lifetime of its activity. */
  fun paymentElement(activity: ComponentActivity): PaymentElement = getPresenter(activity).paymentElement()

  /** Reuses the native Currency Selector Element for the lifetime of its activity. */
  fun currencySelectorElement(activity: ComponentActivity): CurrencySelectorElement =
    getPresenter(activity).currencySelectorElement()

  /** Uses the same activity-bound presenter as Payment Element. */
  fun shippingAddressElement(activity: ComponentActivity): ShippingAddressElement {
    check(isShippingAddressElementConfigured) {
      "Shipping Address Element was not configured for this Checkout controller."
    }
    return getPresenter(activity).shippingAddressElement()
  }

  /** Uses the same activity-bound presenter as the other Checkout elements. */
  fun expressCheckoutElement(activity: ComponentActivity): ExpressCheckoutElement {
    check(isExpressCheckoutElementConfigured) {
      "Express Checkout Element was not configured for this Checkout controller."
    }
    return getPresenter(activity).expressCheckoutElement()
  }

  private fun getPresenter(activity: ComponentActivity): CheckoutElementsPresenter {
    check(!destroyed) { "Checkout controller was destroyed." }
    return bindPresenter(activity)
  }

  /** Registers the native result handlers on [activity], which receives confirmation results. */
  private fun bindPresenter(activity: ComponentActivity): CheckoutElementsPresenter {
    if (this.activity !== activity) {
      releasePresenter()
      presenter = controller.createPresenter(activity).also { newPresenter ->
        if (isShippingAddressElementConfigured) {
          // Register shipping results even when another element recreates the presenter.
          newPresenter.shippingAddressElement()
        }
        if (isExpressCheckoutElementConfigured) {
          // Register wallet results even when another element recreates the presenter.
          newPresenter.expressCheckoutElement()
        }
      }
      this.activity = activity
      activity.lifecycle.addObserver(activityObserver)
    }
    return checkNotNull(presenter)
  }

  /** Waits for the controller's result callback, including after bridge disposal. */
  @MainThread
  suspend fun confirm(activity: ComponentActivity): WritableMap {
    UiThreadUtil.assertOnUiThread()
    check(!destroyed) { "Checkout controller was destroyed." }
    check(confirmation == null) { "Checkout confirmation is already in progress." }
    val result = CompletableDeferred<CheckoutElementsController.Result>()
    confirmation = result
    context.addLifecycleEventListener(confirmationHostListener)
    try {
      emit("confirming")
      getPresenter(activity).confirm()
      val confirmationResult = result.await()
      if (!destroyed) publishCurrentState()
      return CheckoutSessionSerializer.serialize(confirmationResult, controller.session.value?.status)
    } finally {
      confirmation = null
      context.removeLifecycleEventListener(confirmationHostListener)
      if (destroyed) {
        releaseNativeResources()
      } else {
        emit(if (controller.isUpdating.value) "updating" else "ready")
      }
    }
  }

  @MainThread
  @Suppress("TooGenericExceptionCaught")
  fun onConfirmationResult(result: CheckoutElementsController.Result) {
    UiThreadUtil.assertOnUiThread()
    val pendingConfirmation = confirmation
    if (pendingConfirmation != null) {
      pendingConfirmation.complete(result)
    } else if (!destroyed && isExpressCheckoutElementConfigured) {
      scope.launch {
        val serializedResult = try {
          // Publish the refreshed session before the merchant handles the payment result.
          publishCurrentState()
          CheckoutSessionSerializer.serialize(result, controller.session.value?.status)
        } catch (error: CancellationException) {
          throw error
        } catch (error: Exception) {
          // Match explicit confirmation's bridge error handling rather than crashing the coroutine.
          createError(checkoutErrorCode(error), error).apply { putString("status", "failed") }
        }
        if (!destroyed) {
          eventEmitter.emitCheckoutExpressCheckoutDidComplete(
            Arguments.createMap().apply {
              putString("controllerId", controllerId)
              putMap("result", serializedResult)
            },
          )
        }
      }
    }
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
      controller.isUpdating.collect { isUpdating ->
        // Session serialization can suspend while loading a payment icon. Report busy transitions
        // immediately, even if a later state cancels the serialized snapshot.
        if (isUpdating && confirmation == null && !destroyed) emit("updating")
      }
    }
    scope.launch {
      sessionStates().collect { session -> publish(session) }
    }
  }

  private fun sessionStates() =
    controller.session.combine(controller.isUpdating) { session, _ -> session }
      .mapLatest { session ->
        session?.let { CheckoutSessionSerializer.serialize(it, context.checkoutIconContext()) }
      }.filterNotNull()

  /** Publishes the current native snapshot before its status or operation result reaches JS. */
  suspend fun publishCurrentState() {
    publish(sessionStates().first())
  }

  private fun publish(session: WritableMap) {
    if (!destroyed) {
      latestSession = session
      // A serialized snapshot can arrive after the native busy state has changed.
      val status = when {
        confirmation != null -> "confirming"
        controller.isUpdating.value -> "updating"
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
  suspend fun requestServerUpdate(operationId: String, request: () -> Unit): Result<Unit> {
    UiThreadUtil.assertOnUiThread()
    check(serverUpdateCompletions[operationId] == null) { "Checkout server update is already pending." }
    val completion = CompletableDeferred<Result<Unit>>()
    serverUpdateCompletions[operationId] = completion
    return try {
      request()
      completion.await()
    } finally {
      serverUpdateCompletions.remove(operationId)
    }
  }

  @MainThread
  fun completeServerUpdate(operationId: String, error: String?) {
    UiThreadUtil.assertOnUiThread()
    val completion = serverUpdateCompletions[operationId] ?: return
    completion.complete(
      error?.let { Result.failure(IllegalStateException(it)) } ?: Result.success(Unit),
    )
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
    serverUpdateCompletions.values.forEach {
      it.complete(Result.failure(CancellationException("Checkout controller was destroyed.")))
    }
    if (confirmation == null) releaseNativeResources()
  }

  private fun releaseNativeResources() {
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
