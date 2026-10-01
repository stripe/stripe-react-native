package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.util.Base64
import android.util.Log
import androidx.core.graphics.createBitmap
import androidx.core.graphics.drawable.DrawableCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.PaymentSheetErrorType
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.forEachKey
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.mapFromConfirmationToken
import com.reactnativestripesdk.utils.mapFromCustomPaymentMethod
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.reactnativestripesdk.utils.parseCustomPaymentMethods
import com.stripe.android.ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.core.reactnative.UnregisterSignal
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.ConfirmCustomPaymentMethodCallback
import com.stripe.android.paymentelement.CreateIntentWithConfirmationTokenCallback
import com.stripe.android.paymentelement.CustomPaymentMethodResult
import com.stripe.android.paymentelement.CustomPaymentMethodResultHandler
import com.stripe.android.paymentelement.PaymentMethodOptionsSetupFutureUsagePreview
import com.stripe.android.paymentsheet.CardFundingFilteringPrivatePreview
import com.stripe.android.paymentsheet.CreateIntentCallback
import com.stripe.android.paymentsheet.CreateIntentResult
import com.stripe.android.paymentsheet.PaymentOptionResultCallback
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.ByteArrayOutputStream
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

@OptIn(
  ReactNativeSdkInternal::class,
  ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class,
  CardFundingFilteringPrivatePreview::class,
)
class PaymentSheetManager(
  context: ReactApplicationContext,
  private val arguments: ReadableMap,
  private val initPromise: Promise,
) : StripeUIManager(context),
  ConfirmCustomPaymentMethodCallback {
  private class HostBinding(activity: FragmentActivity) {
    val activity = WeakReference(activity)
    val signal = UnregisterSignal()
    var observer: LifecycleEventObserver? = null
    var paymentSheet: PaymentSheet? = null
    var flowController: PaymentSheet.FlowController? = null
    var paymentIntentClientSecret: String? = null
    var setupIntentClientSecret: String? = null
    var intentConfiguration: PaymentSheet.IntentConfiguration? = null
    lateinit var configuration: PaymentSheet.Configuration
    var customFlow = false
    var pendingOperation: PaymentSheetOperation? = null
    var pendingInitialization: PaymentSheetOperation? = null
    var disposed = false
  }

  private val hosts = mutableListOf<HostBinding>()
  private var currentHost: HostBinding? = null
  private val operations = mutableSetOf<PaymentSheetOperation>()
  private val callbackScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var destroyed = false
  internal var paymentSheetIntentCreationCallback = CompletableDeferred<ReadableMap>()
  internal var paymentSheetConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()

  @SuppressLint("RestrictedApi")
  override fun onCreate() {
    configure(arguments, initPromise)
  }

  override fun onDestroy() {
    super.onDestroy()
    destroyed = true
    promise = null
    timeout = null
    hosts.toList().forEach { disposeHost(it) }
    operations.toList().forEach { it.dispose() }
    callbackScope.cancel()
    paymentSheetIntentCreationCallback.cancel()
    paymentSheetConfirmationTokenCreationCallback.cancel()
  }

  private fun newOperation(promise: Promise): PaymentSheetOperation =
    PaymentSheetOperation(context, promise) { operations.remove(it) }.also { operations.add(it) }

  private fun bindingFor(activity: FragmentActivity): HostBinding {
    hosts.firstOrNull { it.activity.get() === activity }?.let { return it }
    val binding = HostBinding(activity)
    val observer = LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_DESTROY) {
        takeOperation(binding)?.deliver(createUnavailableResultError())
        binding.pendingInitialization?.let { operation ->
          binding.pendingInitialization = null
          operation.deliver(
            createError(
              PaymentSheetErrorType.Failed.toString(),
              "PaymentSheet initialization was interrupted because its host Activity was destroyed. " +
                "Call initPaymentSheet again.",
            ),
          )
        }
        disposeHost(binding)
      }
    }
    binding.observer = observer
    hosts.add(binding)
    activity.lifecycle.addObserver(observer)
    return binding
  }

  private fun disposeHost(binding: HostBinding) {
    if (binding.disposed) return
    binding.disposed = true
    binding.signal.unregister()
    binding.observer?.let { binding.activity.get()?.lifecycle?.removeObserver(it) }
    binding.observer = null
    binding.paymentSheet = null
    binding.flowController = null
    binding.pendingOperation = null
    binding.pendingInitialization = null
    hosts.remove(binding)
    if (currentHost === binding) currentHost = null
  }

  private fun disposeIfRetired(binding: HostBinding) {
    if (binding !== currentHost && binding.pendingOperation == null && binding.pendingInitialization == null) {
      disposeHost(binding)
    }
  }

  private fun takeOperation(binding: HostBinding): PaymentSheetOperation? {
    if (destroyed) return null
    val operation = binding.pendingOperation ?: return null
    binding.pendingOperation = null
    operation.stopPresentationWork()
    disposeIfRetired(binding)
    return operation
  }

  fun configure(
    args: ReadableMap,
    promise: Promise,
  ) {
    if (destroyed) return
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return
    if (activity.isDestroyed || activity.lifecycle.currentState == Lifecycle.State.DESTROYED) {
      promise.resolve(createUnavailableResultError())
      return
    }
    if (hosts.any { it.activity.get() === activity && it.pendingInitialization != null }) {
      promise.resolve(
        createError(ErrorType.Failed.toString(), "PaymentSheet is already being initialized for this Activity."),
      )
      return
    }
    val merchantDisplayName = args.getString("merchantDisplayName").orEmpty()
    if (merchantDisplayName.isEmpty()) {
      promise.resolve(
        createError(ErrorType.Failed.toString(), "merchantDisplayName cannot be empty or null."),
      )
      return
    }

    val primaryButtonLabel = args.getString("primaryButtonLabel")
    val googlePayConfig = buildGooglePayConfig(args.getMap("googlePay"))
    val linkConfig = buildLinkConfig(args.getMap("link"))
    val allowsDelayedPaymentMethods = args.getBooleanOr("allowsDelayedPaymentMethods", false)
    val billingDetailsMap = args.getMap("defaultBillingDetails")
    val billingConfigParams = args.getMap("billingDetailsCollectionConfiguration")
    val paymentMethodOrder = args.getStringList("paymentMethodOrder")
    val allowsRemovalOfLastSavedPaymentMethod =
      args.getBooleanOr("allowsRemovalOfLastSavedPaymentMethod", true)
    val opensCardScannerAutomatically =
      args.getBooleanOr("opensCardScannerAutomatically", false)

    val paymentIntentClientSecret = args.getString("paymentIntentClientSecret").orEmpty()
    val setupIntentClientSecret = args.getString("setupIntentClientSecret").orEmpty()
    val intentConfiguration =
      resolvePaymentSheetValue(promise) {
        buildIntentConfiguration(args.getMap("intentConfiguration"))
      }.getOrElse { return }

    val appearance =
      resolveAppearanceValue(promise) {
        buildPaymentSheetAppearance(args.getMap("appearance"), context)
      }.getOrElse { return }

    val customerConfiguration =
      resolvePaymentSheetValue(promise) {
        buildCustomerConfiguration(args)
      }.getOrElse { return }

    val shippingDetails =
      args.getMap("defaultShippingDetails")?.let {
        AddressSheetView.buildAddressDetails(it)
      }

    val billingDetailsConfig = buildBillingDetailsCollectionConfiguration(billingConfigParams)

    val defaultBillingDetails = buildBillingDetails(billingDetailsMap)
    val configurationBuilder =
      PaymentSheet.Configuration
        .Builder(merchantDisplayName)
        .allowsDelayedPaymentMethods(allowsDelayedPaymentMethods)
        .defaultBillingDetails(defaultBillingDetails)
        .customer(customerConfiguration)
        .googlePay(googlePayConfig)
        .appearance(appearance)
        .shippingDetails(shippingDetails)
        .link(linkConfig)
        .billingDetailsCollectionConfiguration(billingDetailsConfig)
        .preferredNetworks(
          mapToPreferredNetworks(args.getIntegerList("preferredNetworks")),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .opensCardScannerAutomatically(opensCardScannerAutomatically)
        .cardBrandAcceptance(mapToCardBrandAcceptance(args))
        .apply {
          mapToAllowedCardFundingTypes(args)?.let { allowedCardFundingTypes(it) }
        }.customPaymentMethods(parseCustomPaymentMethods(args.getMap("customPaymentMethodConfiguration")))

    primaryButtonLabel?.let { configurationBuilder.primaryButtonLabel(it) }
    paymentMethodOrder?.let { configurationBuilder.paymentMethodOrder(it) }

    configurationBuilder.paymentMethodLayout(
      mapToPaymentMethodLayout(args.getString("paymentMethodLayout")),
    )

    mapToTermsDisplay(args)?.let { configurationBuilder.termsDisplay(it) }

    val binding = bindingFor(activity)
    binding.paymentIntentClientSecret = paymentIntentClientSecret
    binding.setupIntentClientSecret = setupIntentClientSecret
    binding.intentConfiguration = intentConfiguration
    binding.configuration = configurationBuilder.build()
    binding.customFlow = args.getBooleanOr("customFlow", false)
    val previous = currentHost
    currentHost = binding
    previous?.let { disposeIfRetired(it) }
    configureMode(binding, activity, args, promise)
  }

  private inline fun <T> resolvePaymentSheetValue(
    promise: Promise,
    builder: () -> T,
  ): Result<T> =
    try {
      Result.success(builder())
    } catch (error: PaymentSheetException) {
      promise.resolve(createError(ErrorType.Failed.toString(), error))
      Result.failure(error)
    }

  private inline fun <T> resolveAppearanceValue(
    promise: Promise,
    builder: () -> T,
  ): Result<T> =
    try {
      Result.success(builder())
    } catch (error: PaymentSheetAppearanceException) {
      promise.resolve(createError(ErrorType.Failed.toString(), error))
      Result.failure(error)
    }

  private fun configureMode(
    binding: HostBinding,
    activity: FragmentActivity,
    args: ReadableMap,
    promise: Promise,
  ) {
    if (binding.customFlow) {
      if (binding.flowController == null) {
        initFlowController(binding, activity, args)
      }
      configureFlowController(binding, promise)
      return
    }

    if (binding.paymentSheet == null) {
      initPaymentSheet(binding, activity, args)
    }
    promise.resolve(Arguments.createMap())
  }

  private fun initPaymentSheet(
    binding: HostBinding,
    activity: FragmentActivity,
    args: ReadableMap,
  ) {
    val intentConfigMap = args.getMap("intentConfiguration")
    val useConfirmationTokenCallback = intentConfigMap?.hasKey("confirmationTokenConfirmHandler") == true
    binding.paymentSheet =
      if (binding.intentConfiguration != null) {
        val builder = PaymentSheet.Builder(buildPaymentSheetResultCallback(binding))
        if (useConfirmationTokenCallback) {
          builder.createIntentCallback(buildCreateConfirmationTokenCallback())
        } else {
          builder.createIntentCallback(buildIntentCreationCallback())
        }
        @SuppressLint("RestrictedApi")
        builder
          .confirmCustomPaymentMethodCallback(this)
          .build(activity, binding.signal)
      } else {
        @SuppressLint("RestrictedApi")
        PaymentSheet
          .Builder(buildPaymentSheetResultCallback(binding))
          .confirmCustomPaymentMethodCallback(this)
          .build(activity, binding.signal)
      }
  }

  private fun initFlowController(
    binding: HostBinding,
    activity: FragmentActivity,
    args: ReadableMap,
  ) {
    val intentConfigMap = args.getMap("intentConfiguration")
    val useConfirmationTokenCallback =
      intentConfigMap?.hasKey("confirmationTokenConfirmHandler") == true
    binding.flowController =
      if (binding.intentConfiguration != null) {
        val builder =
          PaymentSheet.FlowController
            .Builder(
              resultCallback = buildPaymentSheetResultCallback(binding),
              paymentOptionResultCallback = buildPaymentOptionCallback(binding),
            )
        if (useConfirmationTokenCallback) {
          builder.createIntentCallback(buildCreateConfirmationTokenCallback())
        } else {
          builder.createIntentCallback(buildIntentCreationCallback())
        }
        builder.confirmCustomPaymentMethodCallback(this)
        builder.build(activity)
      } else {
        PaymentSheet.FlowController
          .Builder(
            resultCallback = buildPaymentSheetResultCallback(binding),
            paymentOptionResultCallback = buildPaymentOptionCallback(binding),
          ).confirmCustomPaymentMethodCallback(this)
          .build(activity)
      }
  }

  private fun buildCreateConfirmationTokenCallback(): CreateIntentWithConfirmationTokenCallback {
    return CreateIntentWithConfirmationTokenCallback { confirmationToken ->
      val stripeSdkModule: StripeSdkModule? = context.getNativeModule(StripeSdkModule::class.java)
      val params =
        Arguments.createMap().apply {
          putMap("confirmationToken", mapFromConfirmationToken(confirmationToken))
        }

      stripeSdkModule?.eventEmitter?.emitOnConfirmationTokenHandlerCallback(params)

      val resultFromJavascript = paymentSheetConfirmationTokenCreationCallback.await()
      // reset the completable
      paymentSheetConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()

      return@CreateIntentWithConfirmationTokenCallback resultFromJavascript.getString("clientSecret")?.let {
        CreateIntentResult.Success(clientSecret = it)
      }
        ?: run {
          val errorMap = resultFromJavascript.getMap("error")
          CreateIntentResult.Failure(
            cause = Exception(errorMap?.getString("message")),
            displayMessage = errorMap?.getString("localizedMessage"),
          )
        }
    }
  }

  private fun buildIntentCreationCallback(): CreateIntentCallback {
    return CreateIntentCallback { paymentMethod, shouldSavePaymentMethod ->
      val stripeSdkModule: StripeSdkModule? = context.getNativeModule(StripeSdkModule::class.java)
      val params =
        Arguments.createMap().apply {
          putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
          putBoolean("shouldSavePaymentMethod", shouldSavePaymentMethod)
        }

      stripeSdkModule?.eventEmitter?.emitOnConfirmHandlerCallback(params)

      val resultFromJavascript = paymentSheetIntentCreationCallback.await()
      // reset the completable
      paymentSheetIntentCreationCallback = CompletableDeferred<ReadableMap>()

      return@CreateIntentCallback resultFromJavascript.getString("clientSecret")?.let {
        CreateIntentResult.Success(clientSecret = it)
      }
        ?: run {
          val errorMap = resultFromJavascript.getMap("error")
          CreateIntentResult.Failure(
            cause = Exception(errorMap?.getString("message")),
            displayMessage = errorMap?.getString("localizedMessage"),
          )
        }
    }
  }

  private fun buildPaymentSheetResultCallback(binding: HostBinding): PaymentSheetResultCallback =
    PaymentSheetResultCallback { paymentResult ->
      takeOperation(binding)?.complete(paymentResult)
    }

  private fun buildPaymentOptionCallback(binding: HostBinding): PaymentOptionResultCallback =
    PaymentOptionResultCallback { paymentOptionResult ->
      val operation = takeOperation(binding) ?: return@PaymentOptionResultCallback
      val paymentOption = paymentOptionResult.paymentOption
      if (paymentOption == null) {
        operation.deliver(
          if (operation.timedOut) {
            createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out")
          } else {
            createError(
              PaymentSheetErrorType.Canceled.toString(), "The payment option selection flow has been canceled",
            )
          },
        )
      } else {
        operation.processingJob = callbackScope.launch {
          val imageString = try {
            withContext(Dispatchers.Default) { convertDrawableToBase64(paymentOption.icon()) }
          } catch (e: CancellationException) {
            throw e
          } catch (e: Exception) {
            operation.deliver(
              createError(
                PaymentSheetErrorType.Failed.toString(), "Failed to process payment option image: ${e.message}",
              ),
            )
            return@launch
          }
          val option = Arguments.createMap().apply {
            putString("label", paymentOption.label)
            putString("image", imageString)
          }
          operation.deliver(createResult("paymentOption", option, mapOf("didCancel" to paymentOptionResult.didCancel)))
        }
      }
    }

  override fun onPresent() {
    // StripeUIManager's fields are only the synchronous handoff, never result ownership.
    val originalPromise = promise ?: return
    val presentationTimeout = timeout
    promise = null
    timeout = null
    if (destroyed) return
    val activity = getCurrentActivityOrResolveWithError(originalPromise) ?: return
    val binding = currentHost
    if (binding == null || binding.activity.get() !== activity) {
      originalPromise.resolve(createMissingInitError())
      return
    }
    val operation = beginOperation(binding, originalPromise) ?: return
    operation.start(
      activity, presentationTimeout, if (binding.customFlow) PAYMENT_OPTIONS_ACTIVITY else PAYMENT_SHEET_ACTIVITY,
    )
    if (binding.customFlow) {
      binding.flowController?.presentPaymentOptions()
    } else if (!binding.paymentIntentClientSecret.isNullOrEmpty()) {
      binding.paymentSheet?.presentWithPaymentIntent(binding.paymentIntentClientSecret!!, binding.configuration)
    } else if (!binding.setupIntentClientSecret.isNullOrEmpty()) {
      binding.paymentSheet?.presentWithSetupIntent(binding.setupIntentClientSecret!!, binding.configuration)
    } else if (binding.intentConfiguration != null) {
      binding.paymentSheet?.presentWithIntentConfiguration(binding.intentConfiguration!!, binding.configuration)
    } else {
      takeOperation(binding)?.deliver(createMissingInitError())
    }
  }

  private fun beginOperation(binding: HostBinding, promise: Promise): PaymentSheetOperation? {
    if (binding.pendingOperation != null) {
      promise.resolve(
        createError(
          PaymentSheetErrorType.Failed.toString(),
          "PaymentSheet is already presenting or confirming for this Activity.",
        ),
      )
      return null
    }
    return newOperation(promise).also { binding.pendingOperation = it }
  }

  fun presentWithTimeout(timeout: Long, promise: Promise) {
    present(promise, timeout)
  }

  fun confirmPayment(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (destroyed) return@runOnUiThread
      val binding = currentHost
      if (binding == null || binding.flowController == null || binding.activity.get() !== context.currentActivity) {
        promise.resolve(createMissingInitError())
        return@runOnUiThread
      }
      beginOperation(binding, promise) ?: return@runOnUiThread
      binding.flowController?.confirm()
    }
  }

  private fun configureFlowController(binding: HostBinding, promise: Promise) {
    val controller = binding.flowController ?: return
    val operation = newOperation(promise)
    binding.pendingInitialization = operation
    val onConfigured = PaymentSheet.FlowController.ConfigCallback { success, error ->
      UiThreadUtil.runOnUiThread {
        if (destroyed || binding.pendingInitialization !== operation) return@runOnUiThread
        val configuredController = binding.flowController
        binding.pendingInitialization = null
        disposeIfRetired(binding)
        operation.processingJob = handleFlowControllerConfigured(
          success, error, configuredController, callbackScope, operation::deliver,
        )
      }
    }
    if (!binding.paymentIntentClientSecret.isNullOrEmpty()) {
      controller.configureWithPaymentIntent(binding.paymentIntentClientSecret!!, binding.configuration, onConfigured)
    } else if (!binding.setupIntentClientSecret.isNullOrEmpty()) {
      controller.configureWithSetupIntent(binding.setupIntentClientSecret!!, binding.configuration, onConfigured)
    } else if (binding.intentConfiguration != null) {
      controller.configureWithIntentConfiguration(binding.intentConfiguration!!, binding.configuration, onConfigured)
    } else {
      binding.pendingInitialization = null
      operation.deliver(
        createError(
          ErrorType.Failed.toString(),
          "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration` is required",
        ),
      )
    }
  }

  override fun onConfirmCustomPaymentMethod(
    customPaymentMethod: PaymentSheet.CustomPaymentMethod,
    billingDetails: PaymentMethod.BillingDetails,
  ) {
    UiThreadUtil.runOnUiThread {
      if (!destroyed) confirmCustomPaymentMethod(customPaymentMethod, billingDetails)
    }
  }

  private fun confirmCustomPaymentMethod(
    customPaymentMethod: PaymentSheet.CustomPaymentMethod,
    billingDetails: PaymentMethod.BillingDetails,
  ) {
    // Launch a transparent Activity to ensure React Native UI can appear on top of the Stripe proxy activity.
    try {
      val intent =
        Intent(context, CustomPaymentMethodActivity::class.java).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
        }
      context.startActivity(intent)
    } catch (e: Exception) {
      Log.e("StripeReactNative", "Failed to start CustomPaymentMethodActivity", e)
    }

    val stripeSdkModule =
      try {
        context.getNativeModule(StripeSdkModule::class.java)
          ?: throw IllegalArgumentException("StripeSdkModule not found")
      } catch (ex: IllegalArgumentException) {
        Log.e("StripeReactNative", "StripeSdkModule not found for CPM callback", ex)
        CustomPaymentMethodActivity.finishCurrent()
        return
      }

    // Keep JS awake while React Native is backgrounded by Stripe SDK.
    val keepJsAwakeTask =
      KeepJsAwakeTask(context).apply { start() }

    // Run on main coroutine scope.
    callbackScope.launch {
      try {
        // Give the CustomPaymentMethodActivity a moment to fully initialize
        delay(CUSTOM_PAYMENT_METHOD_INIT_DELAY_MS)

        // Emit event so JS can show the Alert and eventually respond via `customPaymentMethodResultCallback`.
        stripeSdkModule.eventEmitter.emitOnCustomPaymentMethodConfirmHandlerCallback(
          mapFromCustomPaymentMethod(customPaymentMethod, billingDetails),
        )

        // Await JS result.
        val resultFromJs = stripeSdkModule.customPaymentMethodResultCallback.await()

        keepJsAwakeTask.stop()

        val status = resultFromJs.getString("status")

        val nativeResult =
          when (status) {
            "completed" ->
              CustomPaymentMethodResult.completed()
            "canceled" ->
              CustomPaymentMethodResult.canceled()
            "failed" -> {
              val errMsg = resultFromJs.getString("error") ?: "Custom payment failed"
              CustomPaymentMethodResult.failed(displayMessage = errMsg)
            }
            else ->
              CustomPaymentMethodResult.failed(displayMessage = "Unknown status")
          }

        // Return result to Stripe SDK.
        CustomPaymentMethodResultHandler.handleCustomPaymentMethodResult(
          context,
          nativeResult,
        )
      } finally {
        keepJsAwakeTask.stop()
        // Clean up the transparent activity
        CustomPaymentMethodActivity.finishCurrent()
      }
    }
  }

  companion object {
    internal fun createUnavailableResultError(): WritableMap = createError(
      PaymentSheetErrorType.Failed.toString(),
      "The payment result is unavailable because its host Activity was destroyed. " +
        "The payment may have completed. Check the payment status before trying again.",
    )

    internal fun createMissingInitError(): WritableMap =
      createError(
        PaymentSheetErrorType.Failed.toString(),
        "No payment sheet has been initialized yet. You must call `initPaymentSheet` before `presentPaymentSheet`.",
      )

    private const val CUSTOM_PAYMENT_METHOD_INIT_DELAY_MS = 100L
  }
}

