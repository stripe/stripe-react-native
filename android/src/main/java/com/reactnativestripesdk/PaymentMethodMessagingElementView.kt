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
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow

internal fun configureFailurePayload(
  error: Throwable,
  viewTag: Int,
): WritableMap {
  val msg = error.localizedMessage ?: error.toString()
  return Arguments.createMap().apply {
    putMap(
      "result",
      Arguments.createMap().apply {
        putString("status", "failed")
        putString("message", msg)
        putInt("viewTag", viewTag)
      },
    )
  }
}

@OptIn(PaymentMethodMessagingElementPreview::class)
class PaymentMethodMessagingElementView(
  context: Context,
) : StripeAbstractComposeView(context) {
  private sealed interface ViewEvent {
    data class Configure(
      val configuration: PaymentMethodMessagingElement.Configuration,
    ) : ViewEvent

    data class Appearance(
      val appearance: PaymentMethodMessagingElement.Appearance,
    ) : ViewEvent
  }

  var latestElementConfig: PaymentMethodMessagingElement.Configuration? = null

  private val reactContext get() = context as ThemedReactContext
  private val events = Channel<ViewEvent>(Channel.UNLIMITED)

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
          is ViewEvent.Configure -> {
            reportConfigureResult(status = "loading")
            val result =
              messagingElement.configure(
                configuration = ev.configuration,
              )

            when (result) {
              is PaymentMethodMessagingElement.ConfigureResult.Succeeded -> {
                reportConfigureResult(status = "loaded")
              }
              is PaymentMethodMessagingElement.ConfigureResult.NoContent -> {
                reportHeightChange(0f)
                reportConfigureResult(status = "no_content")
              }
              is PaymentMethodMessagingElement.ConfigureResult.Failed -> {
                val err = result.error
                val msg = err.localizedMessage ?: err.toString()
                reportHeightChange(0f)
                reportConfigureResult(status = "failed", message = msg)
              }
            }
          }
          is ViewEvent.Appearance -> {
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
    val payload =
      Arguments.createMap().apply {
        putDouble("height", height.toDouble())
        putInt("viewTag", id)
      }
    dispatchEvent {
      PaymentMethodMessagingElementHeightEvent(reactContext.surfaceId, id, payload)
    }
  }

  fun reportConfigureFailed(error: Throwable) {
    val payload = configureFailurePayload(error, id)
    dispatchEvent {
      PaymentMethodMessagingElementConfigureEvent(reactContext.surfaceId, id, payload)
    }
    reportHeightChange(0f)
  }

  private fun reportConfigureResult(
    status: String,
    message: String? = null,
    code: String? = null,
  ) {
    val payload =
      Arguments.createMap().apply {
        putMap(
          "result",
          Arguments.createMap().apply {
            putString("status", status)
            message?.let { putString("message", it) }
            code?.let { putString("code", it) }
            putInt("viewTag", id)
          },
        )
      }
    dispatchEvent {
      PaymentMethodMessagingElementConfigureEvent(reactContext.surfaceId, id, payload)
    }
  }

  private fun dispatchEvent(eventFactory: () -> Event<*>) {
    UIManagerHelper
      .getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(eventFactory())
  }

  // APIs
  fun configure(config: PaymentMethodMessagingElement.Configuration) {
    events.trySend(ViewEvent.Configure(config))
  }

  fun appearance(appearance: PaymentMethodMessagingElement.Appearance) {
    events.trySend(ViewEvent.Appearance(appearance))
  }
}

internal class PaymentMethodMessagingElementConfigureEvent(
  surfaceId: Int,
  viewId: Int,
  private val payload: WritableMap,
) : Event<PaymentMethodMessagingElementConfigureEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  override fun getEventData(): WritableMap = payload

  override fun canCoalesce() = false

  companion object {
    const val EVENT_NAME = "topConfigureResult"
  }
}

private class PaymentMethodMessagingElementHeightEvent(
  surfaceId: Int,
  viewId: Int,
  private val payload: WritableMap,
) : Event<PaymentMethodMessagingElementHeightEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  override fun getEventData(): WritableMap = payload

  companion object {
    const val EVENT_NAME = "topHeightChanged"
  }
}
