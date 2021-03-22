package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.stripe.android.model.*
import java.lang.Exception

class SetupPaymentMethodFactory(private val clientSecret: String, private val params: ReadableMap, private val urlScheme: String?) {
  private val billingDetailsParams = mapToBillingDetails(getMapOrNull(params, "billingDetails"))

  @Throws(SetupPaymentMethodException::class)
  fun create(paymentMethodType: PaymentMethod.Type): ConfirmSetupIntentParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardPaymentMethodParams()
        PaymentMethod.Type.Ideal -> createIDEALPaymentMethodParams()
        else -> {
          throw Exception("This paymentMethodType is not supported yet")
        }
      }
    } catch (error: SetupPaymentMethodException) {
      throw error
    }
  }

  @Throws(SetupPaymentMethodException::class)
  private fun createIDEALPaymentMethodParams(): ConfirmSetupIntentParams {
    val bankName = getValOr(params, "bankName", null) ?: throw SetupPaymentMethodException("You must provide bankName")
    val returnUrlHost = getValOr(params, "returnUrlHost", null) ?: throw ConfirmPaymentMethodException("You must provide returnUrlHost")
    val idealParams = PaymentMethodCreateParams.Ideal(bankName)
    val createParams = PaymentMethodCreateParams.create(ideal = idealParams, billingDetails = billingDetailsParams)

    if (urlScheme == null) {
      throw ConfirmPaymentMethodException("You must provide urlScheme into StripeProvider")
    }

    return ConfirmSetupIntentParams.create(
      paymentMethodCreateParams = createParams,
      clientSecret = clientSecret,
      returnUrl = "$urlScheme://$returnUrlHost"
    )
  }

  @Throws(SetupPaymentMethodException::class)
  private fun createCardPaymentMethodParams(): ConfirmSetupIntentParams {
    val cardParams = getMapOrNull(params, "cardDetails")

    val card = cardParams?.let { mapToCard(it) } ?: run {
      throw SetupPaymentMethodException("You must provide cardDetails or paymentMethodId")
    }

    val paymentMethodParams = PaymentMethodCreateParams
      .create(card, billingDetailsParams, null)

    return ConfirmSetupIntentParams
      .create(paymentMethodParams, clientSecret)
  }
}

class SetupPaymentMethodException(message:String): Exception(message)
