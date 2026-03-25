package com.reactnativestripesdk

import android.annotation.SuppressLint
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.createError
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentSheet

@OptIn(ReactNativeSdkInternal::class)
class PaymentSheetManager(
  context: ReactApplicationContext,
  arguments: ReadableMap,
  initPromise: Promise,
) : BasePaymentSheetManager(context, arguments, initPromise) {
  private var paymentSheet: PaymentSheet? = null

  @SuppressLint("RestrictedApi")
  override fun onCreate() {
    val activity = getCurrentActivityOrResolveWithError(initPromise) ?: return
    val merchantDisplayName = arguments.getString("merchantDisplayName").orEmpty()
    if (merchantDisplayName.isEmpty()) {
      initPromise.resolve(
        createError(ErrorType.Failed.toString(), "merchantDisplayName cannot be empty or null."),
      )
      return
    }
    paymentIntentClientSecret = arguments.getString("paymentIntentClientSecret").orEmpty()
    setupIntentClientSecret = arguments.getString("setupIntentClientSecret").orEmpty()
    intentConfiguration =
      try {
        buildIntentConfiguration(arguments.getMap("intentConfiguration"))
      } catch (error: PaymentSheetException) {
        initPromise.resolve(createError(ErrorType.Failed.toString(), error))
        return
      }

    val paymentResultCallback = buildPaymentResultCallback()

    paymentSheet =
      if (intentConfiguration != null) {
        val builder = PaymentSheet.Builder(paymentResultCallback)
        if (useConfirmationTokenCallback) {
          builder.createIntentCallback(buildCreateConfirmationTokenCallback())
        } else {
          builder.createIntentCallback(buildCreateIntentCallback())
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

    configure(arguments, initPromise)
  }

  override fun onConfigure(promise: Promise) {
    promise.resolve(Arguments.createMap())
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
    } else {
      promise?.resolve(createMissingInitError())
    }
  }

  override fun onDestroy() {
    paymentSheet = null
    super.onDestroy()
  }
}
