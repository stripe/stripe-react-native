package com.reactnativestripesdk

import com.facebook.react.bridge.Dynamic
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementViewManagerDelegate
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementViewManagerInterface
import com.reactnativestripesdk.utils.asMapOrNull
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview

@OptIn(PaymentMethodMessagingElementPreview::class)
@ReactModule(name = PaymentMethodMessagingElementViewManager.NAME)
class PaymentMethodMessagingElementViewManager :
  ViewGroupManager<PaymentMethodMessagingElementView>(),
  PaymentMethodMessagingElementViewManagerInterface<PaymentMethodMessagingElementView> {
  companion object {
    const val NAME = "PaymentMethodMessagingElementView"
  }

  private val delegate = PaymentMethodMessagingElementViewManagerDelegate(this)

  override fun getName() = NAME

  override fun getDelegate() = delegate

  override fun createViewInstance(ctx: ThemedReactContext): PaymentMethodMessagingElementView = PaymentMethodMessagingElementView(ctx)

  override fun onDropViewInstance(view: PaymentMethodMessagingElementView) {
    super.onDropViewInstance(view)

    view.handleOnDropViewInstance()
  }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "appearance")
  override fun setAppearance(
    view: PaymentMethodMessagingElementView?,
    value: Dynamic?,
  ) {
    val readableMap = value?.asMapOrNull() ?: return
    view?.let {
      val appearance = parseAppearance(readableMap, view.context)
      view.appearance(appearance)
    }
  }

  @ReactProp(name = "configuration")
  override fun setConfiguration(
    view: PaymentMethodMessagingElementView,
    cfg: Dynamic,
  ) {
    val readableMap = cfg.asMapOrNull() ?: return

    val elementConfig = parseElementConfiguration(readableMap)
    view.latestElementConfig = elementConfig
    view.configure(elementConfig)
    view.post {
      view.requestLayout()
      view.invalidate()
    }
  }
}
