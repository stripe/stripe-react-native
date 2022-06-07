package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.stripe.android.model.*

class PaymentMethodCreateParamsFactory(
  private val clientSecret: String,
  private val paymentMethodData: ReadableMap?,
  private val options: ReadableMap,
  private val cardFieldView: CardFieldView?,
  private val cardFormView: CardFormView?,
) {
  private val billingDetailsParams = mapToBillingDetails(getMapOrNull(paymentMethodData, "billingDetails"), cardFieldView?.cardAddress ?: cardFormView?.cardAddress)

  @Throws(PaymentMethodCreateParamsException::class)
  fun createPaymentMethodParams(paymentMethodType: PaymentMethod.Type): PaymentMethodCreateParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardParams()
        PaymentMethod.Type.Ideal -> createIDEALParams()
        PaymentMethod.Type.Alipay -> createAlipayParams()
        PaymentMethod.Type.Sofort -> createSofortParams()
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
        PaymentMethod.Type.USBankAccount -> createUSBankAccountParams()
        PaymentMethod.Type.PayPal -> createPayPalParams()
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
    return PaymentMethodCreateParams.create(ideal = idealParams, billingDetails = billingDetailsParams)
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAlipayParams(): PaymentMethodCreateParams {
    return PaymentMethodCreateParams.createAlipay()
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSofortParams(): PaymentMethodCreateParams {
    val country = getValOr(paymentMethodData, "country", null) ?: run {
      throw PaymentMethodCreateParamsException("You must provide bank account country")
    }

    return PaymentMethodCreateParams.create(
      PaymentMethodCreateParams.Sofort(country = country),
      billingDetailsParams
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createBancontactParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createBancontact(it)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSepaParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      val iban = getValOr(paymentMethodData, "iban", null) ?: run {
        throw PaymentMethodCreateParamsException("You must provide IBAN")
      }

      return PaymentMethodCreateParams.create(
        sepaDebit = PaymentMethodCreateParams.SepaDebit(iban),
        billingDetails = it
      )
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createOXXOParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createOxxo(it)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createGiropayParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createGiropay(it)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createEPSParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createEps(it)
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
      return PaymentMethodCreateParams.createP24(it)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createFpxParams(): PaymentMethodCreateParams {
    val bank = getBooleanOrFalse(paymentMethodData, "testOfflineBank").let { "test_offline_bank" }
    return PaymentMethodCreateParams.create(
      PaymentMethodCreateParams.Fpx(bank)
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAfterpayClearpayParams(): PaymentMethodCreateParams {
    billingDetailsParams?.let {
      return PaymentMethodCreateParams.createAfterpayClearpay(it)
    }

    throw PaymentMethodCreateParamsException("You must provide billing details")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAuBecsDebitParams(): PaymentMethodCreateParams {

  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createKlarnaParams(): PaymentMethodCreateParams {

  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createPayPalParams(): PaymentMethodCreateParams {

  }

  @Throws(PaymentMethodCreateParamsException::class)
  fun createConfirmParams(paymentMethodType: PaymentMethod.Type): ConfirmPaymentIntentParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardPaymentConfirmParams()
        PaymentMethod.Type.Ideal -> createIDEALPaymentConfirmParams()
        PaymentMethod.Type.Alipay -> createAlipayPaymentConfirmParams()
        PaymentMethod.Type.Sofort -> createSofortPaymentConfirmParams()
        PaymentMethod.Type.Bancontact -> createBancontactPaymentConfirmParams()
        PaymentMethod.Type.SepaDebit -> createSepaPaymentConfirmParams()
        PaymentMethod.Type.Oxxo -> createOXXOPaymentConfirmParams()
        PaymentMethod.Type.Giropay -> createGiropayPaymentConfirmParams()
        PaymentMethod.Type.Eps -> createEPSPaymentConfirmParams()
        PaymentMethod.Type.GrabPay -> createGrabPayPaymentConfirmParams()
        PaymentMethod.Type.P24 -> createP24PaymentConfirmParams()
        PaymentMethod.Type.Fpx -> createFpxPaymentConfirmParams()
        PaymentMethod.Type.AfterpayClearpay -> createAfterpayClearpayPaymentConfirmParams()
        PaymentMethod.Type.AuBecsDebit -> createAuBecsDebitPaymentConfirmParams()
        PaymentMethod.Type.Klarna -> createKlarnaPaymentConfirmParams()
        PaymentMethod.Type.USBankAccount -> createUSBankAccountPaymentConfirmParams()
        PaymentMethod.Type.PayPal -> createPayPalPaymentConfirmParams()
        else -> {
          throw Exception("This paymentMethodType is not supported yet")
        }
      }
    } catch (error: PaymentMethodCreateParamsException) {
      throw error
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  fun createSetupParams(paymentMethodType: PaymentMethod.Type): ConfirmSetupIntentParams {
    try {
      return when (paymentMethodType) {
        PaymentMethod.Type.Card -> createCardPaymentSetupParams()
        PaymentMethod.Type.Ideal -> createIDEALPaymentSetupParams()
        PaymentMethod.Type.Sofort -> createSofortPaymentSetupParams()
        PaymentMethod.Type.Bancontact -> createBancontactPaymentSetupParams()
        PaymentMethod.Type.SepaDebit -> createSepaPaymentSetupParams()
        PaymentMethod.Type.AuBecsDebit -> createAuBecsDebitPaymentSetupParams()
        PaymentMethod.Type.USBankAccount -> createUSBankAccountPaymentSetupParams()
        PaymentMethod.Type.PayPal -> createPayPalPaymentSetupParams()
        else -> {
          throw Exception("This paymentMethodType is not supported yet")
        }
      }
    } catch (error: PaymentMethodCreateParamsException) {
      throw error
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createIDEALPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val createParams = createIDEALParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = createParams,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createP24PaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createP24Params()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
      )
 }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createCardParams(): PaymentMethodCreateParams {
    val paymentMethodId = getValOr(paymentMethodData, "paymentMethodId", null)
    val token = getValOr(paymentMethodData, "token", null)

    val cardParams = cardFieldView?.cardParams ?: cardFormView?.cardParams

    if (cardParams == null && paymentMethodId == null && token == null) {
      throw PaymentMethodCreateParamsException("Card details not complete")
    }

    var card = cardParams
    if (token != null) {
      card = PaymentMethodCreateParams.Card.create(token)
    }

    return PaymentMethodCreateParams.create(card!!, billingDetailsParams)
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createCardPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val paymentMethodId = getValOr(paymentMethodData, "paymentMethodId", null)
    val paymentMethodCreateParams = createCardParams()

    val setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))

    if (paymentMethodId != null) {
      val cvc = getValOr(paymentMethodData, "cvc", null)
      val paymentMethodOptionParams =
        if (cvc != null) PaymentMethodOptionsParams.Card(cvc) else null

      return ConfirmPaymentIntentParams.createWithPaymentMethodId(
        paymentMethodId,
        paymentMethodOptions = paymentMethodOptionParams,
        clientSecret = clientSecret,
        setupFutureUsage = setupFutureUsage,
      )
    } else {
      return ConfirmPaymentIntentParams
        .createWithPaymentMethodCreateParams(
          paymentMethodCreateParams,
          clientSecret,
          setupFutureUsage = setupFutureUsage,
        )
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createIDEALPaymentSetupParams(): ConfirmSetupIntentParams {
    val createParams = createIDEALParams()

    return ConfirmSetupIntentParams.create(
      paymentMethodCreateParams = createParams,
      clientSecret = clientSecret,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSepaPaymentSetupParams(): ConfirmSetupIntentParams {
    val params = createSepaParams()

    return ConfirmSetupIntentParams.create(
      paymentMethodCreateParams = params,
      clientSecret = clientSecret
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createCardPaymentSetupParams(): ConfirmSetupIntentParams {
    val paymentMethodId = getValOr(paymentMethodData, "paymentMethodId", null)
    val paymentMethodCreateParams = createCardParams()

    if (paymentMethodId != null) {
      return ConfirmSetupIntentParams.create(
        paymentMethodId,
        clientSecret
      )
    }

    return ConfirmSetupIntentParams
      .create(paymentMethodCreateParams, clientSecret)
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAlipayPaymentConfirmParams(): ConfirmPaymentIntentParams {
    return ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(createAlipayParams(), clientSecret)
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSofortPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createSofortParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSofortPaymentSetupParams(): ConfirmSetupIntentParams {
    val params = createSofortParams()

    return ConfirmSetupIntentParams.create(
      paymentMethodCreateParams = params,
      clientSecret = clientSecret,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createGrabPayPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createGrabPayParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createBancontactPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createBancontactParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage")),
      )
  }

  private fun createBancontactPaymentSetupParams(): ConfirmSetupIntentParams {
    val params = createBancontactParams()

    return ConfirmSetupIntentParams
      .create(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createOXXOPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createOXXOParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createEPSPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createEPSParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createGiropayPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createGiropayParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createSepaPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createSepaParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createFpxPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createFpxParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAfterpayClearpayPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val params = createAfterpayClearpayParams()

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAuBecsDebitPaymentConfirmParams(): ConfirmPaymentIntentParams {
    val formDetails = getMapOrNull(paymentMethodData, "formDetails") ?: run {
      throw PaymentMethodCreateParamsException("You must provide form details")
    }

    val bsbNumber = getValOr(formDetails, "bsbNumber") as String
    val accountNumber = getValOr(formDetails, "accountNumber") as String
    val name = getValOr(formDetails, "name") as String
    val email = getValOr(formDetails, "email") as String

    val billingDetails = PaymentMethod.BillingDetails.Builder()
      .setName(name)
      .setEmail(email)
      .build()

    val params = PaymentMethodCreateParams.create(
      auBecsDebit = PaymentMethodCreateParams.AuBecsDebit(
        bsbNumber = bsbNumber,
        accountNumber = accountNumber
      ),
      billingDetails = billingDetails
    )

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createAuBecsDebitPaymentSetupParams(): ConfirmSetupIntentParams {
    val formDetails = getMapOrNull(paymentMethodData, "formDetails") ?: run {
      throw PaymentMethodCreateParamsException("You must provide form details")
    }

    val bsbNumber = getValOr(formDetails, "bsbNumber") as String
    val accountNumber = getValOr(formDetails, "accountNumber") as String
    val name = getValOr(formDetails, "name") as String
    val email = getValOr(formDetails, "email") as String

    val billingDetails = PaymentMethod.BillingDetails.Builder()
      .setName(name)
      .setEmail(email)
      .build()

    val params = PaymentMethodCreateParams.create(
      auBecsDebit = PaymentMethodCreateParams.AuBecsDebit(
        bsbNumber = bsbNumber,
        accountNumber = accountNumber
      ),
      billingDetails = billingDetails
    )

    return ConfirmSetupIntentParams
      .create(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createUSBankAccountPaymentSetupParams(): ConfirmSetupIntentParams {
    // If payment method data is supplied, assume they are passing in the bank details manually
    paymentMethodData?.let {
      if (billingDetailsParams?.name.isNullOrBlank()) {
        throw PaymentMethodCreateParamsException("When creating a US bank account payment method, you must provide the following billing details: name")
      }
      return ConfirmSetupIntentParams.create(
        paymentMethodCreateParams = createUSBankAccountParams(paymentMethodData),
        clientSecret = clientSecret,
      )
    } ?: run {
      // Payment method is assumed to be already attached through via collectBankAccount
      return ConfirmSetupIntentParams.create(
        clientSecret = clientSecret,
        paymentMethodType = PaymentMethod.Type.USBankAccount
      )
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createPayPalPaymentSetupParams(): ConfirmSetupIntentParams {
    throw PaymentMethodCreateParamsException("PayPal is not yet supported through SetupIntents.")
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createKlarnaPaymentConfirmParams(): ConfirmPaymentIntentParams {
    if (billingDetailsParams == null ||
      billingDetailsParams.address?.country.isNullOrBlank() ||
      billingDetailsParams.email.isNullOrBlank()
    ) {
      throw PaymentMethodCreateParamsException("Klarna requires that you provide the following billing details: email, country")
    }

    val params = PaymentMethodCreateParams.createKlarna(billingDetailsParams)

    return ConfirmPaymentIntentParams
      .createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = params,
        clientSecret = clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createUSBankAccountPaymentConfirmParams(): ConfirmPaymentIntentParams {
    // If payment method data is supplied, assume they are passing in the bank details manually
    paymentMethodData?.let {
      if (billingDetailsParams?.name.isNullOrBlank()) {
        throw PaymentMethodCreateParamsException("When creating a US bank account payment method, you must provide the following billing details: name")
      }

      return ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(
        paymentMethodCreateParams = createUSBankAccountParams(paymentMethodData),
        clientSecret,
        setupFutureUsage = mapToPaymentIntentFutureUsage(getValOr(options, "setupFutureUsage"))
      )
    } ?: run {
      // Payment method is assumed to be already attached through via collectBankAccount
      return ConfirmPaymentIntentParams.create(
        clientSecret = clientSecret,
        paymentMethodType = PaymentMethod.Type.USBankAccount
      )
    }
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createPayPalPaymentConfirmParams(): ConfirmPaymentIntentParams {
    return ConfirmPaymentIntentParams.createWithPaymentMethodCreateParams(
      paymentMethodCreateParams = PaymentMethodCreateParams.createPayPal(null),
      clientSecret = clientSecret,
    )
  }

  @Throws(PaymentMethodCreateParamsException::class)
  private fun createUSBankAccountParams(params: ReadableMap): PaymentMethodCreateParams {
    val accountNumber = getValOr(params, "accountNumber", null)
    val routingNumber = getValOr(params, "routingNumber", null)

    if (accountNumber.isNullOrBlank()) {
      throw PaymentMethodCreateParamsException("When creating a US bank account payment method, you must provide the bank account number")
    } else if (routingNumber.isNullOrBlank()) {
      throw PaymentMethodCreateParamsException("When creating a US bank account payment method, you must provide the bank routing number")
    }

    val usBankAccount = PaymentMethodCreateParams.USBankAccount(
      accountNumber,
      routingNumber,
      mapToUSBankAccountType(
        getValOr(
          params,
          "accountType",
          null)),
      mapToUSBankAccountHolderType(
        getValOr(
          params,
          "accountHolderType",
          null))
    )

    return PaymentMethodCreateParams.Companion.create(
      usBankAccount,
      billingDetailsParams,
      null
    )
  }
}

class PaymentMethodCreateParamsException(message: String) : Exception(message)
