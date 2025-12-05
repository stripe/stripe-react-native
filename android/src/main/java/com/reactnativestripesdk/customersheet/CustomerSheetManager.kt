package com.reactnativestripesdk.customersheet

import android.app.Activity
import android.app.Application
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.ReactNativeCustomerAdapter
import com.reactnativestripesdk.ReactNativeCustomerSessionProvider
import com.reactnativestripesdk.buildBillingDetails
import com.reactnativestripesdk.buildBillingDetailsCollectionConfiguration
import com.reactnativestripesdk.buildPaymentSheetAppearance
import com.reactnativestripesdk.getBase64FromBitmap
import com.reactnativestripesdk.getBitmapFromDrawable
import com.reactnativestripesdk.mapToCardBrandAcceptance
import com.reactnativestripesdk.utils.CreateTokenErrorType
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.stripe.android.ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.customersheet.CustomerAdapter
import com.stripe.android.customersheet.CustomerEphemeralKey
import com.stripe.android.customersheet.CustomerSheet
import com.stripe.android.customersheet.CustomerSheetResult
import com.stripe.android.customersheet.PaymentOptionSelection
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@OptIn(ReactNativeSdkInternal::class, ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi::class)
class CustomerSheetManager(
  context: ReactApplicationContext,
  private var arguments: ReadableMap,
  private var customerAdapterOverrides: ReadableMap,
  private var initPromise: Promise,
) : StripeUIManager(context) {
  private var customerSheet: CustomerSheet? = null
  internal var customerAdapter: ReactNativeCustomerAdapter? = null
  internal var customerSessionProvider: ReactNativeCustomerSessionProvider? = null
  private var presentPromise: Promise? = null
  private var keepJsAwake: KeepJsAwakeTask? = null

  override fun onCreate() {
    val headerTextForSelectionScreen = arguments.getString("headerTextForSelectionScreen")
    val merchantDisplayName = arguments.getString("merchantDisplayName")
    val googlePayEnabled = arguments.getBooleanOr("googlePayEnabled", false)
    val billingDetailsMap = arguments.getMap("defaultBillingDetails")
    val billingConfigParams = arguments.getMap("billingDetailsCollectionConfiguration")
    val allowsRemovalOfLastSavedPaymentMethod =
      arguments.getBooleanOr("allowsRemovalOfLastSavedPaymentMethod", true)
    val paymentMethodOrder = arguments.getStringList("paymentMethodOrder")

    val appearance =
      try {
        buildPaymentSheetAppearance(arguments.getMap("appearance"), context)
      } catch (error: PaymentSheetAppearanceException) {
        initPromise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    val configuration =
      CustomerSheet.Configuration
        .builder(merchantDisplayName ?: "")
        .appearance(appearance)
        .googlePayEnabled(googlePayEnabled)
        .headerTextForSelectionScreen(headerTextForSelectionScreen)
        .preferredNetworks(
          mapToPreferredNetworks(arguments.getIntegerList("preferredNetworks")),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .cardBrandAcceptance(mapToCardBrandAcceptance(arguments))

    paymentMethodOrder?.let { configuration.paymentMethodOrder(it) }
    billingDetailsMap?.let {
      configuration.defaultBillingDetails(createDefaultBillingDetails(billingDetailsMap))
    }
    billingConfigParams?.let {
      configuration.billingDetailsCollectionConfiguration(
        createBillingDetailsCollectionConfiguration(billingConfigParams),
      )
    }

    val activity = getCurrentActivityOrResolveWithError(initPromise) ?: return

    val customerEphemeralKeySecret = arguments.getString("customerEphemeralKeySecret")
    val intentConfiguration = createIntentConfiguration(arguments.getMap("intentConfiguration"))
    if (customerEphemeralKeySecret == null && intentConfiguration == null) {
      initPromise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "You must provide either `customerEphemeralKeySecret` or `intentConfiguration`",
        ),
      )
      return
    } else if (customerEphemeralKeySecret == null) {
      val customerSessionProvider =
        ReactNativeCustomerSessionProvider(
          context = context,
          intentConfiguration = intentConfiguration!!,
        ).also { this.customerSessionProvider = it }

      customerSheet =
        CustomerSheet.create(
          activity = activity,
          customerSessionProvider = customerSessionProvider,
          callback = ::handleResult,
        )
    } else if (intentConfiguration == null) {
      val customerId = arguments.getString("customerId")
      if (customerId == null) {
        initPromise.resolve(
          createError(
            ErrorType.Failed.toString(),
            "When using `customerEphemeralKeySecret` you must provide a value for `customerId`",
          ),
        )
        return
      }
      val setupIntentClientSecret = arguments.getString("setupIntentClientSecret")
      val customerAdapter =
        createCustomerAdapter(
          context,
          customerId,
          customerEphemeralKeySecret,
          setupIntentClientSecret,
          customerAdapterOverrides,
        ).also { this.customerAdapter = it }

      customerSheet =
        CustomerSheet.create(
          activity = activity,
          customerAdapter = customerAdapter,
          callback = ::handleResult,
        )
    } else {
      initPromise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "You must provide either `customerEphemeralKeySecret` or `intentConfiguration`, but not both",
        ),
      )
    }

    customerSheet?.configure(configuration.build())

    initPromise.resolve(Arguments.createMap())
  }

  private fun handleResult(result: CustomerSheetResult) {
    var promiseResult = Arguments.createMap()
    when (result) {
      is CustomerSheetResult.Failed -> {
        resolvePresentPromise(createError(ErrorType.Failed.toString(), result.exception))
      }

      is CustomerSheetResult.Selected -> {
        promiseResult = createPaymentOptionResult(result.selection)
      }

      is CustomerSheetResult.Canceled -> {
        promiseResult = createPaymentOptionResult(result.selection)
        promiseResult.putMap(
          "error",
          Arguments.createMap().also { it.putString("code", ErrorType.Canceled.toString()) },
        )
      }
    }
    resolvePresentPromise(promiseResult)
  }

  override fun onPresent() {
    keepJsAwake = context.let { KeepJsAwakeTask(it).apply { start() } }
    presentPromise = promise
    val timeout = timeout
    if (timeout != null) {
      presentWithTimeout(timeout)
    } else {
      customerSheet?.present() ?: run { resolvePresentPromise(createMissingInitError()) }
    }
  }

  private fun presentWithTimeout(timeout: Long) {
    var activities: MutableList<Activity> = mutableListOf()
    val activityLifecycleCallbacks =
      object : Application.ActivityLifecycleCallbacks {
        override fun onActivityCreated(
          activity: Activity,
          savedInstanceState: Bundle?,
        ) {
          activities.add(activity)
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
          activities = mutableListOf()
          context.currentActivity?.application?.unregisterActivityLifecycleCallbacks(this)
        }
      }

    Handler(Looper.getMainLooper())
      .postDelayed(
        {
          // customerSheetActivity?.finish()
          for (a in activities) {
            a.finish()
          }
        },
        timeout,
      )

    context
      .currentActivity
      ?.application
      ?.registerActivityLifecycleCallbacks(activityLifecycleCallbacks)

    customerSheet?.present() ?: run { resolvePresentPromise(createMissingInitError()) }
  }

  internal fun retrievePaymentOptionSelection(promise: Promise) {
    CoroutineScope(Dispatchers.IO).launch {
      runCatching {
        val result =
          customerSheet?.retrievePaymentOptionSelection()
            ?: run {
              promise.resolve(createMissingInitError())
              return@launch
            }
        var promiseResult = Arguments.createMap()
        when (result) {
          is CustomerSheetResult.Failed -> {
            promise.resolve(createError(ErrorType.Failed.toString(), result.exception))
          }

          is CustomerSheetResult.Selected -> {
            promiseResult = createPaymentOptionResult(result.selection)
          }

          is CustomerSheetResult.Canceled -> {
            promiseResult = createPaymentOptionResult(result.selection)
            promiseResult.putMap(
              "error",
              Arguments.createMap().also {
                it.putString("code", ErrorType.Canceled.toString())
              },
            )
          }
        }
        promise.resolve(promiseResult)
      }.onFailure {
        promise.resolve(createError(CreateTokenErrorType.Failed.toString(), it.message))
      }
    }
  }

  private fun resolvePresentPromise(value: Any?) {
    val presentPromise =
      presentPromise
        ?: run {
          Log.e("StripeReactNative", "No promise found for CustomerSheet.present")
          return
        }
    keepJsAwake?.stop()
    keepJsAwake = null
    presentPromise.resolve(value)
  }

  companion object {
    internal fun createMissingInitError(): WritableMap =
      createError(ErrorType.Failed.toString(), "No customer sheet has been initialized yet.")

    internal fun createDefaultBillingDetails(map: ReadableMap): PaymentSheet.BillingDetails =
      buildBillingDetails(map) ?: PaymentSheet.BillingDetails()

    internal fun createBillingDetailsCollectionConfiguration(map: ReadableMap): PaymentSheet.BillingDetailsCollectionConfiguration =
      buildBillingDetailsCollectionConfiguration(map)

    internal fun createCustomerAdapter(
      context: ReactApplicationContext,
      customerId: String,
      customerEphemeralKeySecret: String,
      setupIntentClientSecret: String?,
      customerAdapterOverrideParams: ReadableMap?,
    ): ReactNativeCustomerAdapter {
      val ephemeralKeyProvider = {
        CustomerAdapter.Result.success(
          CustomerEphemeralKey.create(
            customerId = customerId,
            ephemeralKey = customerEphemeralKeySecret,
          ),
        )
      }
      val customerAdapter =
        if (setupIntentClientSecret != null) {
          CustomerAdapter.create(
            context,
            customerEphemeralKeyProvider = ephemeralKeyProvider,
            setupIntentClientSecretProvider = {
              CustomerAdapter.Result.success(
                setupIntentClientSecret,
              )
            },
          )
        } else {
          CustomerAdapter.create(
            context,
            customerEphemeralKeyProvider = ephemeralKeyProvider,
            setupIntentClientSecretProvider = null,
          )
        }

      return ReactNativeCustomerAdapter(
        context = context,
        adapter = customerAdapter,
        overridesFetchPaymentMethods =
          customerAdapterOverrideParams.getBooleanOr("fetchPaymentMethods", false),
        overridesAttachPaymentMethod =
          customerAdapterOverrideParams.getBooleanOr("attachPaymentMethod", false),
        overridesDetachPaymentMethod =
          customerAdapterOverrideParams.getBooleanOr("detachPaymentMethod", false),
        overridesSetSelectedPaymentOption =
          customerAdapterOverrideParams.getBooleanOr("setSelectedPaymentOption", false),
        overridesFetchSelectedPaymentOption =
          customerAdapterOverrideParams.getBooleanOr("fetchSelectedPaymentOption", false),
        overridesSetupIntentClientSecretForCustomerAttach =
          customerAdapterOverrideParams.getBooleanOr("setupIntentClientSecretForCustomerAttach", false),
      )
    }

    internal fun createPaymentOptionResult(selection: PaymentOptionSelection?): WritableMap {
      var paymentOptionResult = Arguments.createMap()

      when (selection) {
        is PaymentOptionSelection.GooglePay -> {
          paymentOptionResult =
            buildResult(selection.paymentOption.label, selection.paymentOption.icon(), null)
        }

        is PaymentOptionSelection.PaymentMethod -> {
          paymentOptionResult =
            buildResult(
              selection.paymentOption.label,
              selection.paymentOption.icon(),
              selection.paymentMethod,
            )
        }

        null -> {}
      }

      return paymentOptionResult
    }

    internal fun createIntentConfiguration(intentConfigurationBundle: ReadableMap?): CustomerSheet.IntentConfiguration? =
      intentConfigurationBundle?.let { bundle ->
        val onBehalfOf = bundle.getString("onBehalfOf")
        CustomerSheet.IntentConfiguration
          .Builder()
          .paymentMethodTypes(bundle.getStringList("paymentMethodTypes") ?: emptyList())
          .apply {
            if (onBehalfOf != null) {
              this.onBehalfOf(onBehalfOf)
            }
          }.build()
      }

    private fun buildResult(
      label: String,
      drawable: Drawable,
      paymentMethod: PaymentMethod?,
    ): WritableMap {
      val result = Arguments.createMap()
      val paymentOption =
        Arguments.createMap().also {
          it.putString("label", label)
          it.putString("image", getBase64FromBitmap(getBitmapFromDrawable(drawable)))
        }
      result.putMap("paymentOption", paymentOption)
      if (paymentMethod != null) {
        result.putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
      }
      return result
    }
  }
}