internal fun runWhenActivityAvailable(
  context: ReactApplicationContext,
  action: () -> Unit,
): () -> Unit {
  if (context.currentActivity != null) {
    action()
    return {}
  }

  val didFinish = AtomicBoolean(false)
  lateinit var listener: LifecycleEventListener

  fun runIfActivityAvailable() {
    if (context.currentActivity != null && didFinish.compareAndSet(false, true)) {
      context.removeLifecycleEventListener(listener)
      action()
    }
  }

  listener =
    object : LifecycleEventListener {
      override fun onHostResume() {
        runIfActivityAvailable()
      }

      override fun onHostPause() {
        // No-op. Wait for the React activity to resume before resolving the promise.
      }

      override fun onHostDestroy() {
        // The runtime may survive. Keep the already-received result until another host attaches.
      }
    }

  context.addLifecycleEventListener(listener)

  // The activity can resume between the initial check and listener registration.
  runIfActivityAvailable()
  return {
    if (didFinish.compareAndSet(false, true)) {
      context.removeLifecycleEventListener(listener)
    }
  }
}

suspend fun waitForDrawableToLoad(
  drawable: Drawable,
  timeoutMs: Long = 3000,
): Drawable {
  // If already loaded, return immediately
  if (drawable.intrinsicWidth > 1 && drawable.intrinsicHeight > 1) {
    return drawable
  }

  // Use callback to be notified when drawable finishes loading
  return withTimeoutOrNull(timeoutMs) {
    suspendCancellableCoroutine { continuation ->
      val callback =
        object : Drawable.Callback {
          override fun invalidateDrawable(who: Drawable) {
            // Drawable has changed/loaded - check if it's ready now
            if (who.intrinsicWidth > 1 && who.intrinsicHeight > 1) {
              who.callback = null // Remove callback
              if (continuation.isActive) {
                continuation.resume(who)
              }
            }
          }

          override fun scheduleDrawable(
            who: Drawable,
            what: Runnable,
            `when`: Long,
          ) {
            // NO-OP
          }

          override fun unscheduleDrawable(
            who: Drawable,
            what: Runnable,
          ) {
            // NO-OP
          }
        }

      drawable.callback = callback

      // Trigger an invalidation to check if it loads immediately
      drawable.invalidateSelf()

      continuation.invokeOnCancellation { drawable.callback = null }
    }
  } ?: drawable // Return drawable even if timeout (best effort)
}

