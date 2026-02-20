package com.reactnativestripesdk.utils

import android.annotation.SuppressLint
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.financialconnections.analytics.FinancialConnectionsEvent
import com.stripe.android.model.Address
import com.stripe.android.model.BankAccount
import com.stripe.android.model.BankAccountTokenParams
import com.stripe.android.model.Card
import com.stripe.android.model.CardBrand
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.ConfirmationToken
import com.stripe.android.model.GooglePayResult
import com.stripe.android.model.MicrodepositType
import com.stripe.android.model.PaymentIntent
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.SetupIntent
import com.stripe.android.model.StripeIntent
import com.stripe.android.model.StripeIntent.NextActionData
import com.stripe.android.model.StripeIntent.NextActionType
import com.stripe.android.model.Token
import com.stripe.android.paymentsheet.PaymentSheet
import java.lang.IllegalArgumentException

internal fun createEmptyResult(): WritableMap = WritableNativeMap()

internal fun createResult(
  key: String,
  value: WritableMap,
  additionalFields: Map<String, Any>? = null,
): WritableMap {
  val map = Arguments.createMap()
  map.putMap(key, value)
  additionalFields?.let { map.merge(it.toReadableMap()) }
  return map
}

internal fun createCanAddCardResult(
  canAddCard: Boolean,
  status: String? = null,
  token: WritableMap? = null,
): WritableMap {
  val result = Arguments.createMap()
  val details = Arguments.createMap()
  result.putBoolean("canAddCard", canAddCard)
  if (status != null) {
    details.putString("status", status)
  }
  if (token != null) {
    details.putMap("token", token)
  }
  result.putMap("details", details)
  return result
}

internal fun mapIntentStatus(status: StripeIntent.Status?): String =
  when (status) {
    StripeIntent.Status.Succeeded -> "Succeeded"
    StripeIntent.Status.RequiresPaymentMethod -> "RequiresPaymentMethod"
    StripeIntent.Status.RequiresConfirmation -> "RequiresConfirmation"
    StripeIntent.Status.Canceled -> "Canceled"
    StripeIntent.Status.Processing -> "Processing"
    StripeIntent.Status.RequiresAction -> "RequiresAction"
    StripeIntent.Status.RequiresCapture -> "RequiresCapture"
    else -> "Unknown"
  }

internal fun mapCaptureMethod(captureMethod: PaymentIntent.CaptureMethod?): String =
  when (captureMethod) {
    PaymentIntent.CaptureMethod.Automatic -> "Automatic"
    PaymentIntent.CaptureMethod.Manual -> "Manual"
    else -> "Unknown"
  }

internal fun mapConfirmationMethod(captureMethod: PaymentIntent.ConfirmationMethod?): String =
  when (captureMethod) {
    PaymentIntent.ConfirmationMethod.Automatic -> "Automatic"
    PaymentIntent.ConfirmationMethod.Manual -> "Manual"
    else -> "Unknown"
  }

internal fun mapToReturnURL(urlScheme: String?): String? {
  if (urlScheme != null) {
    return "$urlScheme://safepay"
  }
  return null
}

internal fun mapIntentShipping(shipping: PaymentIntent.Shipping): WritableMap {
  val map: WritableMap = Arguments.createMap()
  val address: WritableMap = Arguments.createMap()

  address.putString("city", shipping.address.city)
  address.putString("country", shipping.address.country)
  address.putString("line1", shipping.address.line1)
  address.putString("line2", shipping.address.line2)
  address.putString("postalCode", shipping.address.postalCode)
  address.putString("state", shipping.address.state)
  map.putMap("address", address)
  map.putString("name", shipping.name)
  map.putString("carrier", shipping.carrier)
  map.putString("phone", shipping.phone)
  map.putString("trackingNumber", shipping.trackingNumber)

  return map
}

internal fun mapCardBrand(brand: CardBrand?): String =
  when (brand) {
    CardBrand.AmericanExpress -> "AmericanExpress"
    CardBrand.DinersClub -> "DinersClub"
    CardBrand.Discover -> "Discover"
    CardBrand.JCB -> "JCB"
    CardBrand.MasterCard -> "MasterCard"
    CardBrand.UnionPay -> "UnionPay"
    CardBrand.Visa -> "Visa"
    CardBrand.Unknown -> "Unknown"
    else -> "Unknown"
  }

internal fun mapPaymentMethodType(type: PaymentMethod.Type?): String =
  when (type) {
    PaymentMethod.Type.AfterpayClearpay -> "AfterpayClearpay"
    PaymentMethod.Type.Alipay -> "Alipay"
    PaymentMethod.Type.Alma -> "Alma"
    PaymentMethod.Type.AuBecsDebit -> "AuBecsDebit"
    PaymentMethod.Type.BacsDebit -> "BacsDebit"
    PaymentMethod.Type.Bancontact -> "Bancontact"
    PaymentMethod.Type.Billie -> "Billie"
    PaymentMethod.Type.Card -> "Card"
    PaymentMethod.Type.CardPresent -> "CardPresent"
    PaymentMethod.Type.Eps -> "Eps"
    PaymentMethod.Type.Fpx -> "Fpx"
    PaymentMethod.Type.GrabPay -> "GrabPay"
    PaymentMethod.Type.Ideal -> "Ideal"
    PaymentMethod.Type.Netbanking -> "Netbanking"
    PaymentMethod.Type.Oxxo -> "Oxxo"
    PaymentMethod.Type.P24 -> "P24"
    PaymentMethod.Type.SepaDebit -> "SepaDebit"
    PaymentMethod.Type.Upi -> "Upi"
    PaymentMethod.Type.WeChatPay -> "WeChatPay"
    PaymentMethod.Type.Klarna -> "Klarna"
    PaymentMethod.Type.USBankAccount -> "USBankAccount"
    PaymentMethod.Type.PayPal -> "PayPal"
    PaymentMethod.Type.Affirm -> "Affirm"
    PaymentMethod.Type.CashAppPay -> "CashApp"
    PaymentMethod.Type.RevolutPay -> "RevolutPay"
    PaymentMethod.Type.Link -> "Link"
    else -> "Unknown"
  }

