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
          val status = paymentIntent.status

          when (paymentIntent.status) {
            StripeIntent.Status.Succeeded -> {
              onConfirmPaymentSuccess?.invoke(mapFromPaymentIntentResult(paymentIntent))
              confirmPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
              handleNextPaymentActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
            }
            StripeIntent.Status.RequiresPaymentMethod -> {
              onConfirmPaymentError?.invoke(paymentIntent.lastPaymentError?.message.orEmpty())
              confirmPromise?.reject(paymentIntent.lastPaymentError?.message.orEmpty())
              handleNextPaymentActionPromise?.reject(paymentIntent.lastPaymentError?.message.orEmpty())
            }
            StripeIntent.Status.RequiresConfirmation -> {
              handleNextPaymentActionPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
            }
            else -> {
              onConfirmPaymentError?.invoke( "unhandled status: ${paymentIntent.status}")
              confirmPromise?.reject( "unhandled status: ${paymentIntent.status}")
              handleNextPaymentActionPromise?.reject( "unhandled status: ${paymentIntent.status}")
            }
          }
        }

        override fun onError(e: Exception) {
          onConfirmPaymentError?.invoke(e.toString())
          confirmPromise?.reject(e.toString())
          handleNextPaymentActionPromise?.reject(e.toString())
        }
      })
    }
  }

  private lateinit var stripe: Stripe

  init {
    reactContext.addActivityEventListener(mActivityEventListener);
  }

  private fun mapFromPaymentIntentResult(paymentIntent: PaymentIntent): WritableMap {
    val map: WritableMap = WritableNativeMap()
    map.putString("id", paymentIntent.id)
    map.putString("currency", paymentIntent.currency)
    map.putString("status", paymentIntent.status.toString())
    map.putString("description", paymentIntent.description)
    map.putString("receiptEmail", paymentIntent.receiptEmail)
    if(paymentIntent.amount != null) {
      map.putDouble("amount", paymentIntent.amount!!.toDouble())
    }
    if(paymentIntent.created != null) {
      map.putInt("created", paymentIntent.created.toInt())
    }

    return map
  }

  private fun mapToPaymentMethodCreateParams(cardData: ReadableMap): PaymentMethodCreateParams {
    val cardParams = CardParams(
      cardData.getString("number").orEmpty(),
      cardData.getInt("expiryMonth"),
      cardData.getInt("expiryYear"),
      cardData.getString("cvc"),
      if (cardData.hasKey("name")) cardData.getString("name") else null,
      if (cardData.hasKey("postalCode")) Address.Builder().setPostalCode(cardData.getString("postalCode").orEmpty()).build() else null,
      if (cardData.hasKey("currency")) cardData.getString("currency") else null,
      null)

    return PaymentMethodCreateParams.createCard(cardParams)
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
          confirmPromise?.reject("Error: $e")
        }

        override fun onSuccess(result: PaymentMethod) {
          val paymentMethodMap: WritableMap = WritableNativeMap()
          paymentMethodMap.putString("stripeId", result.id)
          promise.resolve(paymentMethodMap)
        }
      })
  }

  @ReactMethod
  fun handleNextPaymentAction(paymentIntentClientSecret: String, promise: Promise){
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
