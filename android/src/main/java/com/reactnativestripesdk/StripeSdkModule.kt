package com.reactnativestripesdk

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.stripe.android.ApiResultCallback
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

  private val mActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent) {
      stripe.onPaymentResult(requestCode, data, object : ApiResultCallback<PaymentIntentResult> {
        override fun onSuccess(result: PaymentIntentResult) {
          val paymentIntent = result.intent
          val status = paymentIntent.status
          if (status == StripeIntent.Status.Succeeded) {
            onConfirmPaymentSuccess?.invoke(mapFromPaymentIntentResult(paymentIntent))
            confirmPromise?.resolve(mapFromPaymentIntentResult(paymentIntent))
          } else if (status == StripeIntent.Status.RequiresPaymentMethod) {
            onConfirmPaymentError?.invoke(paymentIntent.lastPaymentError?.message.orEmpty())
            confirmPromise?.reject(paymentIntent.lastPaymentError?.message.orEmpty())
          }
        }

        override fun onError(e: Exception) {
          onConfirmPaymentError?.invoke(e.toString())
          confirmPromise?.reject(e.toString())
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
      cardData.getString("cardNumber").orEmpty(),
      cardData.getString("expiryMonth")?.toInt() ?: 0,
      cardData.getString("expiryYear")?.toInt() ?: 0,
      cardData.getString("cvc"),
      if (cardData.hasKey("name")) cardData.getString("name") else null,
      if (cardData.hasKey("postalCode")) Address.Builder().setPostalCode(cardData.getString("postalCode").orEmpty()).build() else null,
      if (cardData.hasKey("currency")) cardData.getString("currency") else null,
      null)

    return PaymentMethodCreateParams.createCard(cardParams)
  }

  @ReactMethod
  fun initialise(publishableKey: String) {
    stripe = Stripe(reactApplicationContext, publishableKey)
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
