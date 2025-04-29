package com.reactnativestripesdk

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.AbstractComposeView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.reactnativestripesdk.utils.mapFromPaymentMethod
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi
import com.stripe.android.paymentelement.rememberEmbeddedPaymentElement
import com.stripe.android.paymentsheet.CreateIntentResult
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow
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
        val stripeSdkModule =
          try {
            requireStripeSdkModule()
          } catch (ex: IllegalArgumentException) {
            return@Builder CreateIntentResult.Failure(
              cause =
                Exception(
                  "Tried to call confirmHandler, but no callback was found. Please file an issue: https://github.com/stripe/stripe-react-native/issues",
                ),
              displayMessage = "An unexpected error occurred",
            )
          }
        val params =
          Arguments.createMap().apply {
            putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
            putBoolean("shouldSavePaymentMethod", shouldSavePaymentMethod)
          }

        stripeSdkModule.emitOnConfirmHandlerCallback(params)

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
        requireStripeSdkModule().emitEmbeddedPaymentElementFormSheetConfirmComplete(map)
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
                requireStripeSdkModule().emitEmbeddedPaymentElementLoadingFailed(payload)
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
            putMap("paymentOption", optMap)
          }
        requireStripeSdkModule().emitEmbeddedPaymentElementDidUpdatePaymentOption(payload)
      }
    }

    embedded.Content()
  }

  private fun reportHeightChange(height: Int) {
    val params =
      Arguments.createMap().apply {
        putInt("height", height)
      }
    requireStripeSdkModule().emitEmbeddedPaymentElementDidUpdateHeight(params)
  }

  // APIs
  fun configure(
    config: EmbeddedPaymentElement.Configuration,
    intentConfig: PaymentSheet.IntentConfiguration,
  ) {
    events.trySend(Event.Configure(config, intentConfig))
  }

  fun confirm() {
    events.trySend(Event.Confirm)
  }

  fun clearPaymentOption() {
    events.trySend(Event.ClearPaymentOption)
  }

  private fun requireStripeSdkModule() = requireNotNull(reactContext.getNativeModule(StripeSdkModule::class.java))
}
