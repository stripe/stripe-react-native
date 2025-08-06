package com.reactnativestripesdk

import android.app.Activity
import android.app.Application
import android.content.Context
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
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.graphics.drawable.DrawableCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.PaymentSheetErrorType
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.StripeFragment
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.reactnativestripesdk.utils.mapFromCustomPaymentMethod
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.reactnativestripesdk.utils.parseCustomPaymentMethods
import com.reactnativestripesdk.utils.removeFragment
import com.stripe.android.ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.ConfirmCustomPaymentMethodCallback
import com.stripe.android.paymentelement.CustomPaymentMethodResult
import com.stripe.android.paymentelement.CustomPaymentMethodResultHandler
import com.stripe.android.paymentelement.ExperimentalCustomPaymentMethodsApi
import com.stripe.android.paymentelement.PaymentMethodOptionsSetupFutureUsagePreview
import com.stripe.android.paymentsheet.CreateIntentCallback
import com.stripe.android.paymentsheet.CreateIntentResult
import com.stripe.android.paymentsheet.ExperimentalCustomerSessionApi
import com.stripe.android.paymentsheet.PaymentOptionCallback
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

@OptIn(ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class, ExperimentalCustomPaymentMethodsApi::class)
class PaymentSheetFragment :
  StripeFragment(),
  ConfirmCustomPaymentMethodCallback {
  private lateinit var context: ReactApplicationContext
  private lateinit var initPromise: Promise
  private var paymentSheet: PaymentSheet? = null
  private var flowController: PaymentSheet.FlowController? = null
  private var paymentIntentClientSecret: String? = null
  private var setupIntentClientSecret: String? = null
  private var intentConfiguration: PaymentSheet.IntentConfiguration? = null
  private lateinit var paymentSheetConfiguration: PaymentSheet.Configuration
  private var confirmPromise: Promise? = null
  private var presentPromise: Promise? = null
  private var paymentSheetTimedOut = false
  internal var paymentSheetIntentCreationCallback = CompletableDeferred<ReadableMap>()
  private var keepJsAwake: KeepJsAwakeTask? = null

  @OptIn(ExperimentalCustomPaymentMethodsApi::class)
  override fun prepare() {
    val merchantDisplayName = arguments?.getString("merchantDisplayName").orEmpty()
    if (merchantDisplayName.isEmpty()) {
      initPromise.resolve(
        createError(ErrorType.Failed.toString(), "merchantDisplayName cannot be empty or null."),
      )
      return
    }
    val primaryButtonLabel = arguments?.getString("primaryButtonLabel")
    val googlePayConfig = buildGooglePayConfig(arguments?.getBundle("googlePay"))
    val linkConfig = buildLinkConfig(arguments?.getBundle("link"))
    val allowsDelayedPaymentMethods = arguments?.getBoolean("allowsDelayedPaymentMethods")
    val billingDetailsBundle = arguments?.getBundle("defaultBillingDetails")
    val billingConfigParams = arguments?.getBundle("billingDetailsCollectionConfiguration")
    val paymentMethodOrder = arguments?.getStringArrayList("paymentMethodOrder")
    val allowsRemovalOfLastSavedPaymentMethod =
      arguments?.getBoolean("allowsRemovalOfLastSavedPaymentMethod", true) ?: true
    paymentIntentClientSecret = arguments?.getString("paymentIntentClientSecret").orEmpty()
    setupIntentClientSecret = arguments?.getString("setupIntentClientSecret").orEmpty()
    intentConfiguration =
      try {
        buildIntentConfiguration(arguments?.getBundle("intentConfiguration"))
      } catch (error: PaymentSheetException) {
        initPromise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }
    val appearance =
      try {
        buildPaymentSheetAppearance(arguments?.getBundle("appearance"), context)
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
      arguments?.getBundle("defaultShippingDetails")?.let {
        AddressSheetView.buildAddressDetails(it)
      }

    val paymentOptionCallback =
      PaymentOptionCallback { paymentOption ->
        val result =
          paymentOption?.let {
            val bitmap = getBitmapFromVectorDrawable(context, it.drawableResourceId)
            val imageString = getBase64FromBitmap(bitmap)
            val option: WritableMap = WritableNativeMap()
            option.putString("label", it.label)
            option.putString("image", imageString)
            createResult("paymentOption", option)
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
              resolvePaymentResult(WritableNativeMap())
              // Remove the fragment now, we can be sure it won't be needed again if an intent is
              // successful
              removeFragment(context)
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

        stripeSdkModule?.emitOnConfirmHandlerCallback(params)

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

    val billingDetailsConfig =
      PaymentSheet.BillingDetailsCollectionConfiguration(
        name = mapToCollectionMode(billingConfigParams?.getString("name")),
        phone = mapToCollectionMode(billingConfigParams?.getString("phone")),
        email = mapToCollectionMode(billingConfigParams?.getString("email")),
        address = mapToAddressCollectionMode(billingConfigParams?.getString("address")),
        attachDefaultsToPaymentMethod =
          billingConfigParams?.getBoolean("attachDefaultsToPaymentMethod", false) ?: false,
      )

    var defaultBillingDetails: PaymentSheet.BillingDetails? = null
    if (billingDetailsBundle != null) {
      val addressBundle = billingDetailsBundle.getBundle("address")
      val address =
        PaymentSheet.Address(
          addressBundle?.getString("city"),
          addressBundle?.getString("country"),
          addressBundle?.getString("line1"),
          addressBundle?.getString("line2"),
          addressBundle?.getString("postalCode"),
          addressBundle?.getString("state"),
        )
      defaultBillingDetails =
        PaymentSheet.BillingDetails(
          address,
          billingDetailsBundle.getString("email"),
          billingDetailsBundle.getString("name"),
          billingDetailsBundle.getString("phone"),
        )
    }
    val configurationBuilder =
      PaymentSheet.Configuration
        .Builder(merchantDisplayName)
        .allowsDelayedPaymentMethods(allowsDelayedPaymentMethods ?: false)
        .defaultBillingDetails(defaultBillingDetails)
        .customer(customerConfiguration)
        .googlePay(googlePayConfig)
        .appearance(appearance)
        .shippingDetails(shippingDetails)
        .billingDetailsCollectionConfiguration(billingDetailsConfig)
        .preferredNetworks(
          mapToPreferredNetworks(arguments?.getIntegerArrayList("preferredNetworks")),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .cardBrandAcceptance(mapToCardBrandAcceptance(arguments))
        .customPaymentMethods(parseCustomPaymentMethods(arguments))

    primaryButtonLabel?.let { configurationBuilder.primaryButtonLabel(it) }
    paymentMethodOrder?.let { configurationBuilder.paymentMethodOrder(it) }

    configurationBuilder.paymentMethodLayout(
      mapToPaymentMethodLayout(arguments?.getString("paymentMethodLayout")),
    )

    paymentSheetConfiguration = configurationBuilder.build()

    if (arguments?.getBoolean("customFlow") == true) {
      flowController =
        if (intentConfiguration != null) {
          PaymentSheet.FlowController
            .Builder(
              resultCallback = paymentResultCallback,
              paymentOptionCallback = paymentOptionCallback,
            ).createIntentCallback(createIntentCallback)
            .confirmCustomPaymentMethodCallback(this)
            .build(this)
        } else {
          PaymentSheet.FlowController
            .Builder(
              resultCallback = paymentResultCallback,
              paymentOptionCallback = paymentOptionCallback,
            ).confirmCustomPaymentMethodCallback(this)
            .build(this)
        }
      configureFlowController()
    } else {
      paymentSheet =
        if (intentConfiguration != null) {
          PaymentSheet
            .Builder(paymentResultCallback)
            .createIntentCallback(createIntentCallback)
            .confirmCustomPaymentMethodCallback(this)
            .build(this)
        } else {
          PaymentSheet
            .Builder(paymentResultCallback)
            .confirmCustomPaymentMethodCallback(this)
            .build(this)
        }
      initPromise.resolve(WritableNativeMap())
    }
  }

  fun present(promise: Promise) {
    keepJsAwake = KeepJsAwakeTask(context).apply { start() }
    presentPromise = promise
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
      promise.resolve(createMissingInitError())
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
            val bitmap = getBitmapFromVectorDrawable(context, it.drawableResourceId)
            val imageString = getBase64FromBitmap(bitmap)
            val option: WritableMap = WritableNativeMap()
            option.putString("label", it.label)
            option.putString("image", imageString)
            createResult("paymentOption", option)
          } ?: run { WritableNativeMap() }
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
    presentPromise?.resolve(value)
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
        stripeSdkModule.emitOnCustomPaymentMethodConfirmHandlerCallback(
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
    internal const val TAG = "payment_sheet_launch_fragment"

    internal fun create(
      context: ReactApplicationContext,
      arguments: Bundle,
      initPromise: Promise,
    ): PaymentSheetFragment {
      val instance = PaymentSheetFragment()
      instance.context = context
      instance.initPromise = initPromise
      instance.arguments = arguments
      return instance
    }

    private val mapIntToButtonType =
      mapOf(
        1 to PaymentSheet.GooglePayConfiguration.ButtonType.Buy,
        6 to PaymentSheet.GooglePayConfiguration.ButtonType.Book,
        5 to PaymentSheet.GooglePayConfiguration.ButtonType.Checkout,
        4 to PaymentSheet.GooglePayConfiguration.ButtonType.Donate,
        11 to PaymentSheet.GooglePayConfiguration.ButtonType.Order,
        1000 to PaymentSheet.GooglePayConfiguration.ButtonType.Pay,
        7 to PaymentSheet.GooglePayConfiguration.ButtonType.Subscribe,
        1001 to PaymentSheet.GooglePayConfiguration.ButtonType.Plain,
      )

    internal fun createMissingInitError(): WritableMap =
      createError(
        PaymentSheetErrorType.Failed.toString(),
        "No payment sheet has been initialized yet. You must call `initPaymentSheet` before `presentPaymentSheet`.",
      )

    internal fun buildGooglePayConfig(params: Bundle?): PaymentSheet.GooglePayConfiguration? {
      if (params == null || params.isEmpty) {
        return null
      }

      val countryCode = params.getString("merchantCountryCode").orEmpty()
      val currencyCode = params.getString("currencyCode").orEmpty()
      val testEnv = params.getBoolean("testEnv")
      val amount = params.getString("amount")?.toLongOrNull()
      val label = params.getString("label")
      val buttonType =
        mapIntToButtonType.get(params.getInt("buttonType"))
          ?: PaymentSheet.GooglePayConfiguration.ButtonType.Pay

      return PaymentSheet.GooglePayConfiguration(
        environment =
          if (testEnv) {
            PaymentSheet.GooglePayConfiguration.Environment.Test
          } else {
            PaymentSheet.GooglePayConfiguration.Environment.Production
          },
        countryCode = countryCode,
        currencyCode = currencyCode,
        amount = amount,
        label = label,
        buttonType = buttonType,
      )
    }

    internal fun buildLinkConfig(params: Bundle?): PaymentSheet.LinkConfiguration {
      if (params == null) {
        return PaymentSheet.LinkConfiguration()
      }

      val display = mapStringToLinkDisplay(params.getString("display"))

      return PaymentSheet.LinkConfiguration(
        display = display,
      )
    }

    private fun mapStringToLinkDisplay(value: String?): PaymentSheet.LinkConfiguration.Display =
      when (value) {
        "automatic" -> PaymentSheet.LinkConfiguration.Display.Automatic
        "never" -> PaymentSheet.LinkConfiguration.Display.Never
        else -> PaymentSheet.LinkConfiguration.Display.Automatic
      }

    @Throws(PaymentSheetException::class)
    internal fun buildIntentConfiguration(intentConfigurationParams: Bundle?): PaymentSheet.IntentConfiguration? {
      if (intentConfigurationParams == null) {
        return null
      }
      val modeParams =
        intentConfigurationParams.getBundle("mode")
          ?: throw PaymentSheetException(
            "If `intentConfiguration` is provided, `intentConfiguration.mode` is required",
          )

      return PaymentSheet.IntentConfiguration(
        mode = buildIntentConfigurationMode(modeParams),
        paymentMethodTypes =
          intentConfigurationParams.getStringArrayList("paymentMethodTypes")?.toList()
            ?: emptyList(),
      )
    }

    @OptIn(PaymentMethodOptionsSetupFutureUsagePreview::class)
    private fun buildIntentConfigurationMode(modeParams: Bundle): PaymentSheet.IntentConfiguration.Mode =
      if (modeParams.containsKey("amount")) {
        val currencyCode =
          modeParams.getString("currencyCode")
            ?: throw PaymentSheetException(
              "You must provide a value to intentConfiguration.mode.currencyCode",
            )
        PaymentSheet.IntentConfiguration.Mode.Payment(
          amount = modeParams.getInt("amount").toLong(),
          currency = currencyCode,
          setupFutureUse = mapToSetupFutureUse(modeParams.getString("setupFutureUsage")),
          captureMethod = mapToCaptureMethod(modeParams.getString("captureMethod")),
          paymentMethodOptions = mapToPaymentMethodOptions(modeParams.getBundle("paymentMethodOptions")),
        )
      } else {
        val setupFutureUsage =
          mapToSetupFutureUse(modeParams.getString("setupFutureUsage"))
            ?: throw PaymentSheetException(
              "You must provide a value to intentConfiguration.mode.setupFutureUsage",
            )
        PaymentSheet.IntentConfiguration.Mode.Setup(
          currency = modeParams.getString("currencyCode"),
          setupFutureUse = setupFutureUsage,
        )
      }

    @OptIn(ExperimentalCustomerSessionApi::class)
    @Throws(PaymentSheetException::class)
    internal fun buildCustomerConfiguration(bundle: Bundle?): PaymentSheet.CustomerConfiguration? {
      val customerId = bundle?.getString("customerId").orEmpty()
      val customerEphemeralKeySecret = bundle?.getString("customerEphemeralKeySecret").orEmpty()
      val customerSessionClientSecret = bundle?.getString("customerSessionClientSecret").orEmpty()
      return if (customerSessionClientSecret.isNotEmpty() &&
        customerEphemeralKeySecret.isNotEmpty()
      ) {
        throw PaymentSheetException(
          "`customerEphemeralKeySecret` and `customerSessionClientSecret` cannot both be set",
        )
      } else if (customerId.isNotEmpty() && customerSessionClientSecret.isNotEmpty()) {
        PaymentSheet.CustomerConfiguration.createWithCustomerSession(
          id = customerId,
          clientSecret = customerSessionClientSecret,
        )
      } else if (customerId.isNotEmpty() && customerEphemeralKeySecret.isNotEmpty()) {
        PaymentSheet.CustomerConfiguration(
          id = customerId,
          ephemeralKeySecret = customerEphemeralKeySecret,
        )
      } else {
        null
      }
    }
  }
}

fun getBitmapFromVectorDrawable(
  context: Context?,
  drawableId: Int,
): Bitmap? {
  val drawable = AppCompatResources.getDrawable(context!!, drawableId) ?: return null
  return getBitmapFromDrawable(drawable)
}

fun getBitmapFromDrawable(drawable: Drawable): Bitmap? {
  val drawableCompat = DrawableCompat.wrap(drawable).mutate()
  if (drawableCompat.intrinsicWidth <= 0 || drawableCompat.intrinsicHeight <= 0) {
    return null
  }
  val bitmap =
    Bitmap.createBitmap(
      drawableCompat.intrinsicWidth,
      drawableCompat.intrinsicHeight,
      Bitmap.Config.ARGB_8888,
    )
  bitmap.eraseColor(Color.WHITE)
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

fun mapToCollectionMode(str: String?): PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode =
  when (str) {
    "automatic" -> PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Automatic
    "never" -> PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Never
    "always" -> PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Always
    else -> PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Automatic
  }

fun mapToPaymentMethodLayout(str: String?): PaymentSheet.PaymentMethodLayout =
  when (str) {
    "Horizontal" -> PaymentSheet.PaymentMethodLayout.Horizontal
    "Vertical" -> PaymentSheet.PaymentMethodLayout.Vertical
    else -> PaymentSheet.PaymentMethodLayout.Automatic
  }

fun mapToAddressCollectionMode(str: String?): PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode =
  when (str) {
    "automatic" ->
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic

    "never" -> PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Never
    "full" -> PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Full
    else -> PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic
  }

fun mapToSetupFutureUse(type: String?): PaymentSheet.IntentConfiguration.SetupFutureUse? =
  when (type) {
    "OffSession" -> PaymentSheet.IntentConfiguration.SetupFutureUse.OffSession
    "OnSession" -> PaymentSheet.IntentConfiguration.SetupFutureUse.OnSession
    "None" -> PaymentSheet.IntentConfiguration.SetupFutureUse.None
    else -> null
  }

fun mapToCaptureMethod(type: String?): PaymentSheet.IntentConfiguration.CaptureMethod =
  when (type) {
    "Automatic" -> PaymentSheet.IntentConfiguration.CaptureMethod.Automatic
    "Manual" -> PaymentSheet.IntentConfiguration.CaptureMethod.Manual
    "AutomaticAsync" -> PaymentSheet.IntentConfiguration.CaptureMethod.AutomaticAsync
    else -> PaymentSheet.IntentConfiguration.CaptureMethod.Automatic
  }

@OptIn(PaymentMethodOptionsSetupFutureUsagePreview::class)
fun mapToPaymentMethodOptions(options: Bundle?): PaymentSheet.IntentConfiguration.Mode.Payment.PaymentMethodOptions? {
  val sfuBundle = options?.getBundle("setupFutureUsageValues")
  val paymentMethodToSfuMap = mutableMapOf<PaymentMethod.Type, PaymentSheet.IntentConfiguration.SetupFutureUse>()
  sfuBundle?.keySet()?.forEach { code ->
    val sfuValue = mapToSetupFutureUse(sfuBundle?.getString(code))
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

fun mapToCardBrandAcceptance(params: Bundle?): PaymentSheet.CardBrandAcceptance {
  val cardBrandAcceptanceParams = params?.getBundle("cardBrandAcceptance") ?: return PaymentSheet.CardBrandAcceptance.all()
  val filter = cardBrandAcceptanceParams.getString("filter") ?: return PaymentSheet.CardBrandAcceptance.all()

  return when (filter) {
    "all" -> PaymentSheet.CardBrandAcceptance.all()
    "allowed" -> {
      val brands = cardBrandAcceptanceParams.getStringArrayList("brands") ?: return PaymentSheet.CardBrandAcceptance.all()
      val brandCategories = brands.mapNotNull { mapToCardBrandCategory(it) }
      if (brandCategories.isEmpty()) {
        return PaymentSheet.CardBrandAcceptance.all()
      }
      PaymentSheet.CardBrandAcceptance.allowed(brandCategories)
    }
    "disallowed" -> {
      val brands = cardBrandAcceptanceParams.getStringArrayList("brands") ?: return PaymentSheet.CardBrandAcceptance.all()
      val brandCategories = brands.mapNotNull { mapToCardBrandCategory(it) }
      if (brandCategories.isEmpty()) {
        return PaymentSheet.CardBrandAcceptance.all()
      }
      PaymentSheet.CardBrandAcceptance.disallowed(brandCategories)
    }
    else -> PaymentSheet.CardBrandAcceptance.all()
  }
}

fun mapToCardBrandCategory(brand: String): PaymentSheet.CardBrandAcceptance.BrandCategory? =
  when (brand) {
    "visa" -> PaymentSheet.CardBrandAcceptance.BrandCategory.Visa
    "mastercard" -> PaymentSheet.CardBrandAcceptance.BrandCategory.Mastercard
    "amex" -> PaymentSheet.CardBrandAcceptance.BrandCategory.Amex
    "discover" -> PaymentSheet.CardBrandAcceptance.BrandCategory.Discover
    else -> null
  }
