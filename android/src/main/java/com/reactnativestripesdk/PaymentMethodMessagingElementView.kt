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
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.consumeAsFlow
import java.util.concurrent.atomic.AtomicInteger

/** Matches iOS validation failures (`InvalidConfiguration`). */
internal const val CONFIGURE_FAILURE_CODE = "InvalidConfiguration"

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
        putString("code", CONFIGURE_FAILURE_CODE)
        putInt("viewTag", viewTag)
      },
    )
  }
}

@OptIn(PaymentMethodMessagingElementPreview::class)
open class PaymentMethodMessagingElementView(
  context: Context,
) : StripeAbstractComposeView(context) {
  private sealed interface ViewEvent {
    data class Configure(
      val configuration: PaymentMethodMessagingElement.Configuration,
      val generation: Int,
    ) : ViewEvent

    data class Appearance(
      val appearance: PaymentMethodMessagingElement.Appearance,
    ) : ViewEvent
  }

  var latestElementConfig: PaymentMethodMessagingElement.Configuration? = null

  // Bumped when a parse failure invalidates in-flight / queued configure work so a
  // later channel consumer cannot emit loaded after JS already saw failed.
  private val configureGeneration = AtomicInteger(0)

  private val reactContext get() = context as ThemedReactContext
  private val events = Channel<ViewEvent>(Channel.UNLIMITED)

  internal fun currentConfigureGeneration(): Int = configureGeneration.get()

  internal fun isConfigureGenerationCurrent(generation: Int): Boolean =
    generation == configureGeneration.get()

  /**
   * Drop any queued/in-flight configure and clear [latestElementConfig], mirroring iOS
   * cancelling `pendingCreateTask` before returning a validation error.
   */
  fun invalidatePendingConfigure() {
    configureGeneration.incrementAndGet()
    latestElementConfig = null
  }

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
            if (!isConfigureGenerationCurrent(ev.generation)) {
              return@collect
            }
            reportConfigureResult(status = "loading")
            val result =
              messagingElement.configure(
                configuration = ev.configuration,
              )

            // A parse failure (or newer configure) may have superseded this request
            // while configure() was suspended — do not deliver a stale terminal status.
            if (!isConfigureGenerationCurrent(ev.generation)) {
              return@collect
            }

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
    // Cancel queued/in-flight configure before emitting failed, so JS cannot observe
    // failed followed by a stale loaded from an earlier channel item.
    invalidatePendingConfigure()
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

  private fun eventDispatcher(): EventDispatcher? =
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)

  /**
   * Dispatches a Fabric/UIManager event. Open so unit tests in `src/test` can subclass and
   * observe events without a release-path injection sink.
   */
  internal open fun dispatchEvent(eventFactory: () -> Event<*>) {
    eventDispatcher()?.dispatchEvent(eventFactory())
  }

  // APIs
  fun configure(config: PaymentMethodMessagingElement.Configuration) {
    // Supersede any earlier queued/in-flight configure (same role as iOS cancelling
    // `pendingCreateTask` before starting a new create).
    val generation = configureGeneration.incrementAndGet()
    events.trySend(ViewEvent.Configure(config, generation))
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

  /** Package-visible for unit tests; RN's `getEventData` is protected. */
  fun resultMap(): ReadableMap? = payload.getMap("result")

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
