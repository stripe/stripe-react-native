package com.reactnativestripesdk

import android.app.Activity
import android.content.Intent
import android.os.AsyncTask
import androidx.activity.ComponentActivity
import com.facebook.react.bridge.*
import com.stripe.android.*
import com.stripe.android.model.*
import com.stripe.android.paymentsheet.PaymentOptionCallback
import com.stripe.android.paymentsheet.PaymentResult
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResultCallback
import com.stripe.android.paymentsheet.model.PaymentOption

class StripeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "StripeSdk"
  }

  private lateinit var flowController: PaymentSheet.FlowController
  private lateinit var paymentSheet: PaymentSheet

  private lateinit var publishableKey: String
  private lateinit var paymentSheetConfiguration: PaymentSheet.Configuration

  private var onConfirmPaymentError: Callback? = null
  private var onConfirmPaymentSuccess: Callback? = null
  private var onConfirmSetupIntentError: Callback? = null
  private var onConfirmSetupIntentSuccess: Callback? = null
  private var confirmPromise: Promise? = null
  private var handleCardActionPromise: Promise? = null
  private var confirmSetupIntentPromise: Promise? = null
  private var presentPaymentOptionsPromise: Promise? = null
  private var paymentSheetConfirmPaymentPromise: Promise? = null
  private var presentPaymentSheetPromise: Promise? = null

  private val mActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent) {
      stripe.onSetupResult(requestCode, data, object : ApiResultCallback<SetupIntentResult> {
        override fun onSuccess(result: SetupIntentResult) {
          val setupIntent = result.intent
          when (setupIntent.status) {
            StripeIntent.Status.Succeeded -> {
              onConfirmSetupIntentSuccess?.invoke(mapFromSetupIntentResult(setupIntent))
              confirmSetupIntentPromise?.resolve(mapFromSetupIntentResult(setupIntent))
            }
            StripeIntent.Status.Canceled -> {
              val errorMessage = setupIntent.lastSetupError?.message.orEmpty()
              onConfirmSetupIntentError?.invoke(createError(ConfirmSetupIntentErrorType.Canceled.toString(), errorMessage))
              confirmSetupIntentPromise?.reject(ConfirmSetupIntentErrorType.Canceled.toString(), errorMessage)
            }
            else -> {
              val errorMessage = "unhandled error: ${setupIntent.status}"
              onConfirmSetupIntentError?.invoke(createError(ConfirmSetupIntentErrorType.Unknown.toString(), errorMessage))
              confirmSetupIntentPromise?.reject(ConfirmSetupIntentErrorType.Unknown.toString(), errorMessage)
            }
          }
        }

        override fun onError(e: Exception) {
          onConfirmSetupIntentError?.invoke(createError(ConfirmSetupIntentErrorType.Failed.toString(), e.message.orEmpty()))
          confirmSetupIntentPromise?.reject(ConfirmSetupIntentErrorType.Failed.toString(), e.message.orEmpty())
        }
      })

      stripe.onPaymentResult(requestCode, data, object : ApiResultCallback<PaymentIntentResult> {
        override fun onSuccess(result: PaymentIntentResult) {
          val paymentIntent = result.intent

          when (paymentIntent.status) {
            StripeIntent.Status.Succeeded -> {
              confirmPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
              handleCardActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
              onConfirmPaymentSuccess?.invoke(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.RequiresPaymentMethod -> {
              val errorMessage = paymentIntent.lastPaymentError?.message.orEmpty()
              onConfirmPaymentError?.invoke(createError(ConfirmPaymentErrorType.Failed.toString(), errorMessage))
              confirmPromise?.reject(ConfirmPaymentErrorType.Failed.toString(), errorMessage)
              handleCardActionPromise?.reject(NextPaymentActionErrorType.Failed.toString(), errorMessage)
            }
            StripeIntent.Status.RequiresConfirmation -> {
              handleCardActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.Canceled -> {
              val errorMessage = paymentIntent.lastPaymentError?.message.orEmpty()
              onConfirmPaymentError?.invoke(createError(ConfirmPaymentErrorType.Canceled.toString(), errorMessage))
              confirmPromise?.reject(ConfirmPaymentErrorType.Canceled.toString(), errorMessage)
              handleCardActionPromise?.reject(NextPaymentActionErrorType.Canceled.toString(), errorMessage)
            }
            else -> {
              val errorMessage = "unhandled error: ${paymentIntent.status}"
              onConfirmPaymentError?.invoke(createError(ConfirmPaymentErrorType.Unknown.toString(), errorMessage))
              confirmPromise?.reject(ConfirmPaymentErrorType.Unknown.toString(), errorMessage)
              handleCardActionPromise?.reject(NextPaymentActionErrorType.Unknown.toString(), errorMessage)
            }
          }
        }

        override fun onError(e: Exception) {
          onConfirmPaymentError?.invoke(e.toString())
          confirmPromise?.reject(ConfirmPaymentErrorType.Failed.toString(), e.toString())
          handleCardActionPromise?.reject(NextPaymentActionErrorType.Failed.toString(), e.toString())
        }
      })
    }
  }

  private lateinit var stripe: Stripe

  init {
    reactContext.addActivityEventListener(mActivityEventListener);
  }

  private fun configure3dSecure(params: ReadableMap) {
    val stripe3dsConfigBuilder = PaymentAuthConfig.Stripe3ds2Config.Builder()

    if (params.hasKey("timeout")) stripe3dsConfigBuilder.setTimeout(params.getInt("timeout"))

    val uiCustomization = mapToUICustomization(params)

    PaymentAuthConfig.init(
      PaymentAuthConfig.Builder()
        .set3ds2Config(
          stripe3dsConfigBuilder
            .setUiCustomization(uiCustomization)
            .build()
        )
        .build()
    )
  }

  @ReactMethod
  fun initialise(publishableKey: String, appInfo: ReadableMap, stripeAccountId: String?, params: ReadableMap?) {
    if (params != null) {
      configure3dSecure(params)
    }

    this.publishableKey = publishableKey

    val name = getValOr(appInfo, "name", "") as String
    val partnerId = getValOr(appInfo, "partnerId", "")
    val version = getValOr(appInfo, "version", "")

    val url = getValOr(appInfo, "url", "")
    Stripe.appInfo = AppInfo.create(name, version, url, partnerId)
    stripe = Stripe(reactApplicationContext, publishableKey, stripeAccountId)
  }

  @ReactMethod
  fun setupPaymentSheet(params: ReadableMap, promise: Promise) {
    val customFlow = getBooleanOrNull(params, "customFlow")

    PaymentConfiguration.init(reactApplicationContext, publishableKey)
    val activity = currentActivity as ComponentActivity

    val paymentResultCallback = paymentResultCallback()
    val paymentOptionCallback = paymentOptionCallback()

    val customerId = getValOr(params, "customerId", null) as String
    val customerEphemeralKeySecret = getValOr(params, "customerEphemeralKeySecret", null) as String
    val paymentIntentClientSecret = getValOr(params, "paymentIntentClientSecret", null) as String
    val merchantDisplayName = getValOr(params, "merchantDisplayName", null) as String

    this.paymentSheetConfiguration = PaymentSheet.Configuration(
      merchantDisplayName = merchantDisplayName,
      customer = PaymentSheet.CustomerConfiguration(
        id = customerId,
        ephemeralKeySecret = customerEphemeralKeySecret
      )
    )

    if (customFlow != null) {
      flowController = PaymentSheet.FlowController.create(
        activity,
        paymentOptionCallback,
        paymentResultCallback
      )

      configureFlowController(
        paymentIntentClientSecret,
        promise
      )
    } else {
      paymentSheet = PaymentSheet(activity, paymentResultCallback)
      promise.resolve(null)
    }
  }

  private fun paymentResultCallback(): PaymentSheetResultCallback {
    return object : PaymentSheetResultCallback {
      override fun onPaymentResult(paymentResult: PaymentResult) {
        when (paymentResult) {
          is PaymentResult.Canceled -> {
            paymentSheetConfirmPaymentPromise?.reject(PaymentSheetErrorType.Canceled.toString(), "")
            presentPaymentSheetPromise?.reject(PaymentSheetErrorType.Canceled.toString(), "")
          }
          is PaymentResult.Failed -> {
            paymentSheetConfirmPaymentPromise?.reject(PaymentSheetErrorType.Failed.toString(), "")
            presentPaymentSheetPromise?.reject(PaymentSheetErrorType.Failed.toString(), "")
          }
          is PaymentResult.Completed -> {
            paymentSheetConfirmPaymentPromise?.resolve(null)
            presentPaymentSheetPromise?.resolve(null)
          }
        }
      }
    }
  }

  private fun paymentOptionCallback(): PaymentOptionCallback {
    return object : PaymentOptionCallback {
      override fun onPaymentOption(paymentOption: PaymentOption?) {
        if (paymentOption != null) {
          val option: WritableMap = WritableNativeMap()
          option.putString("label", paymentOption?.label)
          option.putInt("image", paymentOption?.drawableResourceId)
          presentPaymentOptionsPromise?.resolve(option)
        } else {
          presentPaymentOptionsPromise?.resolve(null)
        }
      }
    }
  }

  private fun configureFlowController(
    paymentIntentClientSecret: String,
    promise: Promise
  ) {
    val onFlowControllerConfigure = object : PaymentSheet.FlowController.ConfigCallback {
      override fun onConfigured(success: Boolean, error: Throwable?) {
        val paymentOption = flowController.getPaymentOption()
        val option: WritableMap = WritableNativeMap()

        if (paymentOption != null) {
          option.putString("label", paymentOption?.label)
          option.putInt("image", paymentOption?.drawableResourceId)

          promise.resolve(option)
        } else {
          promise.resolve(null)
        }
      }
    }

    flowController.configure(
      paymentIntentClientSecret = paymentIntentClientSecret,
      configuration = this.paymentSheetConfiguration,
      callback = onFlowControllerConfigure
    )
  }

  @ReactMethod
  fun presentPaymentSheet(promise: Promise) {
    this.presentPaymentSheetPromise = promise
    paymentSheet.present(
      "clientSecret",
      this.paymentSheetConfiguration
    )
  }

  @ReactMethod
  fun presentPaymentOptions(promise: Promise) {
    this.presentPaymentOptionsPromise = promise
    flowController.presentPaymentOptions()
  }

  @ReactMethod
  fun paymentSheetConfirmPayment(promise: Promise) {
    this.paymentSheetConfirmPaymentPromise = promise
    flowController.confirmPayment()
  }

  @ReactMethod
  fun createPaymentMethod(data: ReadableMap, options: ReadableMap, promise: Promise) {
    val cardDetails = data.getMap("cardDetails") as ReadableMap
    val paymentMethodCreateParams = mapToPaymentMethodCreateParams(cardDetails)
    stripe.createPaymentMethod(
      paymentMethodCreateParams,
      callback = object : ApiResultCallback<PaymentMethod> {
        override fun onError(e: Exception) {
          confirmPromise?.reject("Failed", e.message)
        }

        override fun onSuccess(result: PaymentMethod) {
          val paymentMethodMap: WritableMap = mapFromPaymentMethod(result)
          promise.resolve(paymentMethodMap)
        }
      })
  }

  @ReactMethod
  fun handleCardAction(paymentIntentClientSecret: String, promise: Promise) {
    val activity = currentActivity
    if (activity != null) {
      handleCardActionPromise = promise
      stripe.handleNextActionForPayment(activity, paymentIntentClientSecret)
    }
  }

  @ReactMethod
  fun registerConfirmPaymentCallbacks(successCallback: Callback, errorCallback: Callback) {
    onConfirmPaymentError = errorCallback
    onConfirmPaymentSuccess = successCallback
  }

  @ReactMethod
  fun unregisterConfirmPaymentCallbacks() {
    onConfirmPaymentError = null
    onConfirmPaymentSuccess = null
  }

  @ReactMethod
  fun confirmPaymentMethod(paymentIntentClientSecret: String, data: ReadableMap, options: ReadableMap, promise: Promise) {
    confirmPromise = promise
    val paymentMethodId = getValOr(data, "paymentMethodId", null)
    val confirmParams = if (paymentMethodId != null) {
      ConfirmPaymentIntentParams.createWithPaymentMethodId(paymentMethodId, paymentIntentClientSecret)
    } else {
      val cardDetails = getMapOrNull(data, "cardDetails")?.let { it } ?: run {
        val message = "To confirm the payment you must provide card details or paymentMethodId"
        onConfirmSetupIntentError?.invoke(createError(ConfirmPaymentErrorType.Failed.toString(), message))
        promise.reject(ConfirmPaymentErrorType.Failed.toString(), message)
        return
      }

      val paymentMethodCreateParams = mapToPaymentMethodCreateParams(cardDetails)
      ConfirmPaymentIntentParams
        .createWithPaymentMethodCreateParams(paymentMethodCreateParams, paymentIntentClientSecret)
    }

    val activity = currentActivity
    if (activity != null) {
      stripe.confirmPayment(activity, confirmParams)
    }
  }

  @ReactMethod
  fun retrievePaymentIntent(clientSecret: String, promise: Promise) {
    AsyncTask.execute {
      val paymentIntent = stripe.retrievePaymentIntentSynchronous(clientSecret)
      paymentIntent?.let {
        promise.resolve(mapFromPaymentIntentResult(it))
      } ?: run {
        promise.reject(RetrievePaymentIntentErrorType.Unknown.toString(), "Retrieving payment intent failed")
      }
    }
  }

  @ReactMethod
  fun registerConfirmSetupIntentCallbacks(successCallback: Callback, errorCallback: Callback) {
    onConfirmSetupIntentError = errorCallback
    onConfirmSetupIntentSuccess = successCallback
  }

  @ReactMethod
  fun unregisterConfirmSetupIntentCallbacks() {
    onConfirmSetupIntentError = null
    onConfirmSetupIntentSuccess = null
  }

  @ReactMethod
  fun confirmSetupIntent(setupIntentClientSecret: String, data: ReadableMap, options: ReadableMap, promise: Promise) {
    confirmSetupIntentPromise = promise
    var billing: PaymentMethod.BillingDetails? = null

    (getMapOrNull(data, "billingDetails"))?.let {
      billing = mapToBillingDetails(it)
    }

    val card = mapToCard(data.getMap("cardDetails") as ReadableMap)

    val paymentMethodParams = PaymentMethodCreateParams
      .create(card, billing, null)

    val confirmParams = ConfirmSetupIntentParams
      .create(paymentMethodParams, setupIntentClientSecret)

    val activity = currentActivity
    if (activity != null) {
      stripe.confirmSetupIntent(activity, confirmParams)
    }
  }
}

private fun PaymentSheet.FlowController.configure(paymentIntentClientSecret: String, configuration: PaymentSheet.Configuration, onFlowControllerConfigure: PaymentSheet.FlowController.ConfigCallback) {

}
