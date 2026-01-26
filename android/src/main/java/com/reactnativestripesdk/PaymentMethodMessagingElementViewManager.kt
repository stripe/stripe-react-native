package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementViewManagerDelegate
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementViewManagerInterface
import com.reactnativestripesdk.utils.asMapOrNull
import com.reactnativestripesdk.utils.getStringList
import com.stripe.android.crypto.onramp.model.PaymentMethodType
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview

@OptIn(PaymentMethodMessagingElementPreview::class)
@ReactModule(name = PaymentMethodMessagingElementViewManager.NAME)
class PaymentMethodMessagingElementViewManager :
  ViewGroupManager<PaymentMethodMessagingElementView>(),
  PaymentMethodMessagingElementViewManagerInterface<PaymentMethodMessagingElementView>
{
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
  override fun setAppearance(
    view: PaymentMethodMessagingElementView?,
    value: Dynamic?
  ) {
    //TODO("Not yet implemented")
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

  private fun parseElementConfiguration(
    map: ReadableMap,
  ): PaymentMethodMessagingElement.Configuration {
    val amount = map.getDouble("amount").toLong()
    val currency = map.getString("currency")
    val locale = map.getString("locale")
    val countryCode = map.getString("countryCode")
    val stringPaymentMethodTypes = map.getStringList("paymentMethodTypes")
    val paymentMethodTypes = stringPaymentMethodTypes?.mapNotNull {
      PaymentMethod.Type.fromCode(it)
    }

    val config = PaymentMethodMessagingElement.Configuration()
    config.amount(amount)
    currency?.let { config.currency(it) }
    locale?.let { config.locale(it) }
    countryCode?.let { config.countryCode(it) }
    paymentMethodTypes?.let { config.paymentMethodTypes(it) }

    return config
  }
}

