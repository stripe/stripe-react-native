package com.reactnativestripesdk

import android.app.Activity
import android.content.Intent
import androidx.annotation.IntRange
import com.facebook.react.bridge.*
import com.stripe.android.ApiResultCallback
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.PaymentIntentResult
import com.stripe.android.Stripe
import com.stripe.android.model.*


class StripeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "StripeSdk"
  }

  private var onConfirmPaymentError: Callback? = null
  private var onConfirmPaymentSuccess: Callback? = null
  private var confirmPromise: Promise? = null
  private var handleNextPaymentActionPromise: Promise? = null

  private val mActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent) {
      stripe.onPaymentResult(requestCode, data, object : ApiResultCallback<PaymentIntentResult> {
        override fun onSuccess(result: PaymentIntentResult) {
          val paymentIntent = result.intent

          when (paymentIntent.status) {
            StripeIntent.Status.Succeeded -> {
              onConfirmPaymentSuccess?.invoke(mapFromPaymentIntentResult(paymentIntent))
              confirmPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
              handleNextPaymentActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.RequiresPaymentMethod -> {
              onConfirmPaymentError?.invoke(createError(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Failed), paymentIntent.lastPaymentError?.message.orEmpty()))
              confirmPromise?.reject(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Failed), paymentIntent.lastPaymentError?.message.orEmpty())
              handleNextPaymentActionPromise?.reject(mapNextPaymentActionErrorType(NextPaymentActionErrorType.Failed), paymentIntent.lastPaymentError?.message.orEmpty())
            }
            StripeIntent.Status.RequiresConfirmation -> {
              handleNextPaymentActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.Canceled -> {
              onConfirmPaymentError?.invoke(createError(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Canceled), paymentIntent.lastPaymentError?.message.orEmpty()))
              confirmPromise?.reject(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Canceled), paymentIntent.lastPaymentError?.message.orEmpty())
              handleNextPaymentActionPromise?.reject(mapNextPaymentActionErrorType(NextPaymentActionErrorType.Canceled), paymentIntent.lastPaymentError?.message.orEmpty())
            }
            else -> {
              onConfirmPaymentError?.invoke(createError(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Unknown), "unhandled error: ${paymentIntent.status}"))
              confirmPromise?.reject(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Unknown), "unhandled error: ${paymentIntent.status}")
              handleNextPaymentActionPromise?.reject(mapNextPaymentActionErrorType(NextPaymentActionErrorType.Unknown), "unhandled error: ${paymentIntent.status}")
            }
          }
        }

        override fun onError(e: Exception) {
          onConfirmPaymentError?.invoke(e.toString())
          confirmPromise?.reject(mapConfirmPaymentErrorType(ConfirmPaymentErrorType.Unknown), e.toString())
          handleNextPaymentActionPromise?.reject(mapNextPaymentActionErrorType(NextPaymentActionErrorType.Unknown), e.toString())
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
  fun initialise(publishableKey: String) {
    stripe = Stripe(reactApplicationContext, publishableKey)
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
}
