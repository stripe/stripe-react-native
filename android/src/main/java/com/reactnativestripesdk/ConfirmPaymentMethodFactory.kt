package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.stripe.android.model.*
import java.lang.Exception

class ConfirmPaymentMethodFactory(private val clientSecret: String, private val params: ReadableMap, private val urlScheme: String?) {
  private val billingDetailsParams = mapToBillingDetails(getMapOrNull(params, "billingDetails"))

  @Throws(ConfirmPaymentMethodException::class)
  fun create(paymentMethodType: PaymentMethod.Type): ConfirmPaymentIntentParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardPaymentMethodParams()
        PaymentMethod.Type.Ideal -> createIDEALPaymentMethodParams(paymentMethodType)
        else -> {
          throw Exception("This paymentMethodType is not supported yet")
        }
      }
    } catch (error: ConfirmPaymentMethodException) {
      throw error
    }
  }

  @Throws(ConfirmPaymentMethodException::class)
  private fun createIDEALPaymentMethodParams(paymentMethodType: PaymentMethod.Type): ConfirmPaymentIntentParams {
    val bankName = getValOr(params, "bankName", null) ?: throw ConfirmPaymentMethodException("You must provide bankName")

    if (urlScheme == null) {
      throw ConfirmPaymentMethodException("You must provide urlScheme")
    }

    val idealParams = PaymentMethodCreateParams.Ideal(bankName)
    val createParams = PaymentMethodCreateParams.create(ideal = idealParams, billingDetails = billingDetailsParams)

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = createParams,
        clientSecret = clientSecret,
        returnUrl = mapToReturnURL(urlScheme, paymentMethodType)
      )
  }

  @Throws(ConfirmPaymentMethodException::class)
  private fun createCardPaymentMethodParams(): ConfirmPaymentIntentParams {
    val cardParams = getMapOrNull(params, "cardDetails")
    val paymentMethodId = getValOr(params, "paymentMethodId", null)

    if (cardParams == null && paymentMethodId == null) {
      throw ConfirmPaymentMethodException("You must provide cardDetails or paymentMethodId")
    }

    val setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(params, "setupFutureUsage"))

    if (paymentMethodId != null) {
      val cvc = getValOr(params, "cvc", null)
      val paymentMethodOptionParams = if (cvc != null) PaymentMethodOptionsParams.Card(cvc) else null

      return ConfirmPaymentIntentParams.createWithPaymentMethodId(
        paymentMethodId = paymentMethodId,
        paymentMethodOptions = paymentMethodOptionParams,
        clientSecret = clientSecret
      )
    } else {
      val card = mapToCard(cardParams!!)

      val createParams = PaymentMethodCreateParams
        .create(card, billingDetailsParams, null)

      return ConfirmPaymentIntentParams
        .createWithPaymentMethodCreateParams(
          paymentMethodCreateParams = createParams,
          clientSecret = clientSecret,
          setupFutureUsage = setupFutureUsage
        )
    }
  }
}

class ConfirmPaymentMethodException(message:String): Exception(message)
