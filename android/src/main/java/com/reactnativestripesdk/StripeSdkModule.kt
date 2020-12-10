package com.reactnativestripesdk

import android.app.Activity
import android.content.Intent
import androidx.annotation.IntRange
import com.facebook.react.bridge.*
import com.stripe.android.*
import com.stripe.android.model.*


class StripeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "StripeSdk"
  }

  private var onConfirmPaymentError: Callback? = null
  private var onConfirmPaymentSuccess: Callback? = null
  private var onConfirmSetupIntentError: Callback? = null
  private var onConfirmSetupIntentSuccess: Callback? = null
  private var confirmPromise: Promise? = null
  private var handleNextPaymentActionPromise: Promise? = null
  private var confirmSetupIntentPromise: Promise? = null

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
              handleNextPaymentActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
              onConfirmPaymentSuccess?.invoke(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.RequiresPaymentMethod -> {
              val errorMessage = paymentIntent.lastPaymentError?.message.orEmpty()
              onConfirmPaymentError?.invoke(createError(ConfirmPaymentErrorType.Failed.toString(), errorMessage))
              confirmPromise?.reject(ConfirmPaymentErrorType.Failed.toString(), errorMessage)
              handleNextPaymentActionPromise?.reject(NextPaymentActionErrorType.Failed.toString(), errorMessage)
            }
            StripeIntent.Status.RequiresConfirmation -> {
              handleNextPaymentActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.Canceled -> {
              val errorMessage = paymentIntent.lastPaymentError?.message.orEmpty()
              onConfirmPaymentError?.invoke(createError(ConfirmPaymentErrorType.Canceled.toString(), errorMessage))
              confirmPromise?.reject(ConfirmPaymentErrorType.Canceled.toString(), errorMessage)
              handleNextPaymentActionPromise?.reject(NextPaymentActionErrorType.Canceled.toString(), errorMessage)
            }
            else -> {
              val errorMessage = "unhandled error: ${paymentIntent.status}"
              onConfirmPaymentError?.invoke(createError(ConfirmPaymentErrorType.Unknown.toString(), errorMessage))
              confirmPromise?.reject(ConfirmPaymentErrorType.Unknown.toString(), errorMessage)
              handleNextPaymentActionPromise?.reject(NextPaymentActionErrorType.Unknown.toString(), errorMessage)
            }
          }
        }

        override fun onError(e: Exception) {
          onConfirmPaymentError?.invoke(e.toString())
          confirmPromise?.reject(ConfirmPaymentErrorType.Failed.toString(), e.toString())
          handleNextPaymentActionPromise?.reject(NextPaymentActionErrorType.Failed.toString(), e.toString())
        }
      })
    }
  }

  private lateinit var stripe: Stripe

  init {
    reactContext.addActivityEventListener(mActivityEventListener);
  }

  @ReactMethod
  fun configure3dSecure(params: ReadableMap) {
    val bodyFontSize: Int = params.getInt("bodyFontSize")
    val bodyTextColor: String = params.getString("bodyTextColor") ?: ""
    val headingFontSize: Int = params.getInt("headingFontSize")
    val headingTextColor: String = params.getString("headingTextColor") ?: ""
    val timeout: Int = params.getInt("timeout")

    val uiCustomization = PaymentAuthConfig.Stripe3ds2UiCustomization.Builder()
      .setLabelCustomization(
        PaymentAuthConfig.Stripe3ds2LabelCustomization.Builder()
          .setTextFontSize(bodyFontSize)
          .setTextColor(bodyTextColor)
          .setHeadingTextFontSize(headingFontSize)
          .setHeadingTextColor(headingTextColor)
          .build()
      )
      .build()
    PaymentAuthConfig.init(
      PaymentAuthConfig.Builder()
        .set3ds2Config(
          PaymentAuthConfig.Stripe3ds2Config.Builder()
            .setTimeout(timeout)
            .setUiCustomization(uiCustomization)
            .build()
        )
        .build()
    )
  }

  @ReactMethod
  fun initialise(publishableKey: String, appInfo: ReadableMap, stripeAccountId: String?) {
    val name = getValOr(appInfo, "name", "") as String
    val partnerId = getValOr(appInfo, "partnerId", "")
    val version = getValOr(appInfo, "version", "")
    val url = getValOr(appInfo, "url", "")
    Stripe.appInfo = AppInfo.create(name, version, url, partnerId)
    stripe = Stripe(reactApplicationContext, publishableKey, stripeAccountId)
  }

  @ReactMethod
  fun createPaymentMethod(params: ReadableMap, promise: Promise) {
    val paymentMethodCreateParams = mapToPaymentMethodCreateParams(params)
    stripe.createPaymentMethod(
      paymentMethodCreateParams,
      callback = object : ApiResultCallback<PaymentMethod> {
        override fun onError(e: Exception) {
          confirmPromise?.reject("Failed", e.message)
        }

        override fun onSuccess(result: PaymentMethod) {
          val paymentMethodMap: WritableMap = WritableNativeMap()
          paymentMethodMap.putString("stripeId", result.id)
          promise.resolve(paymentMethodMap)
        }
      })
  }

  @ReactMethod
  fun handleNextPaymentAction(paymentIntentClientSecret: String, promise: Promise) {
    val activity = currentActivity
    if (activity != null) {
      handleNextPaymentActionPromise = promise
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
  fun confirmPaymentMethod(paymentIntentClientSecret: String, params: ReadableMap, promise: Promise) {
    confirmPromise = promise
    val paymentMethodCreateParams = mapToPaymentMethodCreateParams(params)

    val confirmParams = ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(paymentMethodCreateParams, paymentIntentClientSecret)

    val activity = currentActivity
    if (activity != null) {
      stripe.confirmPayment(activity, confirmParams)
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
  fun confirmSetupIntent (setupIntentClientSecret: String, card: ReadableMap, billingDatails: ReadableMap, promise: Promise) {
    confirmSetupIntentPromise = promise
    val billing = mapToBillingDetails(billingDatails)
    val card = mapToCard(card)

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
