package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.getBooleanOrFalse
import com.reactnativestripesdk.utils.getMapOrNull
import com.reactnativestripesdk.utils.getValOr
import com.reactnativestripesdk.utils.mapToBillingDetails
import com.reactnativestripesdk.utils.mapToMetadata
import com.reactnativestripesdk.utils.mapToPaymentIntentFutureUsage
import com.reactnativestripesdk.utils.mapToUSBankAccountHolderType
import com.reactnativestripesdk.utils.mapToUSBankAccountType
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.ConfirmSetupIntentParams
import com.stripe.android.model.ConfirmStripeIntentParams
import com.stripe.android.model.MandateDataParams
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.PaymentMethodCreateParams
import com.stripe.android.model.PaymentMethodOptionsParams

class PaymentMethodCreateParamsFactory(
  private val paymentMethodData: ReadableMap?,
  private val options: ReadableMap?,
  private val cardFieldView: CardFieldView?,
  private val cardFormView: CardFormView?,
) {
  private val billingDetailsParams =
    mapToBillingDetails(
      getMapOrNull(paymentMethodData, "billingDetails"),
      cardFieldView?.cardAddress ?: cardFormView?.cardAddress,
    )
  private val metadataParams: Map<String, String>? =
    mapToMetadata(getMapOrNull(paymentMethodData, "metadata"))

  @Throws(PaymentMethodCreateParamsException::class)
  fun createPaymentMethodParams(paymentMethodType: PaymentMethod.Type): PaymentMethodCreateParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardPaymentMethodParams()
        PaymentMethod.Type.Ideal -> createIDEALParams()
        PaymentMethod.Type.Alipay -> createAlipayParams()
        PaymentMethod.Type.Bancontact -> createBancontactParams()
        PaymentMethod.Type.SepaDebit -> createSepaParams()
        PaymentMethod.Type.Oxxo -> createOXXOParams()
        PaymentMethod.Type.Giropay -> createGiropayParams()
        PaymentMethod.Type.Eps -> createEPSParams()
        PaymentMethod.Type.GrabPay -> createGrabPayParams()
        PaymentMethod.Type.P24 -> createP24Params()
        PaymentMethod.Type.Fpx -> createFpxParams()
        PaymentMethod.Type.AfterpayClearpay -> createAfterpayClearpayParams()
        PaymentMethod.Type.AuBecsDebit -> createAuBecsDebitParams()
        PaymentMethod.Type.Klarna -> createKlarnaParams()
        PaymentMethod.Type.USBankAccount -> createUSBankAccountParams(paymentMethodData)
        PaymentMethod.Type.PayPal -> createPayPalParams()
        PaymentMethod.Type.Affirm -> createAffirmParams()
        PaymentMethod.Type.CashAppPay -> createCashAppParams()
        PaymentMethod.Type.RevolutPay -> createRevolutPayParams()
        else -> {
          throw Exception("This paymentMethodType is not supported yet")
        }
      }
    } catch (error: PaymentMethodCreateParamsException) {
      throw error
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createIDEALParams(): PaymentMethodCreateParams {
    val bankName = getValOr(paymentMethodData, "bankName", null)

    val idealParams = PaymentMethodCreateParams.Ideal(bankName)
    return PaymentMethodCreateParams.create(
      ideal = idealParams,
      billingDetails = billingDetailsParams,
      metadata = metadataParams,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAlipayParams(): PaymentMethodCreateParams = PaymentMethodCreateParams.createAlipay()

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createBancontactParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createBancontact(
        billingDetails = it,
        metadata = metadataParams,
      )
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSepaParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      val iban =
        getValOr(paymentMethodData, "iban", null)
          ?: run { throw PaymentMethodCreateParamsException("You must provide IBAN") }

      return PaymentMethodCreateParams.create(
        sepaDebit = PaymentMethodCreateParams.SepaDebit(iban),
        billingDetails = it,
        metadata = metadataParams,
      )
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createOXXOParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createOxxo(billingDetails = it, metadata = metadataParams)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createGiropayParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createGiropay(billingDetails = it, metadata = metadataParams)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createEPSParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createEps(billingDetails = it, metadata = metadataParams)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createGrabPayParams(): PaymentMethodCreateParams {
    val billingDetails = billingDetailsParams ?: PaymentMethod.BillingDetails()
    return PaymentMethodCreateParams.createGrabPay(billingDetails)
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createP24Params(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createP24(billingDetails = it, metadata = metadataParams)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createFpxParams(): PaymentMethodCreateParams {
    val bank = getBooleanOrFalse(paymentMethodData, "testOfflineBank").let { "test_offline_bank" }
    return PaymentMethodCreateParams.create(
      PaymentMethodCreateParams.Fpx(bank),
      metadata = metadataParams,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAfterpayClearpayParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createAfterpayClearpay(
        billingDetails = it,
        metadata = metadataParams,
      )
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAuBecsDebitParams(): PaymentMethodCreateParams {
    val formDetails =
      getMapOrNull(paymentMethodData, "formDetails")
        ?: run { throw PaymentMethodCreateParamsException("You must provide form details") }

    val bsbNumber = getValOr(formDetails, "bsbNumber") as String
    val accountNumber = getValOr(formDetails, "accountNumber") as String
    val name = getValOr(formDetails, "name") as String
    val email = getValOr(formDetails, "email") as String

    val billingDetails =
      PaymentMethod.BillingDetails
        .Builder()
        .setName(name)
        .setEmail(email)
        .build()

    return PaymentMethodCreateParams.create(
      auBecsDebit =
        PaymentMethodCreateParams.AuBecsDebit(
          bsbNumber = bsbNumber,
          accountNumber = accountNumber,
        ),
      billingDetails = billingDetails,
      metadata = metadataParams,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createKlarnaParams(): PaymentMethodCreateParams {
    if (billingDetailsParams == null ||
      billingDetailsParams.address?.country.isNullOrBlank() ||
      billingDetailsParams.email.isNullOrBlank()
    ) {
      throw PaymentMethodCreateParamsException(
        "Klarna requires that you provide the following billing details: email, country",
      )
    }

    return PaymentMethodCreateParams.createKlarna(
      billingDetails = billingDetailsParams,
      metadata = metadataParams,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createPayPalParams(): PaymentMethodCreateParams = PaymentMethodCreateParams.createPayPal(metadata = metadataParams)

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAffirmParams(): PaymentMethodCreateParams =
    PaymentMethodCreateParams.createAffirm(
      billingDetails = billingDetailsParams,
      metadata = metadataParams,
    )

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createCashAppParams(): PaymentMethodCreateParams =
    PaymentMethodCreateParams.createCashAppPay(
      billingDetails = billingDetailsParams,
      metadata = metadataParams,
    )

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createRevolutPayParams(): PaymentMethodCreateParams =
    PaymentMethodCreateParams.createRevolutPay(
      billingDetails = billingDetailsParams,
      metadata = metadataParams,
    )

  @Throws(PaymentMethodCreateParamsException::class)
  fun createParams(
    clientSecret: String,
    paymentMethodType: PaymentMethod.Type?,
    isPaymentIntent: Boolean,
  ): ConfirmStripeIntentParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardStripeIntentParams(clientSecret, isPaymentIntent)
        PaymentMethod.Type.USBankAccount ->
          createUSBankAccountStripeIntentParams(clientSecret, isPaymentIntent)

        PaymentMethod.Type.Affirm -> createAffirmStripeIntentParams(clientSecret, isPaymentIntent)
        PaymentMethod.Type.Ideal,
        PaymentMethod.Type.Alipay,
        PaymentMethod.Type.Bancontact,
        PaymentMethod.Type.SepaDebit,
        PaymentMethod.Type.Oxxo,
        PaymentMethod.Type.Giropay,
        PaymentMethod.Type.Eps,
        PaymentMethod.Type.GrabPay,
        PaymentMethod.Type.P24,
        PaymentMethod.Type.Fpx,
        PaymentMethod.Type.AfterpayClearpay,
        PaymentMethod.Type.AuBecsDebit,
        PaymentMethod.Type.Klarna,
        PaymentMethod.Type.PayPal,
        PaymentMethod.Type.CashAppPay,
        PaymentMethod.Type.RevolutPay,
        -> {
          val params = createPaymentMethodParams(paymentMethodType)

          return if (isPaymentIntent) {
            ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(
              paymentMethodCreateParams = params,
              clientSecret = clientSecret,
              setupFutureUsage =
                mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
              mandateData = buildMandateDataParams(),
            )
          } else {
            ConfirmSetupIntentParams.create(
              paymentMethodCreateParams = params,
              clientSecret = clientSecret,
              mandateData = buildMandateDataParams(),
            )
          }
        }

        null -> ConfirmPaymentIntentParams.create(clientSecret)
        else -> {
          throw Exception("This paymentMethodType is not supported yet")
        }
      }
    } catch (error: PaymentMethodCreateParamsException) {
      throw error
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createCardPaymentMethodParams(): PaymentMethodCreateParams {
    val token = getValOr(paymentMethodData, "token", null)
    var cardParams = cardFieldView?.cardParams ?: cardFormView?.cardParams

    if (token != null) {
      cardParams = PaymentMethodCreateParams.Card.create(token)
    }

    if (cardParams == null) {
      throw PaymentMethodCreateParamsException("Card details not complete")
    }

    return PaymentMethodCreateParams.create(cardParams, billingDetailsParams)
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createCardStripeIntentParams(
    clientSecret: String,
    isPaymentIntent: Boolean,
  ): ConfirmStripeIntentParams {
    val paymentMethodId = getValOr(paymentMethodData, "paymentMethodId", null)
    val setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))

    if (paymentMethodId != null) {
      val cvc = getValOr(paymentMethodData, "cvc", null)
      val paymentMethodOptionParams =
        if (cvc != null) PaymentMethodOptionsParams.Card(cvc) else null

      return (
        if (isPaymentIntent) {
          ConfirmPaymentIntentParams.createWithPaymentMethodId(
            paymentMethodId,
            paymentMethodOptions = paymentMethodOptionParams,
            clientSecret = clientSecret,
            setupFutureUsage = setupFutureUsage,
          )
        } else {
          ConfirmSetupIntentParams.create(paymentMethodId, clientSecret)
        }
      )
    } else {
      val paymentMethodCreateParams = createCardPaymentMethodParams()
      return (
        if (isPaymentIntent) {
          ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(
            paymentMethodCreateParams,
            clientSecret,
            setupFutureUsage = setupFutureUsage,
          )
        } else {
          ConfirmSetupIntentParams.create(paymentMethodCreateParams, clientSecret)
        }
      )
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createUSBankAccountStripeIntentParams(
    clientSecret: String,
    isPaymentIntent: Boolean,
  ): ConfirmStripeIntentParams {
    // If payment method data is supplied, assume they are passing in the bank details manually
    paymentMethodData?.let {
      if (billingDetailsParams?.name.isNullOrBlank()) {
        throw PaymentMethodCreateParamsException(
          "When creating a US bank account payment method, you must provide the following billing details: name",
        )
      }
      return if (isPaymentIntent) {
        ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(
          paymentMethodCreateParams = createUSBankAccountParams(paymentMethodData),
          clientSecret,
          setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
        )
      } else {
        ConfirmSetupIntentParams.create(
          paymentMethodCreateParams = createUSBankAccountParams(paymentMethodData),
          clientSecret = clientSecret,
        )
      }
    }
      ?: run {
        // Payment method is assumed to be already attached through via collectBankAccount
        return if (isPaymentIntent) {
          ConfirmPaymentIntentParams.create(
            clientSecret = clientSecret,
            paymentMethodType = PaymentMethod.Type.USBankAccount,
          )
        } else {
          ConfirmSetupIntentParams.create(
            clientSecret = clientSecret,
            paymentMethodType = PaymentMethod.Type.USBankAccount,
          )
        }
      }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAffirmStripeIntentParams(
    clientSecret: String,
    isPaymentIntent: Boolean,
  ): ConfirmStripeIntentParams {
    if (!isPaymentIntent) {
      throw PaymentMethodCreateParamsException("Affirm is not yet supported through SetupIntents.")
    }

    val params = createAffirmParams()

    return ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(
      paymentMethodCreateParams = params,
      clientSecret = clientSecret,
      setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
      mandateData = buildMandateDataParams(),
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createUSBankAccountParams(params: ReadableMap?): PaymentMethodCreateParams {
    val accountNumber = getValOr(params, "accountNumber", null)
    val routingNumber = getValOr(params, "routingNumber", null)

    if (accountNumber.isNullOrBlank()) {
      throw PaymentMethodCreateParamsException(
        "When creating a US bank account payment method, you must provide the bank account number",
      )
    } else if (routingNumber.isNullOrBlank()) {
      throw PaymentMethodCreateParamsException(
        "When creating a US bank account payment method, you must provide the bank routing number",
      )
    }

    val usBankAccount =
      PaymentMethodCreateParams.USBankAccount(
        accountNumber,
        routingNumber,
        mapToUSBankAccountType(getValOr(params, "accountType", null)),
        mapToUSBankAccountHolderType(getValOr(params, "accountHolderType", null)),
      )

    return PaymentMethodCreateParams.Companion.create(
      usBankAccount,
      billingDetailsParams,
      metadataParams,
    )
  }

  private fun buildMandateDataParams(): MandateDataParams? {
    getMapOrNull(paymentMethodData, "mandateData")?.let { mandateData ->
      getMapOrNull(mandateData, "customerAcceptance")?.let { customerAcceptance ->
        getMapOrNull(customerAcceptance, "online")?.let { onlineParams ->
          return MandateDataParams(
            MandateDataParams.Type.Online(
              ipAddress = getValOr(onlineParams, "ipAddress", "") ?: "",
              userAgent = getValOr(onlineParams, "userAgent", "") ?: "",
            ),
          )
        }
      }
    }
    return null
  }
}

class PaymentMethodCreateParamsException(
  message: String,
) : Exception(message)
