// This needs to be in the same package as StripeSdkModule to access protected methods.
package com.reactnativestripesdk

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.stripe.android.customersheet.CustomerAdapter
import com.stripe.android.model.PaymentMethod
import kotlinx.coroutines.CompletableDeferred

class ReactNativeCustomerAdapter(
  val context: ReactApplicationContext,
  private val adapter: CustomerAdapter,
  private val overridesFetchPaymentMethods: Boolean,
  private val overridesAttachPaymentMethod: Boolean,
  private val overridesDetachPaymentMethod: Boolean,
  private val overridesSetSelectedPaymentOption: Boolean,
  private val overridesFetchSelectedPaymentOption: Boolean,
  private val overridesSetupIntentClientSecretForCustomerAttach: Boolean,
) : CustomerAdapter by adapter {
  private val stripeSdkModule = context.getNativeModule(StripeSdkModule::class.java)

  internal var fetchPaymentMethodsCallback: CompletableDeferred<List<PaymentMethod>>? = null
  internal var attachPaymentMethodCallback: CompletableDeferred<PaymentMethod>? = null
  internal var detachPaymentMethodCallback: CompletableDeferred<PaymentMethod>? = null
  internal var setSelectedPaymentOptionCallback: CompletableDeferred<Unit>? = null
  internal var fetchSelectedPaymentOptionCallback: CompletableDeferred<String?>? = null
  internal var setupIntentClientSecretForCustomerAttachCallback: CompletableDeferred<String>? = null

  override suspend fun retrievePaymentMethods(): CustomerAdapter.Result<List<PaymentMethod>> {
    if (overridesFetchPaymentMethods) {
      CompletableDeferred<List<PaymentMethod>>().also {
        fetchPaymentMethodsCallback = it
        stripeSdkModule?.emitOnCustomerAdapterFetchPaymentMethodsCallback()
        val resultFromJavascript = it.await()
        return CustomerAdapter.Result.success(resultFromJavascript)
      }
    }

    return adapter.retrievePaymentMethods()
  }

  override suspend fun attachPaymentMethod(paymentMethodId: String): CustomerAdapter.Result<PaymentMethod> {
    if (overridesAttachPaymentMethod) {
      CompletableDeferred<PaymentMethod>().also {
        attachPaymentMethodCallback = it
        val params = Arguments.createMap().also { it.putString("paymentMethodId", paymentMethodId) }
        stripeSdkModule?.emitOnCustomerAdapterAttachPaymentMethodCallback(params)
        val resultFromJavascript = it.await()
        return CustomerAdapter.Result.success(resultFromJavascript)
      }
    }

    return adapter.attachPaymentMethod(paymentMethodId)
  }

  override suspend fun detachPaymentMethod(paymentMethodId: String): CustomerAdapter.Result<PaymentMethod> {
    if (overridesDetachPaymentMethod) {
      CompletableDeferred<PaymentMethod>().also {
        detachPaymentMethodCallback = it
        val params = Arguments.createMap().also { it.putString("paymentMethodId", paymentMethodId) }
        stripeSdkModule?.emitOnCustomerAdapterDetachPaymentMethodCallback(params)
        val resultFromJavascript = it.await()
        return CustomerAdapter.Result.success(resultFromJavascript)
      }
    }

    return adapter.detachPaymentMethod(paymentMethodId)
  }

  override suspend fun setSelectedPaymentOption(paymentOption: CustomerAdapter.PaymentOption?): CustomerAdapter.Result<Unit> {
    if (overridesSetSelectedPaymentOption) {
      CompletableDeferred<Unit>().also {
        setSelectedPaymentOptionCallback = it
        val params = Arguments.createMap().also { it.putString("paymentOption", paymentOption?.id) }
        stripeSdkModule?.emitOnCustomerAdapterSetSelectedPaymentOptionCallback(params)
        val resultFromJavascript = it.await()
        return CustomerAdapter.Result.success(resultFromJavascript)
      }
    }

    return adapter.setSelectedPaymentOption(paymentOption)
  }

  override suspend fun retrieveSelectedPaymentOption(): CustomerAdapter.Result<CustomerAdapter.PaymentOption?> {
    if (overridesFetchSelectedPaymentOption) {
      CompletableDeferred<String?>().also {
        fetchSelectedPaymentOptionCallback = it
        stripeSdkModule?.emitOnCustomerAdapterFetchSelectedPaymentOptionCallback()
        val resultFromJavascript = it.await()
        return CustomerAdapter.Result.success(
          if (resultFromJavascript != null) {
            CustomerAdapter.PaymentOption.fromId(resultFromJavascript)
          } else {
            null
          },
        )
      }
    }

    return adapter.retrieveSelectedPaymentOption()
  }

  override suspend fun setupIntentClientSecretForCustomerAttach(): CustomerAdapter.Result<String> {
    if (overridesSetupIntentClientSecretForCustomerAttach) {
      CompletableDeferred<String>().also {
        setupIntentClientSecretForCustomerAttachCallback = it
        stripeSdkModule?.emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback()
        val resultFromJavascript = it.await()
        return CustomerAdapter.Result.success(resultFromJavascript)
      }
    }

    return adapter.setupIntentClientSecretForCustomerAttach()
  }
}