internal fun mapToPaymentMethodType(type: String?): PaymentMethod.Type? =
  when (type) {
    "Card" -> PaymentMethod.Type.Card
    "Ideal" -> PaymentMethod.Type.Ideal
    "Alipay" -> PaymentMethod.Type.Alipay
    "Alma" -> PaymentMethod.Type.Alma
    "AuBecsDebit" -> PaymentMethod.Type.AuBecsDebit
    "BacsDebit" -> PaymentMethod.Type.BacsDebit
    "Bancontact" -> PaymentMethod.Type.Bancontact
    "Billie" -> PaymentMethod.Type.Billie
    "AfterpayClearpay" -> PaymentMethod.Type.AfterpayClearpay
    "CardPresent" -> PaymentMethod.Type.CardPresent
    "Eps" -> PaymentMethod.Type.Eps
    "Fpx" -> PaymentMethod.Type.Fpx
    "GrabPay" -> PaymentMethod.Type.GrabPay
    "Netbanking" -> PaymentMethod.Type.Netbanking
    "Oxxo" -> PaymentMethod.Type.Oxxo
    "P24" -> PaymentMethod.Type.P24
    "SepaDebit" -> PaymentMethod.Type.SepaDebit
    "Upi" -> PaymentMethod.Type.Upi
    "WeChatPay" -> PaymentMethod.Type.WeChatPay
    "Klarna" -> PaymentMethod.Type.Klarna
    "USBankAccount" -> PaymentMethod.Type.USBankAccount
    "PayPal" -> PaymentMethod.Type.PayPal
    "Affirm" -> PaymentMethod.Type.Affirm
    "CashApp" -> PaymentMethod.Type.CashAppPay
    "RevolutPay" -> PaymentMethod.Type.RevolutPay
    "Link" -> PaymentMethod.Type.Link
    else -> null
  }

internal fun mapFromBillingDetails(billingDatails: PaymentMethod.BillingDetails?): WritableMap {
  val details: WritableMap = Arguments.createMap()
  val address: WritableMap = Arguments.createMap()

  address.putString("country", billingDatails?.address?.country)
  address.putString("city", billingDatails?.address?.city)
  address.putString("line1", billingDatails?.address?.line1)
  address.putString("line2", billingDatails?.address?.line2)
  address.putString("postalCode", billingDatails?.address?.postalCode)
  address.putString("state", billingDatails?.address?.state)

  details.putString("email", billingDatails?.email)
  details.putString("phone", billingDatails?.phone)
  details.putString("name", billingDatails?.name)
  details.putMap("address", address)

  return details
}

internal fun mapFromPaymentSheetBillingDetails(billing: com.stripe.android.paymentsheet.PaymentSheet.BillingDetails?): WritableMap {
  val details = Arguments.createMap()
  details.putString("name", billing?.name)
  details.putString("email", billing?.email)
  details.putString("phone", billing?.phone)

  // map the nested address
  val addrMap = Arguments.createMap()
  billing?.address?.let { a ->
    addrMap.putString("city", a.city)
    addrMap.putString("country", a.country)
    addrMap.putString("line1", a.line1)
    addrMap.putString("line2", a.line2)
    addrMap.putString("postalCode", a.postalCode)
    addrMap.putString("state", a.state)
  }
  details.putMap("address", addrMap)

  return details
}

internal fun mapTokenType(type: Token.Type): String =
  when (type) {
    Token.Type.Account -> "Account"
    Token.Type.BankAccount -> "BankAccount"
    Token.Type.Card -> "Card"
    Token.Type.CvcUpdate -> "CvcUpdate"
    Token.Type.Person -> "Person"
    Token.Type.Pii -> "Pii"
  }

internal fun mapFromBankAccountType(type: BankAccount.Type?): String =
  when (type) {
    BankAccount.Type.Company -> "Company"
    BankAccount.Type.Individual -> "Individual"
    else -> "Unknown"
  }

internal fun mapToBankAccountType(type: String?): BankAccountTokenParams.Type =
  when (type) {
    "Company" -> BankAccountTokenParams.Type.Company
    "Individual" -> BankAccountTokenParams.Type.Individual
    else -> BankAccountTokenParams.Type.Individual
  }

internal fun mapFromBankAccountStatus(status: BankAccount.Status?): String =
  when (status) {
    BankAccount.Status.Errored -> "Errored"
    BankAccount.Status.New -> "New"
    BankAccount.Status.Validated -> "Validated"
    BankAccount.Status.VerificationFailed -> "VerificationFailed"
    BankAccount.Status.Verified -> "Verified"
    else -> "Unknown"
  }

internal fun mapFromBankAccount(bankAccount: BankAccount?): WritableMap? {
  if (bankAccount == null) {
    return null
  }

  val bankAccountMap: WritableMap = Arguments.createMap()
  bankAccountMap.putString("id", bankAccount.id)
  bankAccountMap.putString("bankName", bankAccount.bankName)
  bankAccountMap.putString("accountHolderName", bankAccount.accountHolderName)
  bankAccountMap.putString(
    "accountHolderType",
    mapFromBankAccountType(bankAccount.accountHolderType),
  )
  bankAccountMap.putString("currency", bankAccount.currency)
  bankAccountMap.putString("country", bankAccount.countryCode)
  bankAccountMap.putString("routingNumber", bankAccount.routingNumber)
  bankAccountMap.putString("status", mapFromBankAccountStatus(bankAccount.status))
  bankAccountMap.putString("fingerprint", bankAccount.fingerprint)
  bankAccountMap.putString("last4", bankAccount.last4)

  return bankAccountMap
}

internal fun mapToUSBankAccountHolderType(type: String?): PaymentMethod.USBankAccount.USBankAccountHolderType =
  when (type) {
    "Company" -> PaymentMethod.USBankAccount.USBankAccountHolderType.COMPANY
    "Individual" -> PaymentMethod.USBankAccount.USBankAccountHolderType.INDIVIDUAL
    else -> PaymentMethod.USBankAccount.USBankAccountHolderType.INDIVIDUAL
  }

internal fun mapFromUSBankAccountHolderType(type: PaymentMethod.USBankAccount.USBankAccountHolderType?): String =
  when (type) {
    PaymentMethod.USBankAccount.USBankAccountHolderType.COMPANY -> "Company"
    PaymentMethod.USBankAccount.USBankAccountHolderType.INDIVIDUAL -> "Individual"
    else -> "Unknown"
  }

