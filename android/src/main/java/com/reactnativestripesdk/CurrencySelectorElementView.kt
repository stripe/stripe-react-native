package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.stripe.android.paymentelement.CheckoutSessionPreview

@OptIn(CheckoutSessionPreview::class)
class CurrencySelectorElementView(
  context: Context,
) : StripeAbstractComposeView(context) {
  private val reactContext get() = context as ReactContext

  // Backing state for props. mutableStateOf so Compose recomposes on changes.
  private var sessionKeyState = mutableStateOf<String?>(null)
  private var disabledState = mutableStateOf(false)

  fun setSessionKey(value: String?) {
    sessionKeyState.value = value?.takeIf { it.isNotEmpty() }
  }

  fun setDisabled(value: Boolean) {
    disabledState.value = value
  }

  @SuppressLint("RestrictedApi")
  @Composable
  override fun Content() {
    val sessionKey by remember { sessionKeyState }
    val disabled by remember { disabledState }

    val checkout = remember(sessionKey) {
      sessionKey?.let { key ->
        val module = reactContext.getNativeModule(StripeSdkModule::class.java)
        module?.checkoutInstances?.get(key)
      }
    }

    if (checkout != null) {
      // We don't push state to JS from this view — `StripeSdkModule` already
      // observes the same `Checkout` instance and emits a unified
      // `checkoutSessionDidChangeState` event that `useCheckout` mirrors into
      // its `state`. Keeping the bridge in one place avoids redundant
      // round-trips and inconsistencies.
      MeasuredCurrencySelector(
        reportHeightChange = { reportHeightChange(it) },
      ) {
        Box {
          checkout.CurrencySelectorContent()
          if (disabled) {
            // The Stripe Android composable doesn't yet expose an `isEnabled`
            // parameter, so swallow taps with a transparent pointer-input
            // overlay while `disabled` is true. The toggle stays visible but
            // can't be interacted with.
            Box(
              Modifier
                .matchParentSize()
                .pointerInput(Unit) { /* consume all gestures */ },
            )
          }
        }
      }
    } else {
      // No checkout yet: take up zero height so the element collapses.
      LaunchedEffect(Unit) {
        reportHeightChange(0f)
      }
    }
  }

  @Composable
  private fun MeasuredCurrencySelector(
    reportHeightChange: (Float) -> Unit,
    content: @Composable () -> Unit,
  ) {
    val density = LocalDensity.current
    var heightDp by remember { mutableStateOf(1.dp) } // non-zero sentinel

    Box(
      Modifier
        .onSizeChanged { size ->
          val h = with(density) { size.height.toDp() }
          if (h != heightDp) {
            heightDp = h
            reportHeightChange(h.value)
          }
        }
        .layout { measurable, constraints ->
          val widthPx = constraints.maxWidth
          val minHpx = measurable.minIntrinsicHeight(widthPx).coerceAtLeast(0)

          val placeable = measurable.measure(
            constraints.copy(minHeight = minHpx, maxHeight = minHpx),
          )

          layout(constraints.maxWidth, placeable.height) {
            placeable.placeRelative(IntOffset.Zero)
          }
        },
    ) {
      content()
    }
  }

  private fun reportHeightChange(height: Float) {
    val params = Arguments.createMap().apply {
      putDouble("height", height.toDouble())
    }
    dispatchEvent(CurrencySelectorElementEvent.EventType.OnHeightChange, params)
  }

  private fun dispatchEvent(
    eventType: CurrencySelectorElementEvent.EventType,
    params: WritableMap,
  ) {
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    dispatcher?.dispatchEvent(
      CurrencySelectorElementEvent(surfaceId, id, eventType, params),
    )
  }
}
