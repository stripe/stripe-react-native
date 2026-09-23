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
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
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
import com.stripe.android.paymentsheet.PaymentSheetResult
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

@OptIn(
  ReactNativeSdkInternal::class,
  ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class,
  CardFundingFilteringPrivatePreview::class,
)
@SuppressLint("RestrictedApi")
class PaymentSheetManager internal constructor(
  context: ReactApplicationContext,
  private val arguments: ReadableMap,
  private val initPromise: Promise,
  private val paymentSheetFactory: (PaymentSheet.Builder, FragmentActivity, UnregisterSignal) -> PaymentSheet =
    { builder, activity, signal -> builder.build(activity, signal) },
  private val flowControllerFactory: (
    PaymentSheet.FlowController.Builder,
    FragmentActivity,
  ) -> PaymentSheet.FlowController =
    { builder, activity -> builder.build(activity) },
) : StripeUIManager(context),
  ConfirmCustomPaymentMethodCallback {
  private var paymentSheet: PaymentSheet? = null
  private var flowController: PaymentSheet.FlowController? = null
  private var paymentIntentClientSecret: String? = null
  private var setupIntentClientSecret: String? = null
  private var intentConfiguration: PaymentSheet.IntentConfiguration? = null
  private lateinit var paymentSheetConfiguration: PaymentSheet.Configuration
  private var configurationPromise: PaymentSheetRequest? = null
  private var presentationPromise: PaymentSheetRequest? = null
  private var confirmPromise: PaymentSheetRequest? = null
  private var paymentSheetTimedOut = false
  internal var paymentSheetIntentCreationCallback = CompletableDeferred<ReadableMap>()
  internal var paymentSheetConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()
  private var keepJsAwake: KeepJsAwakeTask? = null
  private var lastConfigureWasCustomFlow: Boolean? = null
  private var configurationReady = false
  private var hostActivity: FragmentActivity? = null
  private var hostGeneration = 0L
  private var presentationTimeout: PaymentSheetPresentationTimeout? = null
  private var cancelPendingResult: (() -> Unit)? = null
  private val hostLifecycleObserver =
    object : DefaultLifecycleObserver {
      override fun onDestroy(owner: LifecycleOwner) {
        if (owner === hostActivity) {
          invalidateHostActivity()
        }
      }
    }

  @SuppressLint("RestrictedApi")
  override fun onCreate() {
    configure(arguments, initPromise)
  }

  override fun onDestroy() {
    invalidateHostActivity()
    super.onDestroy()
  }

  private fun invalidateHostActivity() {
    hostGeneration += 1
    hostActivity?.lifecycle?.removeObserver(hostLifecycleObserver)
    hostActivity = null
    signal.unregister()
    flowController = null
    paymentSheet = null
    lastConfigureWasCustomFlow = null
    configurationReady = false
    configurationPromise?.resolve(createActivityChangedError())
    presentationPromise?.resolve(createActivityChangedError())
    confirmPromise?.resolve(createActivityChangedError())
    clearPresentationResources()
  }

  private fun bindToActivity(activity: FragmentActivity) {
    if (hostActivity === activity) return
    invalidateHostActivity()
    hostActivity = activity
    activity.lifecycle.addObserver(hostLifecycleObserver)
  }

  fun configure(
    args: ReadableMap,
    promise: Promise,
  ) {
    runPaymentSheetOnUiThread {
      configureOnUiThread(args, promise)
    }
  }

  private fun configureOnUiThread(
    args: ReadableMap,
    originalPromise: Promise,
  ) {
    val activity = getValidActivity(originalPromise) ?: return
    bindToActivity(activity)
    if (rejectConcurrentOperation(originalPromise)) return
    configurationReady = false
    lateinit var promise: PaymentSheetRequest
    promise =
      PaymentSheetRequest(originalPromise) { value ->
        if (configurationPromise === promise) {
          configurationPromise = null
          configurationReady = value is ReadableMap && !value.hasKey("error")
        }
      }
    configurationPromise = promise
    val merchantDisplayName = args.getString("merchantDisplayName").orEmpty()
    if (merchantDisplayName.isEmpty()) {
      promise.resolve(
        createError(ErrorType.Failed.toString(), "merchantDisplayName cannot be empty or null."),
      )
      return
    }

    paymentIntentClientSecret = args.getString("paymentIntentClientSecret").orEmpty()
    setupIntentClientSecret = args.getString("setupIntentClientSecret").orEmpty()
    intentConfiguration =
      resolvePaymentSheetValue(promise) {
        buildIntentConfiguration(args.getMap("intentConfiguration"))
      }.getOrElse { return }
    paymentSheetConfiguration = buildConfiguration(args, merchantDisplayName, promise) ?: return
    configureMode(args, activity, promise)
  }

  private fun buildConfiguration(
    args: ReadableMap,
    merchantDisplayName: String,
    promise: Promise,
  ): PaymentSheet.Configuration? {
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

    val appearance =
      resolveAppearanceValue(promise) {
        buildPaymentSheetAppearance(args.getMap("appearance"), context)
      }.getOrElse { return null }

    val customerConfiguration =
      resolvePaymentSheetValue(promise) {
        buildCustomerConfiguration(args)
      }.getOrElse { return null }

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

    return configurationBuilder.build()
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
    args: ReadableMap,
    activity: FragmentActivity,
    promise: PaymentSheetRequest,
  ) {
    if (paymentIntentClientSecret.isNullOrEmpty() &&
      setupIntentClientSecret.isNullOrEmpty() && intentConfiguration == null
    ) {
      promise.resolve(
        createError(
          PaymentSheetErrorType.Failed.toString(),
          "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration` is required",
        ),
      )
      return
    }
    if (args.getBooleanOr("customFlow", false)) {
      lastConfigureWasCustomFlow = true
      if (flowController == null) {
        initFlowController(args, activity)
      }
      configureFlowController(promise)
      return
    }

    lastConfigureWasCustomFlow = false
    if (paymentSheet == null) {
      initPaymentSheet(args, activity)
    }
    promise.resolve(Arguments.createMap())
  }

  private fun rejectConcurrentOperation(promise: Promise): Boolean {
    if (configurationPromise != null || presentationPromise != null || confirmPromise != null) {
      promise.resolve(
        createError(PaymentSheetErrorType.Failed.toString(), "A PaymentSheet operation is already in progress."),
      )
      return true
    }
    return false
  }

  private fun getValidActivity(promise: Promise?): FragmentActivity? {
    val activity = getCurrentActivityOrResolveWithError(promise) ?: return null
    if (activity.isFinishing || activity.isDestroyed || activity.lifecycle.currentState == Lifecycle.State.DESTROYED) {
      if (activity === hostActivity) invalidateHostActivity()
      promise?.resolve(createActivityChangedError())
      return null
    }
    return activity
  }

  private fun validatePresentation(promise: Promise?): Boolean {
    val activity = getValidActivity(promise) ?: return false
    if (activity !== hostActivity) {
      invalidateHostActivity()
      promise?.resolve(createActivityChangedError())
      return false
    }
    if (!configurationReady) {
      promise?.resolve(createMissingInitError())
      return false
    }
    return true
  }

  private fun initPaymentSheet(
    args: ReadableMap,
    activity: FragmentActivity,
  ) {
    val intentConfigMap = args.getMap("intentConfiguration")
    val useConfirmationTokenCallback = intentConfigMap?.hasKey("confirmationTokenConfirmHandler") == true
    val builder = PaymentSheet.Builder(buildPaymentSheetResultCallback())
    if (intentConfiguration != null) {
      if (useConfirmationTokenCallback) {
        builder.createIntentCallback(buildCreateConfirmationTokenCallback())
      } else {
        builder.createIntentCallback(buildIntentCreationCallback())
      }
    }
    paymentSheet = paymentSheetFactory(builder.confirmCustomPaymentMethodCallback(this), activity, signal)
  }

  private fun initFlowController(
    args: ReadableMap,
    activity: FragmentActivity,
  ) {
    val intentConfigMap = args.getMap("intentConfiguration")
    val useConfirmationTokenCallback =
      intentConfigMap?.hasKey("confirmationTokenConfirmHandler") == true
    val builder =
      PaymentSheet.FlowController.Builder(
        resultCallback = buildPaymentSheetResultCallback(),
        paymentOptionResultCallback = buildPaymentOptionCallback(),
      )
    if (intentConfiguration != null) {
      if (useConfirmationTokenCallback) {
        builder.createIntentCallback(buildCreateConfirmationTokenCallback())
      } else {
        builder.createIntentCallback(buildIntentCreationCallback())
      }
    }
    flowController = flowControllerFactory(builder.confirmCustomPaymentMethodCallback(this), activity)
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

  private fun buildPaymentSheetResultCallback(): PaymentSheetResultCallback {
    val generation = hostGeneration
    return PaymentSheetResultCallback { paymentResult ->
      runPaymentSheetOnUiThread {
        if (generation != hostGeneration) return@runPaymentSheetOnUiThread
        val result =
          if (paymentSheetTimedOut) {
            createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out")
          } else {
            when (paymentResult) {
              is PaymentSheetResult.Canceled ->
                createError(PaymentSheetErrorType.Canceled.toString(), "The payment flow has been canceled")
              is PaymentSheetResult.Failed ->
                createError(PaymentSheetErrorType.Failed.toString(), paymentResult.error)
              is PaymentSheetResult.Completed -> Arguments.createMap()
            }
          }
        resolvePaymentResult(result)
      }
    }
  }

  private fun buildPaymentOptionCallback(): PaymentOptionResultCallback {
    val generation = hostGeneration
    return PaymentOptionResultCallback { paymentOptionResult ->
      runPaymentSheetOnUiThread {
        if (generation != hostGeneration) return@runPaymentSheetOnUiThread
        val request = presentationPromise ?: return@runPaymentSheetOnUiThread
        paymentOptionResult.paymentOption?.let { paymentOption ->
          // Keep the request that selected this option while its icon loads asynchronously.
          CoroutineScope(Dispatchers.Default).launch {
            val imageString =
              try {
                convertDrawableToBase64(paymentOption.icon())
              } catch (e: Exception) {
                request.resolve(
                  createError(
                    PaymentSheetErrorType.Failed.toString(),
                    "Failed to process payment option image: ${e.message}",
                  ),
                )
                return@launch
              }

            val option: WritableMap = Arguments.createMap()
            option.putString("label", paymentOption.label)
            option.putString("image", imageString)
            val additionalFields: Map<String, Any> = mapOf("didCancel" to paymentOptionResult.didCancel)
            request.resolve(createResult("paymentOption", option, additionalFields))
          }
        } ?: run {
          val result =
            if (paymentSheetTimedOut) {
              createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out")
            } else {
              createError(
                PaymentSheetErrorType.Canceled.toString(),
                "The payment option selection flow has been canceled",
              )
            }
          request.resolve(result)
        }
      }
    }
  }

  override fun present(
    promise: Promise?,
    timeout: Long?,
  ) {
    runPaymentSheetOnUiThread {
      if (promise == null || !validatePresentation(promise) || rejectConcurrentOperation(promise)) {
        return@runPaymentSheetOnUiThread
      }
      lateinit var request: PaymentSheetRequest
      request =
        PaymentSheetRequest(promise) {
          if (presentationPromise === request) {
            presentationPromise = null
            this.promise = null
            clearPresentationResources()
          }
        }
      presentationPromise = request
      this.promise = request
      this.timeout = timeout
      onPresent()
    }
  }

  override fun onPresent() {
    timeout?.let(::startPresentationTimeout)
    keepJsAwake = KeepJsAwakeTask(context).apply { start() }
    if (lastConfigureWasCustomFlow == false) {
      if (!paymentIntentClientSecret.isNullOrEmpty()) {
        paymentSheet?.presentWithPaymentIntent(
          paymentIntentClientSecret!!,
          paymentSheetConfiguration,
        )
      } else if (!setupIntentClientSecret.isNullOrEmpty()) {
        paymentSheet?.presentWithSetupIntent(setupIntentClientSecret!!, paymentSheetConfiguration)
      } else if (intentConfiguration != null) {
        paymentSheet?.presentWithIntentConfiguration(
          intentConfiguration = intentConfiguration!!,
          configuration = paymentSheetConfiguration,
        )
      }
    } else if (lastConfigureWasCustomFlow == true && flowController != null) {
      flowController?.presentPaymentOptions()
    } else {
      promise?.resolve(createMissingInitError())
    }
  }

  fun presentWithTimeout(
    timeout: Long,
    promise: Promise,
  ) {
    present(promise, timeout)
  }

  private fun startPresentationTimeout(timeout: Long) {
    val application = hostActivity?.application ?: return
    val request = presentationPromise ?: return
    presentationTimeout =
      PaymentSheetPresentationTimeout(application, timeout) {
        if (request === presentationPromise) paymentSheetTimedOut = true
      }
  }

  fun confirmPayment(promise: Promise) {
    runPaymentSheetOnUiThread {
      if (!validatePresentation(promise)) return@runPaymentSheetOnUiThread
      if (rejectConcurrentOperation(promise)) return@runPaymentSheetOnUiThread
      if (lastConfigureWasCustomFlow != true || flowController == null) {
        promise.resolve(
          createError(
            PaymentSheetErrorType.Failed.toString(),
            "Call `initPaymentSheet` with `customFlow: true` before `confirmPaymentSheetPayment`.",
          ),
        )
        return@runPaymentSheetOnUiThread
      }
      lateinit var request: PaymentSheetRequest
      request =
        PaymentSheetRequest(promise) {
          if (confirmPromise === request) {
            confirmPromise = null
            clearPresentationResources()
          }
        }
      this.confirmPromise = request
      flowController?.confirm()
    }
  }

  private fun configureFlowController(promise: PaymentSheetRequest) {
    val configuredController = flowController
    val generation = hostGeneration
    var receivedResult = false
    val onFlowControllerConfigure =
      PaymentSheet.FlowController.ConfigCallback { success, error ->
        runPaymentSheetOnUiThread {
          if (!promise.isPending || receivedResult) return@runPaymentSheetOnUiThread
          receivedResult = true
          if (generation != hostGeneration || configuredController !== flowController) {
            promise.resolve(createActivityChangedError())
          } else {
            handleFlowControllerConfigured(success, error, promise, configuredController)
          }
        }
      }

    if (!paymentIntentClientSecret.isNullOrEmpty()) {
      flowController?.configureWithPaymentIntent(
        paymentIntentClientSecret = paymentIntentClientSecret!!,
        configuration = paymentSheetConfiguration,
        callback = onFlowControllerConfigure,
      )
    } else if (!setupIntentClientSecret.isNullOrEmpty()) {
      flowController?.configureWithSetupIntent(
        setupIntentClientSecret = setupIntentClientSecret!!,
        configuration = paymentSheetConfiguration,
        callback = onFlowControllerConfigure,
      )
    } else if (intentConfiguration != null) {
      flowController?.configureWithIntentConfiguration(
        intentConfiguration = intentConfiguration!!,
        configuration = paymentSheetConfiguration,
        callback = onFlowControllerConfigure,
      )
    } else {
      promise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration` is required",
        ),
      )
      return
    }
  }

  private fun clearPresentationResources() {
    presentationTimeout?.cancel()
    presentationTimeout = null
    cancelPendingResult?.invoke()
    cancelPendingResult = null
    keepJsAwake?.stop()
    keepJsAwake = null
    timeout = null
    paymentSheetTimedOut = false
  }

  private fun resolvePaymentResult(map: WritableMap) {
    val request = confirmPromise ?: presentationPromise ?: return
    if (cancelPendingResult != null) return
    val cancel = runWhenActivityAvailable(context) { request.resolve(map) }
    if (request.isPending) {
      cancelPendingResult = cancel
    } else {
      cancel()
    }
  }

  override fun onConfirmCustomPaymentMethod(
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
    CoroutineScope(Dispatchers.Main).launch {
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
        // Clean up the transparent activity
        CustomPaymentMethodActivity.finishCurrent()
      }
    }
  }

  companion object {
    private fun createActivityChangedError(): WritableMap =
      createError(
        PaymentSheetErrorType.Failed.toString(),
        "The host Activity changed or is no longer available. " +
          "Call `initPaymentSheet` again before presenting or confirming.",
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
        if (didFinish.compareAndSet(false, true)) {
          context.removeLifecycleEventListener(this)
        }
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
  promise: Promise,
  flowController: PaymentSheet.FlowController?,
) {
  if (!success) {
    promise.resolve(
      createError(
        PaymentSheetErrorType.Failed.toString(),
        error?.message ?: "Failed to configure payment sheet",
      ),
    )
    return
  }
  flowController?.getPaymentOption()?.let { paymentOption ->
    CoroutineScope(Dispatchers.Default).launch {
      val imageString =
        try {
          convertDrawableToBase64(paymentOption.icon())
        } catch (e: Exception) {
          val result =
            createError(
              PaymentSheetErrorType.Failed.toString(),
              "Failed to process payment option image: ${e.message}",
            )
          promise.resolve(result)
          return@launch
        }

      val option: WritableMap = Arguments.createMap()
      option.putString("label", paymentOption.label)
      option.putString("image", imageString)
      val result = createResult("paymentOption", option)
      promise.resolve(result)
    }
  } ?: run {
    promise.resolve(Arguments.createMap())
  }
}

private const val BITMAP_COMPRESS_QUALITY = 100