internal fun mapToUSBankAccountType(type: String?): PaymentMethod.USBankAccount.USBankAccountType =
  when (type) {
    "Savings" -> PaymentMethod.USBankAccount.USBankAccountType.SAVINGS
    "Checking" -> PaymentMethod.USBankAccount.USBankAccountType.CHECKING
    else -> PaymentMethod.USBankAccount.USBankAccountType.CHECKING
  }

internal fun mapFromUSBankAccountType(type: PaymentMethod.USBankAccount.USBankAccountType?): String =
  when (type) {
    PaymentMethod.USBankAccount.USBankAccountType.CHECKING -> "Checking"
    PaymentMethod.USBankAccount.USBankAccountType.SAVINGS -> "Savings"
    else -> "Unknown"
  }

internal fun mapFromCard(card: Card?): WritableMap? {
  val cardMap: WritableMap = Arguments.createMap()

  if (card == null) {
    return null
  }

  val address: WritableMap = Arguments.createMap()

  cardMap.putString("country", card.country)
  cardMap.putString("brand", mapCardBrand(card.brand))
  cardMap.putString("currency", card.currency)

  (card.expMonth)?.let { cardMap.putInt("expMonth", it) } ?: run { cardMap.putNull("expMonth") }

  (card.expYear)?.let { cardMap.putInt("expYear", it) } ?: run { cardMap.putNull("expYear") }

  cardMap.putString("id", card.id)
  cardMap.putString("last4", card.last4)
  cardMap.putString("funding", card.funding?.name)
  cardMap.putString("name", card.name)

  address.putString("city", card.addressCity)
  address.putString("country", card.addressCountry)
  address.putString("line1", card.addressLine1)
  address.putString("line2", card.addressLine2)
  address.putString("state", card.addressState)
  address.putString("postalCode", card.addressZip)

  cardMap.putMap("address", address)

  return cardMap
}

internal fun mapFromToken(token: Token): WritableMap {
  val tokenMap: WritableMap = Arguments.createMap()
  tokenMap.putString("id", token.id)
  tokenMap.putString("created", token.created.time.toString())
  tokenMap.putString("type", mapTokenType(token.type))
  tokenMap.putBoolean("livemode", token.livemode)
  tokenMap.putMap("bankAccount", mapFromBankAccount(token.bankAccount))
  tokenMap.putMap("card", mapFromCard(token.card))
  tokenMap.putBoolean("used", token.used)

  return tokenMap
}

internal fun mapFromPaymentMethod(paymentMethod: PaymentMethod): WritableMap {
  val pm: WritableMap = Arguments.createMap()

  pm.putString("id", paymentMethod.id)
  pm.putString("paymentMethodType", mapPaymentMethodType(paymentMethod.type))
  pm.putBoolean("livemode", paymentMethod.liveMode)
  pm.putString("customerId", paymentMethod.customerId)
  pm.putMap("billingDetails", mapFromBillingDetails(paymentMethod.billingDetails))
  pm.putMap(
    "Card",
    Arguments.createMap().also {
      it.putString("brand", mapCardBrand(paymentMethod.card?.brand))
      it.putString("country", paymentMethod.card?.country)
      paymentMethod.card?.expiryYear?.let { year -> it.putInt("expYear", year) }
      paymentMethod.card?.expiryMonth?.let { month -> it.putInt("expMonth", month) }
      it.putString("funding", paymentMethod.card?.funding)
      it.putString("last4", paymentMethod.card?.last4)
      it.putString("fingerprint", paymentMethod.card?.fingerprint)
      it.putString("preferredNetwork", paymentMethod.card?.networks?.preferred)
      it.putArray(
        "availableNetworks",
        paymentMethod.card
          ?.networks
          ?.available
          ?.toList() as? ReadableArray,
      )
      it.putMap(
        "threeDSecureUsage",
        Arguments.createMap().also { threeDSecureUsageMap ->
          threeDSecureUsageMap.putBoolean(
            "isSupported",
            paymentMethod.card?.threeDSecureUsage?.isSupported ?: false,
          )
        },
      )
    },
  )
  pm.putMap(
    "SepaDebit",
    Arguments.createMap().also {
      it.putString("bankCode", paymentMethod.sepaDebit?.bankCode)
      it.putString("country", paymentMethod.sepaDebit?.country)
      it.putString("fingerprint", paymentMethod.sepaDebit?.fingerprint)
      it.putString("last4", paymentMethod.sepaDebit?.branchCode)
    },
  )
  pm.putMap(
    "BacsDebit",
    Arguments.createMap().also {
      it.putString("fingerprint", paymentMethod.bacsDebit?.fingerprint)
      it.putString("last4", paymentMethod.bacsDebit?.last4)
      it.putString("sortCode", paymentMethod.bacsDebit?.sortCode)
    },
  )
  pm.putMap(
    "AuBecsDebit",
    Arguments.createMap().also {
      it.putString("bsbNumber", paymentMethod.bacsDebit?.sortCode)
      it.putString("fingerprint", paymentMethod.bacsDebit?.fingerprint)
      it.putString("last4", paymentMethod.bacsDebit?.last4)
    },
  )
  pm.putMap(
    "Ideal",
    Arguments.createMap().also {
      it.putString("bankName", paymentMethod.ideal?.bank)
      it.putString("bankIdentifierCode", paymentMethod.ideal?.bankIdentifierCode)
    },
  )
  pm.putMap(
    "Fpx",
    Arguments.createMap().also {
      it.putString("accountHolderType", paymentMethod.fpx?.accountHolderType)
      it.putString("bank", paymentMethod.fpx?.bank)
    },
  )
  pm.putMap("Upi", Arguments.createMap().also { it.putString("vpa", paymentMethod.upi?.vpa) })
  pm.putMap(
    "USBankAccount",
    Arguments.createMap().also {
      it.putString("routingNumber", paymentMethod.usBankAccount?.routingNumber)
      it.putString(
        "accountType",
        mapFromUSBankAccountType(paymentMethod.usBankAccount?.accountType),
      )
      it.putString(
        "accountHolderType",
        mapFromUSBankAccountHolderType(paymentMethod.usBankAccount?.accountHolderType),
      )
      it.putString("last4", paymentMethod.usBankAccount?.last4)
      it.putString("bankName", paymentMethod.usBankAccount?.bankName)
      it.putString("linkedAccount", paymentMethod.usBankAccount?.financialConnectionsAccount)
      it.putString("fingerprint", paymentMethod.usBankAccount?.fingerprint)
      it.putString("preferredNetworks", paymentMethod.usBankAccount?.networks?.preferred)
      it.putArray(
        "supportedNetworks",
        paymentMethod.usBankAccount?.networks?.supported as? ReadableArray,
      )
    },
  )

  return pm
}

