package com.reactnativestripesdk

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.stripe.android.PaymentAuthConfig
import com.stripe.android.model.*
import com.stripe.android.stripe3ds2.init.ui.StripeUiCustomization

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

internal fun mapFromPaymentIntentResult(paymentIntent: PaymentIntent): WritableMap {
  val map: WritableMap = WritableNativeMap()
  map.putString("id", paymentIntent.id)
  map.putString("currency", paymentIntent.currency)
  map.putString("status", mapIntentStatus(paymentIntent.status))
  map.putString("description", paymentIntent.description)
  map.putString("receiptEmail", paymentIntent.receiptEmail)
  if(paymentIntent.amount != null) {
    map.putDouble("amount", paymentIntent.amount!!.toDouble())
  }
  if(paymentIntent.created != null) {
    map.putInt("created", paymentIntent.created.toInt())
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
  map.putString("id", setupIntent.id)
  map.putString("status", mapIntentStatus(setupIntent.status))
  map.putString("description", setupIntent.description)
  if(setupIntent.created != null) {
    map.putInt("created", setupIntent.created.toInt())
  }

  return map
}
