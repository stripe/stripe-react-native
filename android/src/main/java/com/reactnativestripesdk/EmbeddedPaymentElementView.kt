package com.reactnativestripesdk

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi
import com.stripe.android.paymentelement.rememberEmbeddedPaymentElement
import com.stripe.android.paymentsheet.PaymentSheet
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.launch

@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
class EmbeddedPaymentElementView(
  context: Context
) : AbstractComposeView(context) {
  private sealed interface Event {
    data class Configure(
      val configuration: EmbeddedPaymentElement.Configuration,
      val intentConfiguration: PaymentSheet.IntentConfiguration,
    ) : Event
    data object Confirm : Event
  }

  var latestIntentConfig: PaymentSheet.IntentConfiguration? = null
  var latestElementConfig: EmbeddedPaymentElement.Configuration? = null

  private val reactContext get() = context as ReactContext
  private val events = Channel<Event>(Channel.UNLIMITED)
  private var lastReportedHeight = 0

  private val builder by lazy {
    EmbeddedPaymentElement.Builder(
      createIntentCallback = { _, _ -> error("Not implemented" ) },
      resultCallback       = { result ->
        val map = Arguments.createMap().apply {
        }
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("onFormSheetConfirmComplete", map)
      }
    )
  }

  @Composable
  override fun Content() {
    val embedded = rememberEmbeddedPaymentElement(builder)
    val hostView = LocalView.current             // the ComposeView instance

    // State to track the last emitted height to avoid redundant events if height doesn't change
    var configured by remember { mutableStateOf(false) }

    // collect events: configure, confirm
    LaunchedEffect(Unit) {
      events.consumeAsFlow().collect { ev ->
        when (ev) {
          is Event.Configure -> {
            // call configure and grab the result
            val result = embedded.configure(
              intentConfiguration = ev.intentConfiguration,
              configuration = ev.configuration
            )

            when (result) {
              is EmbeddedPaymentElement.ConfigureResult.Succeeded -> {
                configured = true
              }

              is EmbeddedPaymentElement.ConfigureResult.Failed -> {
                // TODO
              }
            }
          }

          is Event.Confirm -> {
            embedded.confirm()
          }
        }
      }
    }

    LaunchedEffect(configured) {
      if (configured) {
        hostView.requestLayout()
      }
    }

    val scrollState = rememberScrollState()

    Column(
      modifier = Modifier
        .fillMaxWidth()
        .verticalScroll(scrollState)
        .onGloballyPositioned { coordinates ->
          val height = coordinates.size.height
          if (height != lastReportedHeight && height > 0) {
            lastReportedHeight = height
            reportHeightChange(height)
          }
        }
    ) {
      embedded.Content()
    }
  }

  private fun reportHeightChange(height: Int) {
    val params = Arguments.createMap().apply {
      putInt("height", height)
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("embeddedPaymentElementDidUpdateHeight", params)
  }

  // APIs called by props
  fun configure(config: EmbeddedPaymentElement.Configuration,
                intentConfig: PaymentSheet.IntentConfiguration) {
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
}
