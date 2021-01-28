package com.reactnativestripesdk

import com.facebook.react.bridge.*
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.model.*


internal fun mapIntentStatus(status: StripeIntent.Status?): String {
  return when (status) {
    StripeIntent.Status.Succeeded -> "Succeeded"
    StripeIntent.Status.RequiresPaymentMethod -> "RequiresPaymentMethod"
    StripeIntent.Status.RequiresConfirmation -> "RequiresConfirmation"
    StripeIntent.Status.Canceled -> "Canceled"
    StripeIntent.Status.Processing -> "Processing"
    StripeIntent.Status.RequiresAction -> "RequiresAction"
    StripeIntent.Status.RequiresCapture -> "RequiresCapture"
    else -> "Unknown"
  }
}


internal fun mapCaptureMethod(captureMethod: PaymentIntent.CaptureMethod?): String {
  return when (captureMethod) {
    PaymentIntent.CaptureMethod.Automatic -> "Automatic"
    PaymentIntent.CaptureMethod.Manual -> "Manual"
    else -> "Unknown"
  }
}

internal fun mapConfirmationMethod(captureMethod: PaymentIntent.ConfirmationMethod?): String {
  return when (captureMethod) {
    PaymentIntent.ConfirmationMethod.Automatic -> "Automatic"
    PaymentIntent.ConfirmationMethod.Manual -> "Manual"
    else -> "Unknown"
  }
}