suspend fun convertDrawableToBase64(drawable: Drawable): String? {
  val loadedDrawable = waitForDrawableToLoad(drawable)
  val bitmap = getBitmapFromDrawable(loadedDrawable)
  return getBase64FromBitmap(bitmap)
}

fun getBitmapFromDrawable(drawable: Drawable): Bitmap? {
  val drawableCompat = DrawableCompat.wrap(drawable).mutate()

  // Determine the size to use - prefer intrinsic size, fall back to bounds
  val width =
    if (drawableCompat.intrinsicWidth > 0) {
      drawableCompat.intrinsicWidth
    } else {
      drawableCompat.bounds.width()
    }

  val height =
    if (drawableCompat.intrinsicHeight > 0) {
      drawableCompat.intrinsicHeight
    } else {
      drawableCompat.bounds.height()
    }

  if (width <= 0 || height <= 0) {
    return null
  }

  val bitmap = createBitmap(width, height, Bitmap.Config.ARGB_8888)
  bitmap.eraseColor(Color.TRANSPARENT)
  val canvas = Canvas(bitmap)
  drawableCompat.setBounds(0, 0, canvas.width, canvas.height)
  drawableCompat.draw(canvas)

  return bitmap
}

fun getBase64FromBitmap(bitmap: Bitmap?): String? {
  if (bitmap == null) {
    return null
  }
  val stream = ByteArrayOutputStream()
  bitmap.compress(Bitmap.CompressFormat.PNG, BITMAP_COMPRESS_QUALITY, stream)
  val imageBytes: ByteArray = stream.toByteArray()
  return Base64.encodeToString(imageBytes, Base64.DEFAULT)
}

