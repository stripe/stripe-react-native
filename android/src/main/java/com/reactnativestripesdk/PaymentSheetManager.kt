package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import androidx.core.graphics.createBitmap
import androidx.core.graphics.drawable.DrawableCompat
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
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.ConfirmCustomPaymentMethodCallback
import com.stripe.android.paymentelement.CreateIntentWithConfirmationTokenCallback
import com.stripe.android.paymentelement.CustomPaymentMethodResult
import com.stripe.android.paymentelement.CustomPaymentMethodResultHandler
import com.stripe.android.paymentelement.ExperimentalCustomPaymentMethodsApi
import com.stripe.android.paymentelement.PaymentMethodOptionsSetupFutureUsagePreview
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
import java.io.ByteArrayOutputStream
import kotlin.Exception

@OptIn(
  ReactNativeSdkInternal::class,
  ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class,
  ExperimentalCustomPaymentMethodsApi::class,
)
class PaymentSheetManager(
  context: ReactApplicationContext,
  private val arguments: ReadableMap,
  private val initPromise: Promise,
) : StripeUIManager(context),
  ConfirmCustomPaymentMethodCallback {
  private var paymentSheet: PaymentSheet? = null
  private var flowController: PaymentSheet.FlowController? = null
  private var paymentIntentClientSecret: String? = null
  private var setupIntentClientSecret: String? = null
  private var intentConfiguration: PaymentSheet.IntentConfiguration? = null
  private lateinit var paymentSheetConfiguration: PaymentSheet.Configuration
  private var confirmPromise: Promise? = null
  private var paymentSheetTimedOut = false
  internal var paymentSheetIntentCreationCallback = CompletableDeferred<ReadableMap>()
  internal var paymentSheetConfirmationTokenCreationCallback = CompletableDeferred<ReadableMap>()
  private var keepJsAwake: KeepJsAwakeTask? = null

  @SuppressLint("RestrictedApi")
  @OptIn(ExperimentalCustomPaymentMethodsApi::class)
  override fun onCreate() {
    val activity = getCurrentActivityOrResolveWithError(initPromise) ?: return
    val merchantDisplayName = arguments.getString("merchantDisplayName").orEmpty()
    if (merchantDisplayName.isEmpty()) {
      initPromise.resolve(
        createError(ErrorType.Failed.toString(), "merchantDisplayName cannot be empty or null."),
      )
      return
    }
    val primaryButtonLabel = arguments.getString("primaryButtonLabel")
    val googlePayConfig = buildGooglePayConfig(arguments.getMap("googlePay"))
    val linkConfig = buildLinkConfig(arguments.getMap("link"))
    val allowsDelayedPaymentMethods = arguments.getBooleanOr("allowsDelayedPaymentMethods", false)
    val billingDetailsMap = arguments.getMap("defaultBillingDetails")
    val billingConfigParams = arguments.getMap("billingDetailsCollectionConfiguration")
    val paymentMethodOrder = arguments.getStringList("paymentMethodOrder")
    val allowsRemovalOfLastSavedPaymentMethod =
      arguments.getBooleanOr("allowsRemovalOfLastSavedPaymentMethod", true)
    paymentIntentClientSecret = arguments.getString("paymentIntentClientSecret").orEmpty()
    setupIntentClientSecret = arguments.getString("setupIntentClientSecret").orEmpty()
    intentConfiguration =
      try {
        buildIntentConfiguration(arguments.getMap("intentConfiguration"))
      } catch (error: PaymentSheetException) {
        initPromise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    // Determine which callback type to use based on what's provided
    val intentConfigMap = arguments.getMap("intentConfiguration")
    val useConfirmationTokenCallback = intentConfigMap?.hasKey("confirmationTokenConfirmHandler") == true
    val appearance =
      try {
        buildPaymentSheetAppearance(arguments.getMap("appearance"), context)
      } catch (error: PaymentSheetAppearanceException) {
        initPromise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    val customerConfiguration =
      try {
        buildCustomerConfiguration(arguments)
      } catch (error: PaymentSheetException) {
        initPromise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    val shippingDetails =
      arguments.getMap("defaultShippingDetails")?.let {
        AddressSheetView.buildAddressDetails(it)
      }

    val paymentOptionCallback =
      PaymentOptionResultCallback { paymentOptionResult ->
        val result =
          paymentOptionResult.paymentOption?.let {
            val bitmap = getBitmapFromDrawable(it.icon())
            val imageString = getBase64FromBitmap(bitmap)
            val option: WritableMap = Arguments.createMap()
            option.putString("label", it.label)
            option.putString("image", imageString)
            val additionalFields: Map<String, Any> = mapOf("didCancel" to paymentOptionResult.didCancel)
            createResult("paymentOption", option, additionalFields)
          }
            ?: run {
              if (paymentSheetTimedOut) {
                paymentSheetTimedOut = false
                createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out")
              } else {
                createError(
                  PaymentSheetErrorType.Canceled.toString(),
                  "The payment option selection flow has been canceled",
                )
              }
            }
        resolvePresentPromise(result)
      }

    val paymentResultCallback =
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
              paymentSheet = null
              flowController = null
            }
          }
        }
      }

    val createIntentCallback =
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

    val createConfirmationTokenCallback =
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
          mapToPreferredNetworks(arguments.getIntegerList("preferredNetworks")),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .cardBrandAcceptance(mapToCardBrandAcceptance(arguments))
        .customPaymentMethods(parseCustomPaymentMethods(arguments.getMap("customPaymentMethodConfiguration")))

    primaryButtonLabel?.let { configurationBuilder.primaryButtonLabel(it) }
    paymentMethodOrder?.let { configurationBuilder.paymentMethodOrder(it) }

    configurationBuilder.paymentMethodLayout(
      mapToPaymentMethodLayout(arguments.getString("paymentMethodLayout")),
    )

    paymentSheetConfiguration = configurationBuilder.build()

    if (arguments.getBooleanOr("customFlow", false)) {
      flowController =
        if (intentConfiguration != null) {
          val builder =
            PaymentSheet.FlowController
              .Builder(
                resultCallback = paymentResultCallback,
                paymentOptionResultCallback = paymentOptionCallback,
              )
          if (useConfirmationTokenCallback) {
            builder.createIntentCallback(createConfirmationTokenCallback)
          } else {
            builder.createIntentCallback(createIntentCallback)
          }
          builder
            .confirmCustomPaymentMethodCallback(this)
            .build(activity)
        } else {
          PaymentSheet.FlowController
            .Builder(
              resultCallback = paymentResultCallback,
              paymentOptionResultCallback = paymentOptionCallback,
            ).confirmCustomPaymentMethodCallback(this)
            .build(activity)
        }
      configureFlowController()
    } else {
      paymentSheet =
        if (intentConfiguration != null) {
          val builder = PaymentSheet.Builder(paymentResultCallback)
          if (useConfirmationTokenCallback) {
            builder.createIntentCallback(createConfirmationTokenCallback)
          } else {
            builder.createIntentCallback(createIntentCallback)
          }
          @SuppressLint("RestrictedApi")
          builder
            .confirmCustomPaymentMethodCallback(this)
            .build(activity, signal)
        } else {
          @SuppressLint("RestrictedApi")
          PaymentSheet
            .Builder(paymentResultCallback)
            .confirmCustomPaymentMethodCallback(this)
            .build(activity, signal)
        }
      initPromise.resolve(Arguments.createMap())
    }
  }

  override fun onPresent() {
    keepJsAwake = KeepJsAwakeTask(context).apply { start() }
    if (paymentSheet != null) {
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
    } else if (flowController != null) {
      flowController?.presentPaymentOptions()
    } else {
      promise?.resolve(createMissingInitError())
    }
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

  fun confirmPayment(promise: Promise) {
    this.confirmPromise = promise
    flowController?.confirm()
  }

  private fun configureFlowController() {
    val onFlowControllerConfigure =
      PaymentSheet.FlowController.ConfigCallback { _, _ ->
        val result =
          flowController?.getPaymentOption()?.let {
            val bitmap = getBitmapFromDrawable(it.icon())
            val imageString = getBase64FromBitmap(bitmap)
            val option: WritableMap = Arguments.createMap()
            option.putString("label", it.label)
            option.putString("image", imageString)
            createResult("paymentOption", option)
          } ?: run { Arguments.createMap() }
        initPromise.resolve(result)
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
      initPromise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration` is required",
        ),
      )
      return
    }
  }

  private fun resolvePresentPromise(value: Any?) {
    keepJsAwake?.stop()
    promise?.resolve(value)
  }

  private fun resolvePaymentResult(map: WritableMap) {
    confirmPromise?.let {
      it.resolve(map)
      confirmPromise = null
    } ?: run { resolvePresentPromise(map) }
  }

  @OptIn(ExperimentalCustomPaymentMethodsApi::class)
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

fun getBitmapFromDrawable(drawable: Drawable): Bitmap? {
  val drawableCompat = DrawableCompat.wrap(drawable).mutate()
  if (drawableCompat.intrinsicWidth <= 0 || drawableCompat.intrinsicHeight <= 0) {
    return null
  }
  val bitmap =
    createBitmap(drawableCompat.intrinsicWidth, drawableCompat.intrinsicHeight)
  bitmap.eraseColor(Color.TRANSPARENT)
  val canvas = Canvas(bitmap)
  drawable.setBounds(0, 0, canvas.width, canvas.height)
  drawable.draw(canvas)
  return bitmap
}

fun getBase64FromBitmap(bitmap: Bitmap?): String? {
  if (bitmap == null) {
    return null
  }
  val stream = ByteArrayOutputStream()
  bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
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
internal fun mapToPaymentMethodOptions(options: ReadableMap?): PaymentSheet.IntentConfiguration.Mode.Payment.PaymentMethodOptions? {
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
