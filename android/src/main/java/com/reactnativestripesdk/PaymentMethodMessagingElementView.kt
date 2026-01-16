package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.min
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.stripe.android.paymentelement.ExperimentalCustomPaymentMethodsApi
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow

@OptIn(ExperimentalCustomPaymentMethodsApi::class, PaymentMethodMessagingElementPreview::class)
class PaymentMethodMessagingElementView(
  context: Context,
) : StripeAbstractComposeView(context) {
  private sealed interface Event {
    data class Configure(
      val configuration: PaymentMethodMessagingElement.Configuration,
    ) : Event
  }

  var latestElementConfig: PaymentMethodMessagingElement.Configuration? = null

  private val reactContext get() = context as ThemedReactContext
  private val events = Channel<Event>(Channel.UNLIMITED)

  @SuppressLint("RestrictedApi")
  @Composable
  override fun Content() {
    val messagingElement = PaymentMethodMessagingElement.create(context.applicationContext as Application)

    // collect events: configure
    LaunchedEffect(Unit) {
      events.consumeAsFlow().collect { ev ->
        when (ev) {
          is Event.Configure -> {
            // call configure and grab the result
            val result =
              messagingElement.configure(
                configuration = ev.configuration,
              )

            println("YEET configure result $result")

            when (result) {
              is PaymentMethodMessagingElement.ConfigureResult.Succeeded -> {
                reportHeightChange(200f)
                val payload =
                  Arguments.createMap().apply {
                    putString("result", "success")
                  }
                requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementConfigureResult(payload)
              }
              is PaymentMethodMessagingElement.ConfigureResult.NoContent -> {
                val payload =
                  Arguments.createMap().apply {
                    putString("result", "no_content")
                  }
                reportHeightChange(0f)
                requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementConfigureResult(payload)
              }
              is PaymentMethodMessagingElement.ConfigureResult.Failed -> {
                // send the error back to JS
                val err = result.error
                val msg = err.localizedMessage ?: err.toString()
                // build a RN map
                val payload =
                  Arguments.createMap().apply {
                    putString("result", "failed")
                    putString("message", msg)
                  }
                reportHeightChange(0f)
                requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementConfigureResult(payload)
              }

            }
          }
        }
      }
    }

    Box {
      MeasureMessagingElement(
        reportHeightChange = { h -> reportHeightChange(h) },
      ) {
        messagingElement.Content()
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
        // Clamp the host Android view height; drive it in Dp
        .requiredHeight(heightDp)
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
          //val minHpx = measurable.minIntrinsicHeight(widthPx).coerceAtLeast(1)

          //println("yeet $minHpx")
          // Measure the child with a tight height equal to min intrinsic
          val placeable =
            measurable.measure(
              constraints.copy(
                minHeight = 400,
                maxHeight = 400,
              ),
            )

          // Our own size: use the child’s measured size
          layout(constraints.maxWidth, placeable.height) {
            placeable.placeRelative(IntOffset.Zero)
          }
        },
    ) {
      println("YEET content about to be called?")
      content()
    }
  }

  private fun reportHeightChange(height: Float) {
    val params =
      Arguments.createMap().apply {
        putDouble("height", height.toDouble())
      }
    println("YEET reportHeightChangeCalled")
    requireStripeSdkModule().eventEmitter.emitPaymentMethodMessagingElementDidUpdateHeight(params)
  }

  // APIs
  fun configure(
    config: PaymentMethodMessagingElement.Configuration,
  ) {
    println("YEET view.configure called")
    events.trySend(Event.Configure(config))
  }

  private fun requireStripeSdkModule() = requireNotNull(reactContext.getNativeModule(StripeSdkModule::class.java))
}
