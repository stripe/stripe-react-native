package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow

@OptIn(PaymentMethodMessagingElementPreview::class)
class PaymentMethodMessagingElementView(
  context: Context,
) : StripeAbstractComposeView(context) {
  private sealed interface Event {
    data class Configure(
      val configuration: PaymentMethodMessagingElement.Configuration,
    ) : Event

    data class Appearance(
      val appearance: PaymentMethodMessagingElement.Appearance,
    ) : Event
  }

  var latestElementConfig: PaymentMethodMessagingElement.Configuration? = null

  private val reactContext get() = context as ThemedReactContext
  private val events = Channel<Event>(Channel.UNLIMITED)

  @SuppressLint("RestrictedApi")
  @Composable
  override fun Content() {
    val messagingElement =
      remember {
        PaymentMethodMessagingElement.create(context.applicationContext as Application)
      }
    var appearance by remember { mutableStateOf(PaymentMethodMessagingElement.Appearance()) }

    // collect events: configure, appearance
    LaunchedEffect(Unit) {
      events.consumeAsFlow().collect { ev ->
        when (ev) {
          is Event.Configure -> {
            val loadingPayload = Arguments.createMap()
            loadingPayload.putString("status", "loading")
            requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementConfigureResult(loadingPayload)
            val result =
              messagingElement.configure(
                configuration = ev.configuration,
              )

            val payload = Arguments.createMap()
            when (result) {
              is PaymentMethodMessagingElement.ConfigureResult.Succeeded -> {
                payload.putString("status", "loaded")
              }
              is PaymentMethodMessagingElement.ConfigureResult.NoContent -> {
                payload.putString("status", "no_content")
                reportHeightChange(0f)
              }
              is PaymentMethodMessagingElement.ConfigureResult.Failed -> {
                // send the error back to JS
                val err = result.error
                val msg = err.localizedMessage ?: err.toString()
                // build a RN map
                payload.putString("status", "failed")
                payload.putString("message", msg)
                reportHeightChange(0f)
              }
            }
            requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementConfigureResult(payload)
          }
          is Event.Appearance -> {
            appearance = ev.appearance
          }
        }
      }
    }

    Box {
      MeasureMessagingElement(
        reportHeightChange = { h -> reportHeightChange(h) },
      ) {
        messagingElement.Content(appearance)
      }
    }
  }

  @Composable
  private fun MeasureMessagingElement(
    reportHeightChange: (Float) -> Unit,
    content: @Composable () -> Unit,
  ) {
    val density = LocalDensity.current
    var heightDp by remember { mutableStateOf(1.dp) } // non-zero sentinel

    Box(
      Modifier
        // Post-layout: convert px -> dp, update RN & our dp state
        .onSizeChanged { size ->
          val h = with(density) { size.height.toDp() }
          if (h != heightDp) {
            heightDp = h
            reportHeightChange(h.value) // send dp as Float to RN
          }
        }
        // Custom measure path: force child to its min intrinsic height (in *px*)
        .layout { measurable, constraints ->
          val widthPx = constraints.maxWidth
          val minHpx = measurable.minIntrinsicHeight(widthPx).coerceAtLeast(1)

          // Measure the child with a tight height equal to min intrinsic
          val placeable =
            measurable.measure(
              constraints.copy(
                minHeight = minHpx,
                maxHeight = minHpx,
              ),
            )

          // Our own size: use the child’s measured size
          layout(constraints.maxWidth, placeable.height) {
            placeable.placeRelative(IntOffset.Zero)
          }
        },
    ) {
      content()
    }
  }

  private fun reportHeightChange(height: Float) {
    val params =
      Arguments.createMap().apply {
        putDouble("height", height.toDouble())
      }
    requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementDidUpdateHeight(params)
  }

  // APIs
  fun configure(config: PaymentMethodMessagingElement.Configuration) {
    events.trySend(Event.Configure(config))
  }

  fun appearance(appearance: PaymentMethodMessagingElement.Appearance) {
    events.trySend(Event.Appearance(appearance))
  }

  private fun requireStripeSdkModule() = requireNotNull(reactContext.getNativeModule(StripeSdkModule::class.java))
}