internal fun mapFromPaymentIntentResult(paymentIntent: PaymentIntent): WritableMap {
  val map: WritableMap = Arguments.createMap()
  map.putString("id", paymentIntent.id)
  map.putString("clientSecret", paymentIntent.clientSecret)
  map.putBoolean("livemode", paymentIntent.isLiveMode)
  map.putString("paymentMethodId", paymentIntent.paymentMethodId)
  map.putMap(
    "paymentMethod",
    paymentIntent.paymentMethod?.let { mapFromPaymentMethod(it) } ?: run { null },
  )
  map.putString("receiptEmail", paymentIntent.receiptEmail)
  map.putString("currency", paymentIntent.currency)
  map.putString("status", mapIntentStatus(paymentIntent.status))
  map.putString("description", paymentIntent.description)
  map.putString("receiptEmail", paymentIntent.receiptEmail)
  map.putString("created", convertToUnixTimestamp(paymentIntent.created))
  map.putString("captureMethod", mapCaptureMethod(paymentIntent.captureMethod))
  map.putString("confirmationMethod", mapConfirmationMethod(paymentIntent.confirmationMethod))
  map.putMap(
    "nextAction",
    mapNextAction(paymentIntent.nextActionType, paymentIntent.nextActionData),
  )
  map.putNull("lastPaymentError")
  map.putNull("shipping")
  map.putNull("amount")
  map.putNull("canceledAt")

  paymentIntent.lastPaymentError?.let {
    val paymentError: WritableMap = Arguments.createMap()
    paymentError.putString("code", it.code)
    paymentError.putString("message", it.message)
    paymentError.putString("type", mapFromPaymentIntentLastErrorType(it.type))
    paymentError.putString("declineCode", it.declineCode)
    paymentIntent.lastPaymentError?.paymentMethod?.let { paymentMethod ->
      paymentError.putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
    }

    map.putMap("lastPaymentError", paymentError)
  }

  paymentIntent.shipping?.let { map.putMap("shipping", mapIntentShipping(it)) }

  paymentIntent.amount?.let { map.putDouble("amount", it.toDouble()) }
  map.putString("canceledAt", convertToUnixTimestamp(paymentIntent.canceledAt))
  return map
}

@SuppressLint("RestrictedApi")
internal fun mapFromMicrodepositType(type: MicrodepositType): String =
  when (type) {
    MicrodepositType.AMOUNTS -> "amounts"
    MicrodepositType.DESCRIPTOR_CODE -> "descriptorCode"
    else -> "unknown"
  }

@SuppressLint("RestrictedApi")
internal fun mapNextAction(
  type: NextActionType?,
  data: NextActionData?,
): WritableMap? {
  val nextActionMap = Arguments.createMap()
  when (type) {
    NextActionType.RedirectToUrl -> {
      (data as? NextActionData.RedirectToUrl)?.let {
        nextActionMap.putString("type", "urlRedirect")
        nextActionMap.putString("redirectUrl", it.url.toString())
      }
    }
    NextActionType.VerifyWithMicrodeposits -> {
      (data as? NextActionData.VerifyWithMicrodeposits)?.let {
        nextActionMap.putString("type", "verifyWithMicrodeposits")
        nextActionMap.putString("arrivalDate", it.arrivalDate.toString())
        nextActionMap.putString("redirectUrl", it.hostedVerificationUrl)
        nextActionMap.putString("microdepositType", mapFromMicrodepositType(it.microdepositType))
      }
    }
    NextActionType.DisplayOxxoDetails -> {
      (data as? NextActionData.DisplayOxxoDetails)?.let {
        nextActionMap.putString("type", "oxxoVoucher")
        nextActionMap.putInt("expiration", it.expiresAfter)
        nextActionMap.putString("voucherURL", it.hostedVoucherUrl)
        nextActionMap.putString("voucherNumber", it.number)
      }
    }
    NextActionType.WeChatPayRedirect -> {
      (data as? NextActionData.WeChatPayRedirect)?.let {
        nextActionMap.putString("type", "weChatRedirect")
        nextActionMap.putString("redirectUrl", it.weChat.qrCodeUrl)
      }
    }
    NextActionType.AlipayRedirect -> { // TODO: Can't access, private
      return null
    }
    NextActionType.CashAppRedirect,
    NextActionType.BlikAuthorize,
    NextActionType.UseStripeSdk,
    NextActionType.UpiAwaitNotification,
    NextActionType.DisplayPayNowDetails,
    NextActionType.DisplayPromptPayDetails,
    null,
    -> {
      return null
    }
    NextActionType.DisplayBoletoDetails -> {
      (data as? NextActionData.DisplayBoletoDetails)?.let {
        nextActionMap.putString("type", "boletoVoucher")
        nextActionMap.putString("voucherURL", it.hostedVoucherUrl)
      }
    }
    NextActionType.DisplayKonbiniDetails -> {
      (data as? NextActionData.DisplayKonbiniDetails)?.let {
        nextActionMap.putString("type", "konbiniVoucher")
        nextActionMap.putString("voucherURL", it.hostedVoucherUrl)
      }
    }
    NextActionType.SwishRedirect -> {
      (data as? NextActionData.SwishRedirect)?.let {
        nextActionMap.putString("type", "swishRedirect")
        nextActionMap.putString("mobileAuthUrl", it.mobileAuthUrl)
      }
    }
    NextActionType.DisplayMultibancoDetails -> {
      (data as? NextActionData.DisplayMultibancoDetails)?.let {
        nextActionMap.putString("type", "multibanco")
        nextActionMap.putString("voucherURL", it.hostedVoucherUrl)
      }
    }
    NextActionType.DisplayPayNowDetails -> {
      (data as? NextActionData.DisplayPayNowDetails)?.let {
        nextActionMap.putString("type", "paynow")
        nextActionMap.putString("qrCodeUrl", it.qrCodeUrl)
      }
    }
  }
  return nextActionMap
}