fun mapToPaymentMethodLayout(str: String?): PaymentSheet.PaymentMethodLayout =
  when (str) {
    "Horizontal" -> PaymentSheet.PaymentMethodLayout.Horizontal
    "Vertical" -> PaymentSheet.PaymentMethodLayout.Vertical
    else -> PaymentSheet.PaymentMethodLayout.Automatic
  }

internal fun mapToSetupFutureUse(type: String?): PaymentSheet.IntentConfiguration.SetupFutureUse? =
  when (type) {
    "OffSession" -> PaymentSheet.IntentConfiguration.SetupFutureUse.OffSession
    "OnSession" -> PaymentSheet.IntentConfiguration.SetupFutureUse.OnSession
    "None" -> PaymentSheet.IntentConfiguration.SetupFutureUse.None
    else -> null
  }

internal fun mapToCaptureMethod(type: String?): PaymentSheet.IntentConfiguration.CaptureMethod =
  when (type) {
    "Automatic" -> PaymentSheet.IntentConfiguration.CaptureMethod.Automatic
    "Manual" -> PaymentSheet.IntentConfiguration.CaptureMethod.Manual
    "AutomaticAsync" -> PaymentSheet.IntentConfiguration.CaptureMethod.AutomaticAsync
    else -> PaymentSheet.IntentConfiguration.CaptureMethod.Automatic
  }

