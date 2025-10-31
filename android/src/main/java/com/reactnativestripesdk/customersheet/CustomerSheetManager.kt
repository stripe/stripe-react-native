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
import com.facebook.react.bridge.WritableNativeMap
import com.reactnativestripesdk.ReactNativeCustomerAdapter
import com.reactnativestripesdk.buildPaymentSheetAppearance
import com.reactnativestripesdk.getBase64FromBitmap
import com.reactnativestripesdk.getBitmapFromDrawable
import com.reactnativestripesdk.getIntegerArrayList
import com.reactnativestripesdk.getStringArrayList
import com.reactnativestripesdk.mapToAddressCollectionMode
import com.reactnativestripesdk.mapToCardBrandAcceptance
import com.reactnativestripesdk.mapToCollectionMode
import com.reactnativestripesdk.utils.CreateTokenErrorType
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.StripeUIManager
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.getBooleanOr
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
  private var presentPromise: Promise? = null
  private var keepJsAwake: KeepJsAwakeTask? = null

  override fun onCreate() {
    val headerTextForSelectionScreen = arguments.getString("headerTextForSelectionScreen")
    val merchantDisplayName = arguments.getString("merchantDisplayName")
    val googlePayEnabled = arguments.getBooleanOr("googlePayEnabled", false)
    val billingDetailsBundle = arguments.getMap("defaultBillingDetails")
    val billingConfigParams = arguments.getMap("billingDetailsCollectionConfiguration")
    val setupIntentClientSecret = arguments.getString("setupIntentClientSecret")
    val customerId = arguments.getString("customerId")
    val customerEphemeralKeySecret = arguments.getString("customerEphemeralKeySecret")
    val allowsRemovalOfLastSavedPaymentMethod =
      arguments.getBooleanOr("allowsRemovalOfLastSavedPaymentMethod", true)
    val paymentMethodOrder = arguments.getStringArrayList("paymentMethodOrder")
    if (customerId == null) {
      initPromise.resolve(
        createError(ErrorType.Failed.toString(), "You must provide a value for `customerId`"),
      )
      return
    }
    if (customerEphemeralKeySecret == null) {
      initPromise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "You must provide a value for `customerEphemeralKeySecret`",
        ),
      )
      return
    }

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
          mapToPreferredNetworks(arguments.getIntegerArrayList("preferredNetworks")),
        ).allowsRemovalOfLastSavedPaymentMethod(allowsRemovalOfLastSavedPaymentMethod)
        .cardBrandAcceptance(mapToCardBrandAcceptance(arguments))

    paymentMethodOrder?.let { configuration.paymentMethodOrder(it) }
    billingDetailsBundle?.let {
      configuration.defaultBillingDetails(createDefaultBillingDetails(billingDetailsBundle))
    }
    billingConfigParams?.let {
      configuration.billingDetailsCollectionConfiguration(
        createBillingDetailsCollectionConfiguration(billingConfigParams),
      )
    }

    val customerAdapter =
      createCustomerAdapter(
        context,
        customerId,
        customerEphemeralKeySecret,
        setupIntentClientSecret,
        customerAdapterOverrides,
      ).also { this.customerAdapter = it }

    val activity = getCurrentActivityOrResolveWithError(initPromise) ?: return

    customerSheet =
      CustomerSheet.create(
        activity = activity,
        customerAdapter = customerAdapter,
        callback = ::handleResult,
      )

    customerSheet?.configure(configuration.build())

    initPromise.resolve(WritableNativeMap())
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

    internal fun createDefaultBillingDetails(bundle: ReadableMap): PaymentSheet.BillingDetails {
      val addressBundle = bundle.getMap("address")
      val address =
        PaymentSheet.Address(
          addressBundle?.getString("city"),
          addressBundle?.getString("country"),
          addressBundle?.getString("line1"),
          addressBundle?.getString("line2"),
          addressBundle?.getString("postalCode"),
          addressBundle?.getString("state"),
        )
      return PaymentSheet.BillingDetails(
        address,
        bundle.getString("email"),
        bundle.getString("name"),
        bundle.getString("phone"),
      )
    }

    internal fun createBillingDetailsCollectionConfiguration(bundle: ReadableMap): PaymentSheet.BillingDetailsCollectionConfiguration =
      PaymentSheet.BillingDetailsCollectionConfiguration(
        name = mapToCollectionMode(bundle.getString("name")),
        phone = mapToCollectionMode(bundle.getString("phone")),
        email = mapToCollectionMode(bundle.getString("email")),
        address = mapToAddressCollectionMode(bundle.getString("address")),
        attachDefaultsToPaymentMethod = bundle.getBooleanOr("attachDefaultsToPaymentMethod", false),
      )

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
          customerAdapterOverrideParams?.getBooleanOr("fetchPaymentMethods", false) ?: false,
        overridesAttachPaymentMethod =
          customerAdapterOverrideParams?.getBooleanOr("attachPaymentMethod", false) ?: false,
        overridesDetachPaymentMethod =
          customerAdapterOverrideParams?.getBooleanOr("detachPaymentMethod", false) ?: false,
        overridesSetSelectedPaymentOption =
          customerAdapterOverrideParams?.getBooleanOr("setSelectedPaymentOption", false) ?: false,
        overridesFetchSelectedPaymentOption =
          customerAdapterOverrideParams?.getBooleanOr("fetchSelectedPaymentOption", false) ?: false,
        overridesSetupIntentClientSecretForCustomerAttach =
          customerAdapterOverrideParams?.getBooleanOr("setupIntentClientSecretForCustomerAttach", false)
            ?: false,
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