internal fun mapFromPaymentIntentLastErrorType(errorType: PaymentIntent.Error.Type?): String? =
  when (errorType) {
    PaymentIntent.Error.Type.ApiConnectionError -> "api_connection_error"
    PaymentIntent.Error.Type.AuthenticationError -> "authentication_error"
    PaymentIntent.Error.Type.ApiError -> "api_error"
    PaymentIntent.Error.Type.CardError -> "card_error"
    PaymentIntent.Error.Type.IdempotencyError -> "idempotency_error"
    PaymentIntent.Error.Type.InvalidRequestError -> "invalid_request_error"
    PaymentIntent.Error.Type.RateLimitError -> "rate_limit_error"
    else -> null
  }

internal fun mapFromSetupIntentLastErrorType(errorType: SetupIntent.Error.Type?): String? =
  when (errorType) {
    SetupIntent.Error.Type.ApiConnectionError -> "api_connection_error"
    SetupIntent.Error.Type.AuthenticationError -> "authentication_error"
    SetupIntent.Error.Type.ApiError -> "api_error"
    SetupIntent.Error.Type.CardError -> "card_error"
    SetupIntent.Error.Type.IdempotencyError -> "idempotency_error"
    SetupIntent.Error.Type.InvalidRequestError -> "invalid_request_error"
    SetupIntent.Error.Type.RateLimitError -> "rate_limit_error"
    else -> null
  }

fun getValOr(
  map: ReadableMap?,
  key: String,
  default: String? = "",
): String? =
  map?.let {
    if (it.hasKey(key)) it.getString(key) else default
  } ?: default

internal fun mapToAddress(
  addressMap: ReadableMap?,
  cardAddress: Address?,
): Address {
  val address = Address.Builder()

  addressMap?.let {
    address
      .setPostalCode(getValOr(it, "postalCode"))
      .setCity(getValOr(it, "city"))
      .setCountry(getValOr(it, "country"))
      .setLine1(getValOr(it, "line1"))
      .setLine2(getValOr(it, "line2"))
      .setState(getValOr(it, "state"))
  }

  cardAddress?.let {
    if (!it.postalCode.isNullOrEmpty()) {
      address.setPostalCode(it.postalCode)
    }
    if (!it.country.isNullOrEmpty()) {
      address.setCountry(it.country)
    }
  }

  return address.build()
}

internal fun mapToPaymentSheetAddress(addressMap: ReadableMap?): PaymentSheet.Address? {
  if (addressMap == null) {
    return null
  }

  return PaymentSheet.Address(
    city = addressMap.getString("city"),
    country = addressMap.getString("country"),
    line1 = addressMap.getString("line1"),
    line2 = addressMap.getString("line2"),
    postalCode = addressMap.getString("postalCode"),
    state = addressMap.getString("state"),
  )
}

internal fun mapToBillingDetails(
  billingDetails: ReadableMap?,
  cardAddress: Address?,
): PaymentMethod.BillingDetails? {
  if (billingDetails == null && cardAddress == null) {
    return null
  }
  val address = mapToAddress(billingDetails?.getMap("address"), cardAddress)
  val paymentMethodBillingDetailsBuilder = PaymentMethod.BillingDetails.Builder()

  if (billingDetails != null) {
    paymentMethodBillingDetailsBuilder
      .setName(getValOr(billingDetails, "name"))
      .setPhone(getValOr(billingDetails, "phone"))
      .setEmail(getValOr(billingDetails, "email"))
  }

  paymentMethodBillingDetailsBuilder.setAddress(address)
  return paymentMethodBillingDetailsBuilder.build()
}

internal fun mapToMetadata(metadata: ReadableMap?): Map<String, String>? =
  metadata?.toHashMap()?.mapValues {
    it.value.toString()
  }

internal fun mapToShippingDetails(shippingDetails: ReadableMap?): ConfirmPaymentIntentParams.Shipping? {
  if (shippingDetails == null) {
    return null
  }

  val address = mapToAddress(shippingDetails.getMap("address"), null)

  return ConfirmPaymentIntentParams.Shipping(
    name = getValOr(shippingDetails, "name") ?: "",
    address = address,
  )
}

private fun convertToUnixTimestamp(timestamp: Long): String = (timestamp * 1000).toString()