@OptIn(PaymentMethodOptionsSetupFutureUsagePreview::class)
internal fun mapToPaymentMethodOptions(
  options: ReadableMap?
): PaymentSheet.IntentConfiguration.Mode.Payment.PaymentMethodOptions? {
  val sfuMap = options?.getMap("setupFutureUsageValues")
  val paymentMethodToSfuMap = mutableMapOf<PaymentMethod.Type, PaymentSheet.IntentConfiguration.SetupFutureUse>()
  sfuMap?.forEachKey { code ->
    val sfuValue = mapToSetupFutureUse(sfuMap.getString(code))
    val paymentMethodType = PaymentMethod.Type.fromCode(code)
    if (paymentMethodType != null && sfuValue != null) {
      paymentMethodToSfuMap[paymentMethodType] = sfuValue
    }
  }
  return if (paymentMethodToSfuMap.isNotEmpty()) {
    PaymentSheet.IntentConfiguration.Mode.Payment.PaymentMethodOptions(
      setupFutureUsageValues = paymentMethodToSfuMap,
    )
  } else {
    null
  }
}

internal fun handleFlowControllerConfigured(
  success: Boolean,
  error: Throwable?,
  flowController: PaymentSheet.FlowController?,
  scope: CoroutineScope,
  onResult: (WritableMap) -> Unit,
): Job? {
  if (!success) {
    onResult(
      createError(PaymentSheetErrorType.Failed.toString(), error?.message ?: "Failed to configure payment sheet"),
    )
    return null
  }
  val paymentOption = flowController?.getPaymentOption()
  if (paymentOption == null) {
    onResult(Arguments.createMap())
    return null
  }
  return scope.launch {
    val imageString = try {
      withContext(Dispatchers.Default) { convertDrawableToBase64(paymentOption.icon()) }
    } catch (e: CancellationException) {
      throw e
    } catch (e: Exception) {
      onResult(
        createError(PaymentSheetErrorType.Failed.toString(), "Failed to process payment option image: ${e.message}"),
      )
      return@launch
    }
    val option = Arguments.createMap().apply {
      putString("label", paymentOption.label)
      putString("image", imageString)
    }
    onResult(createResult("paymentOption", option))
  }
}

private const val BITMAP_COMPRESS_QUALITY = 100
private const val PAYMENT_SHEET_ACTIVITY = "com.stripe.android.paymentsheet.PaymentSheetActivity"
private const val PAYMENT_OPTIONS_ACTIVITY = "com.stripe.android.paymentsheet.PaymentOptionsActivity"
