// This is a temporary compat layer for event emitters on new arch.
// Versions before RN 0.80 crash sometimes when setting the event emitter callback.
// Remove this layer once we drop support for RN < 0.80.
package com.reactnativestripesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class EventEmitterCompat(
  private val reactApplicationContext: ReactApplicationContext,
) {
  private fun invoke(
    eventName: String,
    params: Any? = null,
  ) {
    reactApplicationContext
      .getJSModule(
        DeviceEventManagerModule.RCTDeviceEventEmitter::class.java,
      ).emit(eventName, params)
  }

  fun emitOnConfirmHandlerCallback(value: ReadableMap?) {
    invoke("onConfirmHandlerCallback", value)
  }

  fun emitOnConfirmationTokenHandlerCallback(value: ReadableMap?) {
    invoke("onConfirmationTokenHandlerCallback", value)
  }

  fun emitOnFinancialConnectionsEvent(value: ReadableMap?) {
    invoke("onFinancialConnectionsEvent", value)
  }

  fun emitOnCustomerAdapterFetchPaymentMethodsCallback() {
    invoke("onCustomerAdapterFetchPaymentMethodsCallback")
  }

  fun emitOnCustomerAdapterAttachPaymentMethodCallback(value: ReadableMap?) {
    invoke("onCustomerAdapterAttachPaymentMethodCallback", value)
  }

  fun emitOnCustomerAdapterDetachPaymentMethodCallback(value: ReadableMap?) {
    invoke("onCustomerAdapterDetachPaymentMethodCallback", value)
  }

  fun emitOnCustomerAdapterSetSelectedPaymentOptionCallback(value: ReadableMap?) {
    invoke("onCustomerAdapterSetSelectedPaymentOptionCallback", value)
  }

  fun emitOnCustomerAdapterFetchSelectedPaymentOptionCallback() {
    invoke("onCustomerAdapterFetchSelectedPaymentOptionCallback")
  }

  fun emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback() {
    invoke("onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback")
  }

  fun emitOnCustomerSessionProviderSetupIntentClientSecret() {
    invoke("onCustomerSessionProviderSetupIntentClientSecret")
  }

  fun emitOnCustomerSessionProviderCustomerSessionClientSecret() {
    invoke("onCustomerSessionProviderCustomerSessionClientSecret")
  }

  fun emitEmbeddedPaymentElementDidUpdateHeight(value: ReadableMap?) {
    invoke("embeddedPaymentElementDidUpdateHeight", value)
  }

  fun emitEmbeddedPaymentElementDidUpdatePaymentOption(value: ReadableMap?) {
    invoke("embeddedPaymentElementDidUpdatePaymentOption", value)
  }

  fun emitEmbeddedPaymentElementFormSheetConfirmComplete(value: ReadableMap?) {
    invoke("embeddedPaymentElementFormSheetConfirmComplete", value)
  }

  fun emitEmbeddedPaymentElementRowSelectionImmediateAction() {
    invoke("embeddedPaymentElementRowSelectionImmediateAction")
  }

  fun emitEmbeddedPaymentElementLoadingFailed(value: ReadableMap?) {
    invoke("embeddedPaymentElementLoadingFailed", value)
  }

  fun emitOnCustomPaymentMethodConfirmHandlerCallback(value: ReadableMap?) {
    invoke("onCustomPaymentMethodConfirmHandlerCallback", value)
  }
}