fun mapToUICustomization(params: ReadableMap): PaymentAuthConfig.Stripe3ds2UiCustomization {
  val labelCustomization = params.getMap("label")
  val navigationBarCustomization = params.getMap("navigationBar")
  val textBoxCustomization = params.getMap("textField")
  val submitButtonCustomization = params.getMap("submitButton")
  val cancelButtonCustomization = params.getMap("cancelButton")
  val nextButtonCustomization = params.getMap("nextButton")
  val continueButtonCustomization = params.getMap("continueButton")
  val resendButtonCustomization = params.getMap("resendButton")

  val labelCustomizationBuilder = PaymentAuthConfig.Stripe3ds2LabelCustomization.Builder()
  val toolbarCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ToolbarCustomization.Builder()
  val textBoxCustomizationBuilder = PaymentAuthConfig.Stripe3ds2TextBoxCustomization.Builder()

  val submitButtonCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ButtonCustomization.Builder()
  val cancelButtonCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ButtonCustomization.Builder()
  val nextButtonCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ButtonCustomization.Builder()
  val continueButtonCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ButtonCustomization.Builder()
  val resendButtonCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ButtonCustomization.Builder()

  labelCustomization?.getString("headingTextColor")?.let {
    labelCustomizationBuilder.setHeadingTextColor(it)
  }
  labelCustomization?.getString("textColor")?.let {
    labelCustomizationBuilder.setTextColor(it)
  }
  labelCustomization.getIntOrNull("headingFontSize")?.let {
    labelCustomizationBuilder.setHeadingTextFontSize(it)
  }
  labelCustomization.getIntOrNull("textFontSize")?.let {
    labelCustomizationBuilder.setTextFontSize(it)
  }

  navigationBarCustomization?.getString("headerText")?.let {
    toolbarCustomizationBuilder.setHeaderText(it)
  }
  navigationBarCustomization?.getString("buttonText")?.let {
    toolbarCustomizationBuilder.setButtonText(it)
  }
  navigationBarCustomization?.getString("textColor")?.let {
    toolbarCustomizationBuilder.setTextColor(it)
  }
  navigationBarCustomization?.getString("statusBarColor")?.let {
    toolbarCustomizationBuilder.setStatusBarColor(it)
  }
  navigationBarCustomization?.getString("backgroundColor")?.let {
    toolbarCustomizationBuilder.setBackgroundColor(it)
  }
  navigationBarCustomization.getIntOrNull("textFontSize")?.let {
    toolbarCustomizationBuilder.setTextFontSize(it)
  }

  textBoxCustomization?.getString("borderColor")?.let {
    textBoxCustomizationBuilder.setBorderColor(it)
  }
  textBoxCustomization?.getString("textColor")?.let {
    textBoxCustomizationBuilder.setTextColor(it)
  }
  textBoxCustomization.getIntOrNull("borderWidth")?.let {
    textBoxCustomizationBuilder.setBorderWidth(it)
  }
  textBoxCustomization.getIntOrNull("borderRadius")?.let {
    textBoxCustomizationBuilder.setCornerRadius(it)
  }
  textBoxCustomization.getIntOrNull("textFontSize")?.let {
    textBoxCustomizationBuilder.setTextFontSize(it)
  }

  // Submit button
  submitButtonCustomization?.getString("backgroundColor")?.let {
    submitButtonCustomizationBuilder.setBackgroundColor(it)
  }
  submitButtonCustomization.getIntOrNull("borderRadius")?.let {
    submitButtonCustomizationBuilder.setCornerRadius(it)
  }
  submitButtonCustomization?.getString("textColor")?.let {
    submitButtonCustomizationBuilder.setTextColor(it)
  }
  submitButtonCustomization.getIntOrNull("textFontSize")?.let {
    submitButtonCustomizationBuilder.setTextFontSize(it)
  }

  // Cancel button
  cancelButtonCustomization?.getString("backgroundColor")?.let {
    cancelButtonCustomizationBuilder.setBackgroundColor(it)
  }
  cancelButtonCustomization.getIntOrNull("borderRadius")?.let {
    cancelButtonCustomizationBuilder.setCornerRadius(it)
  }
  cancelButtonCustomization?.getString("textColor")?.let {
    cancelButtonCustomizationBuilder.setTextColor(it)
  }
  cancelButtonCustomization.getIntOrNull("textFontSize")?.let {
    cancelButtonCustomizationBuilder.setTextFontSize(it)
  }

  // Continue button
  continueButtonCustomization?.getString("backgroundColor")?.let {
    continueButtonCustomizationBuilder.setBackgroundColor(it)
  }
  continueButtonCustomization.getIntOrNull("borderRadius")?.let {
    continueButtonCustomizationBuilder.setCornerRadius(it)
  }
  continueButtonCustomization?.getString("textColor")?.let {
    continueButtonCustomizationBuilder.setTextColor(it)
  }
  continueButtonCustomization.getIntOrNull("textFontSize")?.let {
    continueButtonCustomizationBuilder.setTextFontSize(it)
  }

  // Next button
  nextButtonCustomization?.getString("backgroundColor")?.let {
    nextButtonCustomizationBuilder.setBackgroundColor(it)
  }
  nextButtonCustomization.getIntOrNull("borderRadius")?.let {
    nextButtonCustomizationBuilder.setCornerRadius(it)
  }
  nextButtonCustomization?.getString("textColor")?.let {
    nextButtonCustomizationBuilder.setTextColor(it)
  }
  nextButtonCustomization.getIntOrNull("textFontSize")?.let {
    nextButtonCustomizationBuilder.setTextFontSize(it)
  }

  // Resend button
  resendButtonCustomization?.getString("backgroundColor")?.let {
    resendButtonCustomizationBuilder.setBackgroundColor(it)
  }
  resendButtonCustomization.getIntOrNull("borderRadius")?.let {
    resendButtonCustomizationBuilder.setCornerRadius(it)
  }
  resendButtonCustomization?.getString("textColor")?.let {
    resendButtonCustomizationBuilder.setTextColor(it)
  }
  resendButtonCustomization.getIntOrNull("textFontSize")?.let {
    resendButtonCustomizationBuilder.setTextFontSize(it)
  }

  val uiCustomization =
    PaymentAuthConfig.Stripe3ds2UiCustomization
      .Builder()
      .setLabelCustomization(labelCustomizationBuilder.build())
      .setToolbarCustomization(toolbarCustomizationBuilder.build())
      .setButtonCustomization(
        submitButtonCustomizationBuilder.build(),
        PaymentAuthConfig.Stripe3ds2UiCustomization.ButtonType.SUBMIT,
      ).setButtonCustomization(
        continueButtonCustomizationBuilder.build(),
        PaymentAuthConfig.Stripe3ds2UiCustomization.ButtonType.CONTINUE,
      ).setButtonCustomization(
        nextButtonCustomizationBuilder.build(),
        PaymentAuthConfig.Stripe3ds2UiCustomization.ButtonType.SELECT,
      ).setButtonCustomization(
        cancelButtonCustomizationBuilder.build(),
        PaymentAuthConfig.Stripe3ds2UiCustomization.ButtonType.CANCEL,
      ).setButtonCustomization(
        resendButtonCustomizationBuilder.build(),
        PaymentAuthConfig.Stripe3ds2UiCustomization.ButtonType.RESEND,
      )

  params.getString("accentColor")?.let { uiCustomization.setAccentColor(it) }

  return uiCustomization.build()
}

