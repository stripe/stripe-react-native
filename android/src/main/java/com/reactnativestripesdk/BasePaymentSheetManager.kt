package com.reactnativestripesdk

import android.app.Activity
import android.app.Application
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
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
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.ConfirmCustomPaymentMethodCallback
import com.stripe.android.paymentelement.CreateIntentWithConfirmationTokenCallback
import com.stripe.android.paymentelement.CustomPaymentMethodResult
import com.stripe.android.paymentelement.CustomPaymentMethodResultHandler
import com.stripe.android.paymentsheet.CardFundingFilteringPrivatePreview
import com.stripe.android.paymentsheet.CreateIntentCallback
import com.stripe.android.paymentsheet.CreateIntentResult
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(
  ReactNativeSdkInternal::class,
  ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class,
  CardFundingFilteringPrivatePreview::class,
)
abstract class BasePaymentSheetManager(
  context: ReactApplicationContext,
  protected val arguments: ReadableMap,
  protected val initPromise: Promise,
) : StripeUIManager(context),
  ConfirmCustomPaymentMethodCallback {
  protected var paymentIntentClientSecret: String? = null
  protected var setupIntentClientSecret: String? = null
  protected var intentConfiguration: PaymentSheet.IntentConfiguration? = null
  protected lateinit var paymentSheetConfiguration: PaymentSheet.Configuration
  protected var paymentSheetTimedOut = false
  internal var paymentSheetIntentCreationCallback = CompletableDeferred<ReadableMap>()
  internal var paymentSheetConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()
  internal var keepJsAwake: KeepJsAwakeTask? = null

  protected val useConfirmationTokenCallback: Boolean by lazy {
    arguments.getMap("intentConfiguration")?.hasKey("confirmationTokenConfirmHandler") == true
  }

  protected fun buildPaymentResultCallback(): PaymentSheetResultCallback =
    PaymentSheetResultCallback { paymentResult ->
      if (paymentSheetTimedOut) {
        paymentSheetTimedOut = false
        resolvePaymentResult(
          createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out"),
        )
      } else {
        when (paymentResult) {
          is PaymentSheetResult.Canceled -> {
            resolvePaymentResult(
              createError(
                PaymentSheetErrorType.Canceled.toString(),
                "The payment flow has been canceled",
              ),
            )
          }

          is PaymentSheetResult.Failed -> {
            resolvePaymentResult(
              createError(PaymentSheetErrorType.Failed.toString(), paymentResult.error),
            )
          }

          is PaymentSheetResult.Completed -> {
            resolvePaymentResult(Arguments.createMap())
          }
        }
      }
    }

  protected fun buildCreateIntentCallback(): CreateIntentCallback =
    CreateIntentCallback { paymentMethod, shouldSavePaymentMethod ->
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

  protected fun buildCreateConfirmationTokenCallback(): CreateIntentWithConfirmationTokenCallback =
    CreateIntentWithConfirmationTokenCallback { confirmationToken ->
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

  fun configure(
    args: ReadableMap,
    promise: Promise,
  ) {
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
    paymentIntentClientSecret = args.getString("paymentIntentClientSecret").orEmpty()
    setupIntentClientSecret = args.getString("setupIntentClientSecret").orEmpty()
    intentConfiguration =
      try {
        buildIntentConfiguration(args.getMap("intentConfiguration"))
      } catch (error: PaymentSheetException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    val appearance =
      try {
        buildPaymentSheetAppearance(args.getMap("appearance"), context)
      } catch (error: PaymentSheetAppearanceException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    val customerConfiguration =
      try {
        buildCustomerConfiguration(args)
      } catch (error: PaymentSheetException) {
        promise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

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

    paymentSheetConfiguration = configurationBuilder.build()
    onConfigure(promise)
  }

  protected abstract fun onConfigure(promise: Promise)

  open fun confirmPayment(promise: Promise) {
    promise.resolve(
      createError(
        PaymentSheetErrorType.Failed.toString(),
        "confirmPayment is only supported for custom flow (FlowController).",
      ),
    )
  }

  fun presentWithTimeout(
    timeout: Long,
    promise: Promise,
  ) {
    var paymentSheetActivity: Activity? = null

    val activityLifecycleCallbacks =
      object : Application.ActivityLifecycleCallbacks {
        override fun onActivityCreated(
          activity: Activity,
          savedInstanceState: Bundle?,
        ) {
          paymentSheetActivity = activity
        }

        override fun onActivityStarted(activity: Activity) {}

        override fun onActivityResumed(activity: Activity) {}

        override fun onActivityPaused(activity: Activity) {}

        override fun onActivityStopped(activity: Activity) {}

        override fun onActivitySaveInstanceState(
          activity: Activity,
          outState: Bundle,
        ) {
        }

        override fun onActivityDestroyed(activity: Activity) {
          paymentSheetActivity = null
          context.currentActivity?.application?.unregisterActivityLifecycleCallbacks(this)
        }
      }

    Handler(Looper.getMainLooper())
      .postDelayed(
        {
          paymentSheetActivity?.let {
            it.finish()
            paymentSheetTimedOut = true
          }
        },
        timeout,
      )

    context.currentActivity
      ?.application
      ?.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)

    this.present(promise)
  }

  protected fun resolvePresentPromise(value: Any?) {
    keepJsAwake?.stop()
    promise?.resolve(value)
  }

  protected open fun resolvePaymentResult(map: WritableMap) {
    resolvePresentPromise(map)
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
        delay(100)

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
    internal fun createMissingInitError(): WritableMap =
      createError(
        PaymentSheetErrorType.Failed.toString(),
        "No payment sheet has been initialized yet. You must call `initPaymentSheet` before `presentPaymentSheet`.",
      )
  }
}
