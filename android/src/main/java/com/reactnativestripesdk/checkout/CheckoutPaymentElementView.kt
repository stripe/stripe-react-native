package com.reactnativestripesdk.checkout

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.runtime.Composable
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
import com.reactnativestripesdk.StripeAbstractComposeView
import com.reactnativestripesdk.StripeSdkModule
import com.stripe.android.elements.PaymentElement
import com.stripe.android.paymentelement.CheckoutSessionPreview

/** Displays the Payment Element owned by a registered Checkout controller. */
@OptIn(CheckoutSessionPreview::class)
class CheckoutPaymentElementView(
  private val reactContext: ThemedReactContext,
) : StripeAbstractComposeView(reactContext) {
  private var controllerId: String? = null
  private var element by mutableStateOf<PaymentElement?>(null)
  private var removeObserver: (() -> Unit)? = null

  fun setControllerId(value: String?) {
    if (controllerId == value) return
    detach()
    controllerId = value
    attach()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attach()
  }

  override fun onDetachedFromWindow() {
    detach()
    super.onDetachedFromWindow()
  }

  private fun attach() {
    if (!isAttachedToWindow || element != null) return
    val id = controllerId ?: return
    val module = reactContext.getNativeModule(StripeSdkModule::class.java) ?: return
    val instance = module.checkoutControllers[id] ?: return
    val activity = reactContext.currentActivity as? ComponentActivity ?: return
    element = instance.paymentElement(activity)
    removeObserver = instance.observeDestruction { detach() }
  }

  fun detach() {
    removeObserver?.invoke()
    removeObserver = null
    element = null
  }

  @Composable
  override fun Content() {
    val paymentElement = element ?: return
    val density = LocalDensity.current
    var heightDp by remember(paymentElement) { mutableStateOf(1.dp) }
    Box(
      Modifier
        .requiredHeight(heightDp)
        .onSizeChanged { size ->
          val height = with(density) { size.height.toDp() }
          if (height != heightDp) {
            heightDp = height
            UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(
              CheckoutElementHeightEvent(reactContext.surfaceId, id, height.value),
            )
          }
        }
        .layout { measurable, constraints ->
          // Measure the content independently of React Native's current height.
          val height = measurable.minIntrinsicHeight(constraints.maxWidth).coerceAtLeast(1)
          val placeable = measurable.measure(constraints.copy(minHeight = height, maxHeight = height))
          layout(constraints.maxWidth, placeable.height) {
            placeable.placeRelative(IntOffset.Zero)
          }
        },
    ) { paymentElement.Content() }
  }
}

private class CheckoutElementHeightEvent(surfaceId: Int, viewId: Int, private val height: Float) :
  Event<CheckoutElementHeightEvent>(surfaceId, viewId) {
  override fun getEventName() = "topHeightChanged"
  override fun getEventData(): WritableMap = Arguments.createMap().apply { putDouble("height", height.toDouble()) }
}