internal fun mapFromSetupIntentResult(setupIntent: SetupIntent): WritableMap {
  val map: WritableMap = Arguments.createMap()
  val paymentMethodTypes: WritableArray = Arguments.createArray()
  map.putString("id", setupIntent.id)
  map.putString("status", mapIntentStatus(setupIntent.status))
  map.putString("description", setupIntent.description)
  map.putBoolean("livemode", setupIntent.isLiveMode)
  map.putString("clientSecret", setupIntent.clientSecret)
  map.putString("paymentMethodId", setupIntent.paymentMethodId)
  map.putMap(
    "paymentMethod",
    setupIntent.paymentMethod?.let { mapFromPaymentMethod(it) } ?: run { null },
  )
  map.putString("usage", mapSetupIntentUsage(setupIntent.usage))
  map.putString("created", convertToUnixTimestamp(setupIntent.created))
  map.putMap("nextAction", mapNextAction(setupIntent.nextActionType, setupIntent.nextActionData))

  setupIntent.lastSetupError?.let {
    val setupError: WritableMap = Arguments.createMap()
    setupError.putString("code", it.code)
    setupError.putString("message", it.message)
    setupError.putString("type", mapFromSetupIntentLastErrorType(it.type))
    setupError.putString("declineCode", it.declineCode)
    setupIntent.lastSetupError?.paymentMethod?.let { paymentMethod ->
      setupError.putMap("paymentMethod", mapFromPaymentMethod(paymentMethod))
    }
    map.putMap("lastSetupError", setupError)
  }

  for (code in setupIntent.paymentMethodTypes) {
    PaymentMethod.Type.fromCode(code)?.let {
      paymentMethodTypes.pushString(mapPaymentMethodType(it))
    }
  }

  map.putArray("paymentMethodTypes", paymentMethodTypes)

  return map
}

internal fun mapSetupIntentUsage(type: StripeIntent.Usage?): String =
  when (type) {
    StripeIntent.Usage.OffSession -> "OffSession"
    StripeIntent.Usage.OnSession -> "OnSession"
    StripeIntent.Usage.OneTime -> "OneTime"
    else -> "Unknown"
  }

fun mapToPaymentIntentFutureUsage(type: String?): ConfirmPaymentIntentParams.SetupFutureUsage? =
  when (type) {
    "OffSession" -> ConfirmPaymentIntentParams.SetupFutureUsage.OffSession
    "OnSession" -> ConfirmPaymentIntentParams.SetupFutureUsage.OnSession
    else -> null
  }

internal fun mapFromShippingContact(googlePayResult: GooglePayResult): WritableMap {
  val map = Arguments.createMap()
  map.putString("emailAddress", googlePayResult.email)
  val name = Arguments.createMap()
  googlePayResult.name
  name.putString("givenName", googlePayResult.shippingInformation?.name)
  map.putMap("name", name)
  googlePayResult.shippingInformation?.phone?.let { map.putString("phoneNumber", it) }
    ?: run { map.putString("phoneNumber", googlePayResult.phoneNumber) }
  val postalAddress = Arguments.createMap()
  postalAddress.putString("city", googlePayResult.shippingInformation?.address?.city)
  postalAddress.putString("country", googlePayResult.shippingInformation?.address?.country)
  postalAddress.putString("postalCode", googlePayResult.shippingInformation?.address?.postalCode)
  postalAddress.putString("state", googlePayResult.shippingInformation?.address?.state)
  val line1: String? = googlePayResult.shippingInformation?.address?.line1
  val line2: String? = googlePayResult.shippingInformation?.address?.line2
  val street = (line1 ?: "") + (if (line2 != null) "\n$line2" else "")
  postalAddress.putString("street", street)
  postalAddress.putString("isoCountryCode", googlePayResult.shippingInformation?.address?.country)
  map.putMap("postalAddress", postalAddress)
  return map
}

internal fun mapToPreferredNetworks(networksAsInts: List<Int>?): List<CardBrand> {
  if (networksAsInts == null) {
    return emptyList()
  }

  val intToCardBrand =
    mapOf(
      0 to CardBrand.JCB,
      1 to CardBrand.AmericanExpress,
      2 to CardBrand.CartesBancaires,
      3 to CardBrand.DinersClub,
      4 to CardBrand.Discover,
      5 to CardBrand.MasterCard,
      6 to CardBrand.UnionPay,
      7 to CardBrand.Visa,
      8 to CardBrand.Unknown,
    )

  return networksAsInts.mapNotNull { intToCardBrand[it] }
}

internal fun mapFromFinancialConnectionsEvent(event: FinancialConnectionsEvent): WritableMap =
  Arguments.createMap().apply {
    putString("name", event.name.value)

    // We require keys to use pascal case, but the original map uses snake case.
    val tweakedMap =
      buildMap {
        put("institutionName", event.metadata.institutionName)
        put("manualEntry", event.metadata.manualEntry)
        put("errorCode", event.metadata.errorCode)
      }

    putMap("metadata", tweakedMap.toReadableMap())
  }

private fun List<Any?>.toWritableArray(): WritableArray {
  val writableArray = Arguments.createArray()

  forEach { value ->
    @Suppress("UNCHECKED_CAST")
    when (value) {
      null -> writableArray.pushNull()
      is Boolean -> writableArray.pushBoolean(value)
      is Int -> writableArray.pushInt(value)
      is Double -> writableArray.pushDouble(value)
      is String -> writableArray.pushString(value)
      is Map<*, *> -> writableArray.pushMap((value as Map<String, Any?>).toReadableMap())
      is List<*> -> writableArray.pushArray(value.toWritableArray())
      else -> writableArray.pushString(value.toString())
    }
  }

  return writableArray
}

private fun Map<String, Any?>.toReadableMap(): ReadableMap {
  val writableMap = Arguments.createMap()

  forEach { (key, value) ->
    @Suppress("UNCHECKED_CAST")
    when (value) {
      null -> writableMap.putNull(key)
      is Boolean -> writableMap.putBoolean(key, value)
      is Int -> writableMap.putInt(key, value)
      is Double -> writableMap.putDouble(key, value)
      is String -> writableMap.putString(key, value)
      is Map<*, *> -> writableMap.putMap(key, (value as Map<String, Any?>).toReadableMap())
      is List<*> -> writableMap.putArray(key, value.toWritableArray())
      else -> writableMap.putString(key, value.toString())
    }
  }

  return writableMap
}

