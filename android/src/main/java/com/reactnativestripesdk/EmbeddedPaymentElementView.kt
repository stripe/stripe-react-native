package com.reactnativestripesdk

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.AbstractComposeView
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi
import com.stripe.android.paymentelement.rememberEmbeddedPaymentElement
import com.stripe.android.paymentsheet.CreateIntentResult
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.launch
import toWritableMap

@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
class EmbeddedPaymentElementView(
  context: Context,
) : AbstractComposeView(context) {
  private sealed interface Event {
    data class Configure(
      val configuration: EmbeddedPaymentElement.Configuration,
      val intentConfiguration: PaymentSheet.IntentConfiguration,
    ) : Event

    data object Confirm : Event

    data object ClearPaymentOption : Event
  }

  var latestIntentConfig: PaymentSheet.IntentConfiguration? = null
  var latestElementConfig: EmbeddedPaymentElement.Configuration? = null

  private val reactContext get() = context as ReactContext
  private val events = Channel<Event>(Channel.UNLIMITED)

  private val builder by lazy {
    EmbeddedPaymentElement.Builder(
      createIntentCallback = { paymentMethod, shouldSavePaymentMethod ->
        val stripeSdkModule: StripeSdkModule? = reactContext.getNativeModule(StripeSdkModule::class.java)
        if (stripeSdkModule == null || stripeSdkModule.eventListenerCount == 0) {
          CreateIntentResult.Failure(
            cause =
              Exception(
                "Tried to call confirmHandler, but no callback was found. Please file an issue: https://github.com/stripe/stripe-react-native/issues",
              ),
            displayMessage = "An unexpected error occurred",
          )
        } else {
          val params =
            Arguments.createMap().apply {
              putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
              putBoolean("shouldSavePaymentMethod", shouldSavePaymentMethod)
            }

          stripeSdkModule.sendEvent(reactContext, "onConfirmHandlerCallback", params)

          val resultFromJavascript = stripeSdkModule.embeddedIntentCreationCallback.await()
          // reset the completable
          stripeSdkModule.embeddedIntentCreationCallback = CompletableDeferred()

          resultFromJavascript.getString("clientSecret")?.let {
            CreateIntentResult.Success(clientSecret = it)
          } ?: run {
            val errorMap = resultFromJavascript.getMap("error")
            CreateIntentResult.Failure(
              cause = Exception(errorMap?.getString("message")),
              displayMessage = errorMap?.getString("localizedMessage"),
            )
          }
        }
      },
      resultCallback = { result ->
        val map =
          Arguments.createMap().apply {
            when (result) {
              is EmbeddedPaymentElement.Result.Completed -> {
                putString("status", "completed")
              }
              is EmbeddedPaymentElement.Result.Canceled -> {
                putString("status", "canceled")
              }
              is EmbeddedPaymentElement.Result.Failed -> {
                putString("status", "failed")
                putString("error", result.error.message ?: "Unknown error")
              }
            }
          }
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("embeddedPaymentElementFormSheetConfirmComplete", map)
      },
    )
  }

  @Composable
  override fun Content() {
    val embedded = rememberEmbeddedPaymentElement(builder)

    // collect events: configure, confirm, clear
    LaunchedEffect(Unit) {
      events.consumeAsFlow().collect { ev ->
        when (ev) {
          is Event.Configure -> {
            // call configure and grab the result
            val result =
              embedded.configure(
                intentConfiguration = ev.intentConfiguration,
                configuration = ev.configuration,
              )

            when (result) {
              is EmbeddedPaymentElement.ConfigureResult.Succeeded -> {
                reportHeightChange(450)
              }
              is EmbeddedPaymentElement.ConfigureResult.Failed -> {
                // send the error back to JS
                val err = result.error
                val msg = err.localizedMessage ?: err.toString()
                // build a RN map
                val payload =
                  Arguments.createMap().apply {
                    putString("message", msg)
                  }
                reactContext
                  .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("embeddedPaymentElementLoadingFailed", payload)
              }
            }
          }

          is Event.Confirm -> {
            embedded.confirm()
          }
          is Event.ClearPaymentOption -> {
            embedded.clearPaymentOption()
          }
        }
      }
    }

    LaunchedEffect(embedded) {
      embedded.paymentOption.collect { opt ->
        val optMap = opt?.toWritableMap()
        val payload =
          Arguments.createMap().apply {
            // TODO: image?
            putMap("paymentOption", optMap)
          }

        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("embeddedPaymentElementDidUpdatePaymentOption", payload)
      }
    }

    embedded.Content()
  }

  private fun reportHeightChange(height: Int) {
    val params =
      Arguments.createMap().apply {
        putInt("height", height)
      }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("embeddedPaymentElementDidUpdateHeight", params)
  }

  // APIs
  fun configure(
    config: EmbeddedPaymentElement.Configuration,
    intentConfig: PaymentSheet.IntentConfiguration,
  ) {
    findViewTreeLifecycleOwner()?.lifecycleScope?.launch {
      events.send(Event.Configure(config, intentConfig))
    }
    events.trySend(Event.Configure(config, intentConfig))
  }

  fun confirm() {
    findViewTreeLifecycleOwner()?.lifecycleScope?.launch {
      events.send(Event.Confirm)
    }
  }

  fun clearPaymentOption() {
    findViewTreeLifecycleOwner()?.lifecycleScope?.launch {
      events.send(Event.ClearPaymentOption)
    }
  }
}