internal fun mapIntentShipping(shipping: PaymentIntent.Shipping): WritableMap {
  val map: WritableMap = WritableNativeMap()
  val address: WritableMap = WritableNativeMap()

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

internal fun mapCardBrand(brand: CardBrand?): String {
  return when (brand) {
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
}

internal fun mapPaymentMethodType(type: PaymentMethod.Type?): String {
  return when (type) {
    PaymentMethod.Type.AfterpayClearpay -> "AfterpayClearpay"
    PaymentMethod.Type.Alipay -> "Alipay"
    PaymentMethod.Type.AuBecsDebit -> "AuBecsDebit"
    PaymentMethod.Type.BacsDebit -> "BacsDebit"
    PaymentMethod.Type.Bancontact -> "Bancontact"
    PaymentMethod.Type.Card -> "Card"
    PaymentMethod.Type.CardPresent -> "CardPresent"
    PaymentMethod.Type.Eps -> "Eps"
    PaymentMethod.Type.Fpx -> "Fpx"
    PaymentMethod.Type.Giropay -> "Giropay"
    PaymentMethod.Type.GrabPay -> "GrabPay"
    PaymentMethod.Type.Ideal -> "Ideal"
    PaymentMethod.Type.Netbanking -> "Netbanking"
    PaymentMethod.Type.Oxxo -> "Oxxo"
    PaymentMethod.Type.P24 -> "P24"
    PaymentMethod.Type.SepaDebit -> "SepaDebit"
    PaymentMethod.Type.Sofort -> "Sofort"
    PaymentMethod.Type.Upi -> "Upi"
    else -> "Unknown"
  }
}

internal fun mapFromBillingDetails(billingDatails: PaymentMethod.BillingDetails?): WritableMap {
  val details: WritableMap = WritableNativeMap()
  val address: WritableMap = WritableNativeMap()

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

internal fun mapFromPaymentMethod(paymentMethod: PaymentMethod): WritableMap {
  val pm: WritableMap = WritableNativeMap()
  val card: WritableMap = WritableNativeMap()
  val sepaDebit: WritableMap = WritableNativeMap()
  val bacsDebit: WritableMap = WritableNativeMap()
  val auBECSDebit: WritableMap = WritableNativeMap()
  val sofort: WritableMap = WritableNativeMap()
  val ideal: WritableMap = WritableNativeMap()
  val fpx: WritableMap = WritableNativeMap()
  val upi: WritableMap = WritableNativeMap()

  card.putString("brand", mapCardBrand(paymentMethod.card?.brand))
  card.putString("country", paymentMethod.card?.country)

  paymentMethod.card?.expiryYear?.let {
    card.putInt("expYear", it)
  }
  paymentMethod.card?.expiryMonth?.let {
    card.putInt("expMonth", it)
  }
  card.putString("funding", paymentMethod.card?.funding)
  card.putString("last4", paymentMethod.card?.last4)

  sepaDebit.putString("bankCode", paymentMethod.sepaDebit?.bankCode)
  sepaDebit.putString("country", paymentMethod.sepaDebit?.country)
  sepaDebit.putString("fingerprint", paymentMethod.sepaDebit?.fingerprint)
  sepaDebit.putString("last4", paymentMethod.sepaDebit?.branchCode)

  bacsDebit.putString("fingerprint", paymentMethod.bacsDebit?.fingerprint)
  bacsDebit.putString("last4", paymentMethod.bacsDebit?.last4)
  bacsDebit.putString("sortCode", paymentMethod.bacsDebit?.sortCode)

  auBECSDebit.putString("bsbNumber", paymentMethod.bacsDebit?.sortCode)
  auBECSDebit.putString("fingerprint", paymentMethod.bacsDebit?.fingerprint)
  auBECSDebit.putString("last4", paymentMethod.bacsDebit?.last4)

  sofort.putString("country", paymentMethod.sofort?.country)

  ideal.putString("bankName", paymentMethod.ideal?.bank)
  ideal.putString("bankIdentifierCode", paymentMethod.ideal?.bankIdentifierCode)

  fpx.putString("accountHolderType", paymentMethod.fpx?.accountHolderType)
  fpx.putString("bank", paymentMethod.fpx?.bank)

  upi.putString("vpa", paymentMethod.upi?.vpa)

  pm.putString("id", paymentMethod.id)
  pm.putString("type", mapPaymentMethodType(paymentMethod.type))
  pm.putBoolean("livemode", paymentMethod.liveMode)
  pm.putString("customerId", paymentMethod.customerId)
  pm.putMap("billingDetails", mapFromBillingDetails(paymentMethod.billingDetails))
  pm.putMap("Card", card)
  pm.putMap("SepaDebit", sepaDebit)
  pm.putMap("BacsDebit", bacsDebit)
  pm.putMap("AuBecsDebit", auBECSDebit)
  pm.putMap("Sofort", sofort)
  pm.putMap("Ideal", ideal)
  pm.putMap("Fpx", fpx)
  pm.putMap("Upi", upi)

  return pm
}

internal fun mapFromPaymentIntentResult(paymentIntent: PaymentIntent): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("id", paymentIntent.id)
  map.putString("clientSecret", paymentIntent.clientSecret)
  map.putBoolean("livemode", paymentIntent.isLiveMode)
  map.putString("paymentMethodId", paymentIntent.paymentMethodId)
  map.putString("receiptEmail", paymentIntent.receiptEmail)
  map.putString("currency", paymentIntent.currency)
  map.putString("status", mapIntentStatus(paymentIntent.status))
  map.putString("description", paymentIntent.description)
  map.putString("receiptEmail", paymentIntent.receiptEmail)
  map.putInt("created", paymentIntent.created.toInt())
  map.putString("captureMethod", mapCaptureMethod(paymentIntent.captureMethod))
  map.putString("confirmationMethod", mapConfirmationMethod(paymentIntent.confirmationMethod))
  map.putNull("lastPaymentError")
  map.putNull("shipping")
  map.putNull("amount")
  map.putNull("canceledAt")

  paymentIntent.lastPaymentError?.let {
    val paymentError: WritableMap = WritableNativeMap()
    paymentError.putString("code", it.code)
    paymentError.putString("message", it.message)

    map.putMap("lastPaymentError", paymentError)
  }

  paymentIntent.shipping?.let {
    map.putMap("shipping", mapIntentShipping(it))
  }

  paymentIntent.amount?.let {
    map.putDouble("amount", it.toDouble())
  }
  paymentIntent.canceledAt?.let {
    map.putInt("canceledAt", it.toInt())
  }
  return map
}

internal fun mapToPaymentMethodCreateParams(cardData: ReadableMap): PaymentMethodCreateParams {
  val cardParams = CardParams(
    cardData.getString("number").orEmpty(),
    cardData.getInt("expiryMonth"),
    cardData.getInt("expiryYear"),
    cardData.getString("cvc"),
    if (cardData.hasKey("name")) cardData.getString("name") else null,
    if (cardData.hasKey("postalCode")) Address.Builder().setPostalCode(cardData.getString("postalCode").orEmpty()).build() else null,
    if (cardData.hasKey("currency")) cardData.getString("currency") else null,
    null)

  return PaymentMethodCreateParams.createCard(cardParams)
}

internal fun mapToCard(card: ReadableMap): PaymentMethodCreateParams.Card {
  return PaymentMethodCreateParams.Card.Builder()
    .setCvc(card.getString("cvc"))
    .setExpiryMonth(card.getInt("expiryMonth"))
    .setExpiryYear(card.getInt("expiryYear"))
    .setNumber(card.getString("number").orEmpty())
    .build()
}

fun getValOr(map: ReadableMap, key: String, default: String? = ""): String? {
  return if (map.hasKey(key)) map.getString(key) else default
}

internal fun mapToBillingDetails(billingDatails: ReadableMap): PaymentMethod.BillingDetails {
  val address = Address.Builder()
    .setPostalCode(getValOr(billingDatails, "addressPostalCode"))
    .setCity(getValOr(billingDatails, "addressCity"))
    .setCountry(getValOr(billingDatails, "addressCountry"))
    .setLine1(getValOr(billingDatails, "addressLine1"))
    .setLine2(getValOr(billingDatails, "addressLine2"))
    .setState(getValOr(billingDatails, "addressState"))
    .build()

  return PaymentMethod.BillingDetails.Builder()
    .setAddress(address)
    .setName(getValOr(billingDatails, "name"))
    .setPhone(getValOr(billingDatails, "phone"))
    .setEmail(getValOr(billingDatails, "email"))
    .build()
}

private fun getStringOrNull(map: ReadableMap?, key: String): String? {
  return if (map?.hasKey(key) == true) map.getString(key) else null
}

private fun getIntOrNull(map: ReadableMap?, key: String): Int? {
  return if (map?.hasKey(key) == true) map.getInt(key) else null
}

private fun getMapOrNull(map: ReadableMap?, key: String): ReadableMap? {
  return if (map?.hasKey(key) == true) map.getMap(key) else null
}

fun mapToUICustomization(params: ReadableMap): PaymentAuthConfig.Stripe3ds2UiCustomization {
  val labelCustomization = getMapOrNull(params, "label")
  val navigationBarCustomization = params.getMap("navigationBar")
  val textBoxCustomization = getMapOrNull(params, "textField")
  val buttonCustomization = getMapOrNull(params, "submitButton")

  val labelCustomizationBuilder = PaymentAuthConfig.Stripe3ds2LabelCustomization.Builder()
  val toolbarCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ToolbarCustomization.Builder()
  val textBoxCustomizationBuilder = PaymentAuthConfig.Stripe3ds2TextBoxCustomization.Builder()
  val buttonCustomizationBuilder = PaymentAuthConfig.Stripe3ds2ButtonCustomization.Builder()

  getStringOrNull(labelCustomization,"headingTextColor")?.let {
    labelCustomizationBuilder.setHeadingTextColor(it)
  }
  getStringOrNull(labelCustomization,"textColor")?.let {
    labelCustomizationBuilder.setTextColor(it)
  }
  getIntOrNull(labelCustomization,"headingFontSize")?.let {
    labelCustomizationBuilder.setHeadingTextFontSize(it)
  }
  getIntOrNull(labelCustomization,"textFontSize")?.let {
    labelCustomizationBuilder.setTextFontSize(it)
  }

  getStringOrNull(navigationBarCustomization,"headerText")?.let {
    toolbarCustomizationBuilder.setHeaderText(it)
  }
  getStringOrNull(navigationBarCustomization,"buttonText")?.let {
    toolbarCustomizationBuilder.setButtonText(it)
  }
  getStringOrNull(navigationBarCustomization,"textColor")?.let {
    toolbarCustomizationBuilder.setTextColor(it)
  }
  getStringOrNull(navigationBarCustomization,"statusBarColor")?.let {
    toolbarCustomizationBuilder.setStatusBarColor(it)
  }
  getStringOrNull(navigationBarCustomization,"backgroundColor")?.let {
    toolbarCustomizationBuilder.setBackgroundColor(it)
  }
  getIntOrNull(navigationBarCustomization,"textFontSize")?.let {
    toolbarCustomizationBuilder.setTextFontSize(it)
  }

  getStringOrNull(textBoxCustomization, "borderColor")?.let {
    textBoxCustomizationBuilder.setBorderColor(it)
  }
  getStringOrNull(textBoxCustomization, "textColor")?.let {
    textBoxCustomizationBuilder.setTextColor(it)
  }
  getIntOrNull(textBoxCustomization, "borderWidth")?.let {
    textBoxCustomizationBuilder.setBorderWidth(it)
  }
  getIntOrNull(textBoxCustomization, "cornerRadius")?.let {
    textBoxCustomizationBuilder.setCornerRadius(it)
  }
  getIntOrNull(textBoxCustomization, "textFontSize")?.let {
    textBoxCustomizationBuilder.setTextFontSize(it)
  }

  getStringOrNull(buttonCustomization, "backgroundColor")?.let {
    buttonCustomizationBuilder.setBackgroundColor(it)
  }
  getIntOrNull(buttonCustomization, "cornerRadius")?.let {
    buttonCustomizationBuilder.setCornerRadius(it)
  }
  getStringOrNull(buttonCustomization, "textColor")?.let {
    buttonCustomizationBuilder.setTextColor(it)
  }
  getIntOrNull(buttonCustomization, "textFontSize")?.let {
    buttonCustomizationBuilder.setTextFontSize(it)
  }


  val uiCustomization = PaymentAuthConfig.Stripe3ds2UiCustomization.Builder()
    .setLabelCustomization(
      labelCustomizationBuilder.build()
    )
    .setToolbarCustomization(
      toolbarCustomizationBuilder.build()
    )
    .setButtonCustomization(
      buttonCustomizationBuilder.build(),
      PaymentAuthConfig.Stripe3ds2UiCustomization.ButtonType.SUBMIT
    )

  getStringOrNull(params, "backgroundColor")?.let {
    uiCustomization.setAccentColor(it)
  }

  return uiCustomization.build()
}

internal fun mapFromSetupIntentResult(setupIntent: SetupIntent): WritableMap {
  val map: WritableMap = WritableNativeMap()
  val paymentMethodTypes: WritableArray = Arguments.createArray()
  map.putString("id", setupIntent.id)
  map.putString("status", mapIntentStatus(setupIntent.status))
  map.putString("description", setupIntent.description)
  map.putBoolean("livemode", setupIntent.isLiveMode)
  map.putString("clientSecret", setupIntent.clientSecret)
  map.putString("paymentMethodId", setupIntent.paymentMethodId)
  map.putString("usage", mapSetupIntentUsage(setupIntent.usage))

  if(setupIntent.created != null) {
    map.putInt("created", setupIntent.created.toInt())
  }

  setupIntent.lastSetupError?.let {
    val setupError: WritableMap = WritableNativeMap()
    setupError.putString("code", it.code)
    setupError.putString("message", it.message)

    map.putMap("lastSetupError", setupError)
  }

  setupIntent.paymentMethodTypes.forEach { code ->
    var type: PaymentMethod.Type? = null
      PaymentMethod.Type.values().forEach {
      if (code == it.code) {
        type = it
      }
    }
    type?.let {
      paymentMethodTypes.pushString(mapPaymentMethodType(it))
    }
  }

  map.putArray("paymentMethodTypes", paymentMethodTypes)

  return map
}

internal fun mapSetupIntentUsage(type: StripeIntent.Usage?): String {
  return when (type) {
    StripeIntent.Usage.OffSession -> "OffSession"
    StripeIntent.Usage.OnSession -> "OnSession"
    StripeIntent.Usage.OneTime -> "OneTime"
    else -> "Unknown"
  }
}