@SuppressLint("RestrictedApi")
internal fun parseCustomPaymentMethods(customPaymentMethodConfig: ReadableMap?): List<PaymentSheet.CustomPaymentMethod> {
  if (customPaymentMethodConfig == null) {
    return emptyList()
  }

  val customPaymentMethods = customPaymentMethodConfig.getArray("customPaymentMethods")
  if (customPaymentMethods != null) {
    val result = mutableListOf<PaymentSheet.CustomPaymentMethod>()

    customPaymentMethods.forEachMap { customPaymentMethodMap ->
      val id = customPaymentMethodMap.getString("id")
      if (id != null) {
        val subtitle = customPaymentMethodMap.getString("subtitle")
        val disableBillingDetailCollection = customPaymentMethodMap.getBooleanOr("disableBillingDetailCollection", false)
        result.add(
          PaymentSheet.CustomPaymentMethod(
            id = id,
            subtitle = subtitle,
            disableBillingDetailCollection = disableBillingDetailCollection,
          ),
        )
      }
    }

    return result
  }

  return emptyList()
}

@SuppressLint("RestrictedApi")
internal fun mapFromCustomPaymentMethod(
  customPaymentMethod: PaymentSheet.CustomPaymentMethod,
  billingDetails: PaymentMethod.BillingDetails,
): WritableMap =
  Arguments.createMap().apply {
    putMap(
      "customPaymentMethod",
      Arguments.createMap().apply {
        putString("id", customPaymentMethod.id)
      },
    )
    putMap("billingDetails", mapFromBillingDetails(billingDetails))
  }

@SuppressLint("RestrictedApi")
internal fun mapFromConfirmationToken(confirmationToken: ConfirmationToken): WritableMap {
  val token: WritableMap = Arguments.createMap()

  token.putString("id", confirmationToken.id)
  token.putDouble("created", confirmationToken.created.toDouble())
  token.putDouble("expiresAt", confirmationToken.expiresAt?.toDouble() ?: 0.0)
  token.putBoolean("liveMode", confirmationToken.liveMode)
  token.putString("paymentIntentId", confirmationToken.paymentIntentId)
  token.putString("setupIntentId", confirmationToken.setupIntentId)
  token.putString("returnURL", confirmationToken.returnUrl)
  token.putString("setupFutureUsage", mapFromSetupFutureUsage(confirmationToken.setupFutureUsage))

  // PaymentMethodPreview
  confirmationToken.paymentMethodPreview?.let { preview ->
    val paymentMethodPreview = Arguments.createMap()
    paymentMethodPreview.putString("type", mapPaymentMethodType(preview.type))
    paymentMethodPreview.putMap("billingDetails", mapFromBillingDetails(preview.billingDetails))
    paymentMethodPreview.putString("allowRedisplay", mapFromAllowRedisplay(preview.allowRedisplay))
    paymentMethodPreview.putString("customerId", preview.customerId)
    token.putMap("paymentMethodPreview", paymentMethodPreview)
  } ?: run {
    token.putNull("paymentMethodPreview")
  }

  // Shipping details
  confirmationToken.shipping?.let { shippingDetails ->
    val shipping = Arguments.createMap()
    shipping.putString("name", shippingDetails.name)
    shipping.putString("phone", shippingDetails.phone)

    shippingDetails.address?.let { address ->
      val addressMap = Arguments.createMap()
      addressMap.putString("city", address.city)
      addressMap.putString("country", address.country)
      addressMap.putString("line1", address.line1)
      addressMap.putString("line2", address.line2)
      addressMap.putString("postalCode", address.postalCode)
      addressMap.putString("state", address.state)
      shipping.putMap("address", addressMap)
    } ?: run {
      shipping.putMap("address", Arguments.createMap())
    }

    token.putMap("shipping", shipping)
  } ?: run {
    token.putNull("shipping")
  }

  return token
}

@SuppressLint("RestrictedApi")
private fun mapFromSetupFutureUsage(setupFutureUsage: ConfirmPaymentIntentParams.SetupFutureUsage?): String? =
  when (setupFutureUsage) {
    ConfirmPaymentIntentParams.SetupFutureUsage.OnSession -> "on_session"
    ConfirmPaymentIntentParams.SetupFutureUsage.OffSession -> "off_session"
    ConfirmPaymentIntentParams.SetupFutureUsage.Blank -> ""
    ConfirmPaymentIntentParams.SetupFutureUsage.None -> "none"
    null -> null
  }

private fun mapFromAllowRedisplay(allowRedisplay: PaymentMethod.AllowRedisplay?): String? =
  when (allowRedisplay) {
    PaymentMethod.AllowRedisplay.ALWAYS -> "always"
    PaymentMethod.AllowRedisplay.LIMITED -> "limited"
    PaymentMethod.AllowRedisplay.UNSPECIFIED -> "unspecified"
    null -> null
  }

fun readableMapOf(vararg pairs: Pair<String, Any?>): ReadableMap =
  Arguments.createMap().apply {
    for ((key, value) in pairs) {
      when (value) {
        null -> putNull(key)
        is String -> putString(key, value)
        is Boolean -> putBoolean(key, value)
        is Double -> putDouble(key, value)
        is Float -> putDouble(key, value.toDouble())
        is Int -> putInt(key, value)
        is Long -> putLong(key, value)
        is ReadableMap -> putMap(key, value)
        is ReadableArray -> putArray(key, value)
        else -> {
          val valueType = value.javaClass.canonicalName
          throw IllegalArgumentException("Illegal value type $valueType for key \"$key\"")
        }
      }
    }
  }

fun readableArrayOf(vararg elements: Any?): ReadableArray =
  Arguments.createArray().apply {
    for (element in elements) {
      when (element) {
        null -> pushNull()
        is String -> pushString(element)
        is Boolean -> pushBoolean(element)
        is Double -> pushDouble(element)
        is Float -> pushDouble(element.toDouble())
        is Int -> pushInt(element)
        is Long -> pushInt(element.toInt())
        is ReadableMap -> pushMap(element)
        is ReadableArray -> pushArray(element)
        else -> {
          val valueType = element.javaClass.canonicalName
          throw IllegalArgumentException("Illegal value type $valueType for array element")
        }
      }
    }
  }
