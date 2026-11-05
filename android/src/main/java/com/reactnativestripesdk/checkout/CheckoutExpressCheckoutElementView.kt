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
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.reactnativestripesdk.StripeAbstractComposeView
import com.reactnativestripesdk.StripeSdkModule
import com.stripe.android.elements.ExpressCheckoutElement
import com.stripe.android.paymentelement.CheckoutSessionPreview

/** Displays the Express Checkout Element owned by a registered Checkout controller. */
@OptIn(CheckoutSessionPreview::class)
class CheckoutExpressCheckoutElementView(
  private val reactContext: ThemedReactContext,
) : StripeAbstractComposeView(reactContext) {
  private var controllerId: String? = null
  private var element by mutableStateOf<ExpressCheckoutElement?>(null)
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

  // React Native does not run a parent layout pass for Compose's child layout requests.
  override fun requestLayout() {
    super.requestLayout()
    if (isAttachedToWindow) {
      post {
        if (isAttachedToWindow) {
          measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
          )
          layout(left, top, right, bottom)
        }
      }
    }
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
    element = instance.expressCheckoutElement(activity)
    removeObserver = instance.observeDestruction { detach() }
  }

  fun detach() {
    removeObserver?.invoke()
    removeObserver = null
    element = null
  }

  @Composable
  override fun Content() {
    val expressCheckoutElement = element ?: return
    val density = LocalDensity.current
    var heightDp by remember(expressCheckoutElement) { mutableStateOf(1.dp) }
    Box(
      Modifier
        .requiredHeight(heightDp)
        .onSizeChanged { size ->
          val height = with(density) { size.height.toDp() }
          if (height != heightDp) {
            heightDp = height
            UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(
              CheckoutExpressCheckoutHeightEvent(reactContext.surfaceId, id, height.value),
            )
          }
        }
        .layout { measurable, constraints ->
          // Express Checkout uses BoxWithConstraints, which cannot answer intrinsic queries.
          // Measure its natural height independently of React Native's current height instead.
          val placeable = measurable.measure(constraints.copy(minHeight = 0, maxHeight = Constraints.Infinity))
          layout(constraints.maxWidth, placeable.height.coerceAtLeast(1)) {
            placeable.placeRelative(IntOffset.Zero)
          }
        },
    ) { expressCheckoutElement.Content() }
  }
}

private class CheckoutExpressCheckoutHeightEvent(surfaceId: Int, viewId: Int, private val height: Float) :
  Event<CheckoutExpressCheckoutHeightEvent>(surfaceId, viewId) {
  override fun getEventName() = "topHeightChanged"
  override fun getEventData(): WritableMap = Arguments.createMap().apply { putDouble("height", height.toDouble()) }
}
