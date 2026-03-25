package com.reactnativestripesdk

import android.annotation.SuppressLint
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.ErrorType
import com.reactnativestripesdk.utils.KeepJsAwakeTask
import com.reactnativestripesdk.utils.PaymentSheetErrorType
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.createError
import com.reactnativestripesdk.utils.createResult
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentOptionResultCallback
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@OptIn(ReactNativeSdkInternal::class)
class FlowControllerManager(
  context: ReactApplicationContext,
  arguments: ReadableMap,
  initPromise: Promise,
) : BasePaymentSheetManager(context, arguments, initPromise) {
  private var flowController: PaymentSheet.FlowController? = null
  private var confirmPromise: Promise? = null

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
    val paymentOptionCallback = buildPaymentOptionCallback()

    flowController =
      if (intentConfiguration != null) {
        val builder =
          PaymentSheet.FlowController
            .Builder(
              resultCallback = paymentResultCallback,
              paymentOptionResultCallback = paymentOptionCallback,
            )
        if (useConfirmationTokenCallback) {
          builder.createIntentCallback(buildCreateConfirmationTokenCallback())
        } else {
          builder.createIntentCallback(buildCreateIntentCallback())
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

    configure(arguments, initPromise)
  }

  override fun onConfigure(promise: Promise) {
    configureFlowController(promise)
  }

  override fun onPresent() {
    keepJsAwake = KeepJsAwakeTask(context).apply { start() }
    if (flowController != null) {
      flowController?.presentPaymentOptions()
    } else {
      promise?.resolve(createMissingInitError())
    }
  }

  override fun confirmPayment(promise: Promise) {
    this.confirmPromise = promise
    flowController?.confirm()
  }

  override fun onDestroy() {
    flowController = null
    super.onDestroy()
  }

  override fun resolvePaymentResult(map: WritableMap) {
    confirmPromise?.let {
      it.resolve(map)
      confirmPromise = null
    } ?: run { resolvePresentPromise(map) }
  }

  private fun buildPaymentOptionCallback(): PaymentOptionResultCallback =
    PaymentOptionResultCallback { paymentOptionResult ->
      paymentOptionResult.paymentOption?.let { paymentOption ->
        // Convert drawable to bitmap asynchronously to avoid shared state issues
        CoroutineScope(Dispatchers.Default).launch {
          val imageString =
            try {
              convertDrawableToBase64(paymentOption.icon())
            } catch (e: Exception) {
              val result =
                createError(
                  PaymentSheetErrorType.Failed.toString(),
                  "Failed to process payment option image: ${e.message}",
                )
              resolvePresentPromise(result)
              return@launch
            }

          val option: WritableMap = Arguments.createMap()
          option.putString("label", paymentOption.label)
          option.putString("image", imageString)
          val additionalFields: Map<String, Any> = mapOf("didCancel" to paymentOptionResult.didCancel)
          val result = createResult("paymentOption", option, additionalFields)
          resolvePresentPromise(result)
        }
      } ?: run {
        val result =
          if (paymentSheetTimedOut) {
            paymentSheetTimedOut = false
            createError(PaymentSheetErrorType.Timeout.toString(), "The payment has timed out")
          } else {
            createError(
              PaymentSheetErrorType.Canceled.toString(),
              "The payment option selection flow has been canceled",
            )
          }
        resolvePresentPromise(result)
      }
    }

  private fun configureFlowController(promise: Promise) {
    val onFlowControllerConfigure =
      PaymentSheet.FlowController.ConfigCallback { success, error ->
        handleFlowControllerConfigured(success, error, promise, flowController)
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
      promise.resolve(
        createError(
          ErrorType.Failed.toString(),
          "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration` is required",
        ),
      )
      return
    }
  }
}
