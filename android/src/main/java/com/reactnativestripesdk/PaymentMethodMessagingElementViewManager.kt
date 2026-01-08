package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.EmbeddedPaymentElementViewManagerDelegate
import com.facebook.react.viewmanagers.EmbeddedPaymentElementViewManagerInterface
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementManagerDelegate
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementManagerInterface
import com.reactnativestripesdk.addresssheet.AddressSheetView
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.asMapOrNull
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.reactnativestripesdk.utils.parseCustomPaymentMethods
import com.stripe.android.ExperimentalAllowsRemovalOfLastSavedPaymentMethodApi
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalCustomPaymentMethodsApi
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import com.stripe.android.paymentsheet.PaymentSheet
import org.json.JSONArray
import org.json.JSONObject

@OptIn(PaymentMethodMessagingElementPreview::class)
@ReactModule(name = PaymentMethodMessagingElementViewManager.NAME)
class PaymentMethodMessagingElementViewManager :
  ViewGroupManager<PaymentMethodMessagingElementView>(),
  PaymentMethodMessagingElementManagerInterface<PaymentMethodMessagingElementView>
{
  companion object {
    const val NAME = "PaymentMethodMessagingElementView"
  }

  private val delegate = PaymentMethodMessagingElementManagerDelegate(this)

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

    val elementConfig = parseElementConfiguration(readableMap, view.context)
    view.latestElementConfig = elementConfig
    view.configure(elementConfig)
    view.post {
      view.requestLayout()
      view.invalidate()
    }
  }

  @SuppressLint("RestrictedApi")
  private fun parseElementConfiguration(
    map: ReadableMap,
    context: Context,
  ): PaymentMethodMessagingElement.Configuration {
    val amount = map.getString("amount")?.toLong() ?: 0

    return PaymentMethodMessagingElement.Configuration()
      .amount(amount)
      .currency("usd")
      .countryCode("US")
  }
}

