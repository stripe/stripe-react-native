@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import android.annotation.SuppressLint
import androidx.compose.ui.graphics.Color
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.model.KycInfo
import com.stripe.android.crypto.onramp.model.OnrampConfiguration
import com.stripe.android.crypto.onramp.model.PaymentMethodDisplayData
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher
import com.stripe.android.link.LinkAppearance
import com.stripe.android.link.LinkAppearance.Colors
import com.stripe.android.link.LinkAppearance.PrimaryButton
import com.stripe.android.link.LinkAppearance.Style
import com.stripe.android.model.DateOfBirth
import com.stripe.android.paymentsheet.PaymentSheet

@SuppressLint("RestrictedApi")
internal fun mapConfig(
  configMap: ReadableMap,
  publishableKey: String,
): OnrampConfiguration {
  val appearanceMap = configMap.getMap("appearance")
  val appearance =
    if (appearanceMap != null) {
      mapAppearance(appearanceMap)
    } else {
      LinkAppearance()
        .style(Style.AUTOMATIC)
    }

  val displayName = configMap.getString("merchantDisplayName") ?: ""
  val cryptoCustomerId = configMap.getString("cryptoCustomerId")
  val googlePayConfig = mapGooglePayConfig(configMap.getMap("googlePay"))

  return OnrampConfiguration()
    .merchantDisplayName(displayName)
    .publishableKey(publishableKey)
    .appearance(appearance)
    .cryptoCustomerId(cryptoCustomerId)
    .apply { googlePayConfig?.let { googlePayConfig(it) } }
}

@SuppressLint("RestrictedApi")
internal fun mapGooglePayConfig(params: ReadableMap?): GooglePayPaymentMethodLauncher.Config? {
  if (params == null) return null

  val testEnv = params.hasKey("testEnv") && params.getBoolean("testEnv")
  val merchantCountryCode = params.getString("merchantCountryCode") ?: return null
  val merchantName = params.getString("merchantName") ?: return null
  val existingPaymentMethodRequired =
    params.hasKey("existingPaymentMethodRequired") && params.getBoolean("existingPaymentMethodRequired")
  val isEmailRequired = if (params.hasKey("isEmailRequired")) params.getBoolean("isEmailRequired") else false
  val allowCreditCards = if (params.hasKey("allowCreditCards")) params.getBoolean("allowCreditCards") else true

  val billingAddressConfig =
    mapGooglePayBillingAddressConfig(params.getMap("billingAddressConfig"))

  return GooglePayPaymentMethodLauncher.Config(
    environment = if (testEnv) GooglePayEnvironment.Test else GooglePayEnvironment.Production,
    merchantCountryCode = merchantCountryCode,
    merchantName = merchantName,
    isEmailRequired = isEmailRequired,
    allowCreditCards = allowCreditCards,
    billingAddressConfig = billingAddressConfig,
    existingPaymentMethodRequired = existingPaymentMethodRequired,
  )
}

private fun mapGooglePayBillingAddressConfig(params: ReadableMap?): GooglePayPaymentMethodLauncher.BillingAddressConfig {
  if (params == null) return GooglePayPaymentMethodLauncher.BillingAddressConfig()

  val isRequired = params.hasKey("isRequired") && params.getBoolean("isRequired")
  val format =
    when (params.getString("format")) {
      "Full" -> GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Full
      else -> GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Min
    }
  val isPhoneNumberRequired =
    params.hasKey("isPhoneNumberRequired") && params.getBoolean("isPhoneNumberRequired")

  return GooglePayPaymentMethodLauncher.BillingAddressConfig(
    isRequired = isRequired,
    format = format,
    isPhoneNumberRequired = isPhoneNumberRequired,
  )
}

@SuppressLint("RestrictedApi")
internal fun mapAppearance(appearanceMap: ReadableMap): LinkAppearance {
  val lightColorsMap = appearanceMap.getMap("lightColors")
  val darkColorsMap = appearanceMap.getMap("darkColors")
  val styleStr = appearanceMap.getString("style")
  val primaryButtonMap = appearanceMap.getMap("primaryButton")

  val lightColors =
    if (lightColorsMap != null) {
      val primaryColorStr = lightColorsMap.getString("primary")
      val contentColorStr = lightColorsMap.getString("contentOnPrimary")
      val borderSelectedColorStr = lightColorsMap.getString("borderSelected")

      Colors()
        .primary(Color(android.graphics.Color.parseColor(primaryColorStr)))
        .contentOnPrimary(Color(android.graphics.Color.parseColor(contentColorStr)))
        .borderSelected(Color(android.graphics.Color.parseColor(borderSelectedColorStr)))
    } else {
      Colors()
    }

  val darkColors =
    if (darkColorsMap != null) {
      val primaryColorStr = darkColorsMap.getString("primary")
      val contentColorStr = darkColorsMap.getString("contentOnPrimary")
      val borderSelectedColorStr = darkColorsMap.getString("borderSelected")

      Colors()
        .primary(Color(android.graphics.Color.parseColor(primaryColorStr)))
        .contentOnPrimary(Color(android.graphics.Color.parseColor(contentColorStr)))
        .borderSelected(Color(android.graphics.Color.parseColor(borderSelectedColorStr)))
    } else {
      Colors()
    }

  val style =
    when (styleStr) {
      "ALWAYS_LIGHT" -> Style.ALWAYS_LIGHT
      "ALWAYS_DARK" -> Style.ALWAYS_DARK
      else -> Style.AUTOMATIC
    }

  val primaryButton =
    if (primaryButtonMap != null) {
      PrimaryButton()
        .cornerRadiusDp(
          if (primaryButtonMap.hasKey("cornerRadius")) {
            primaryButtonMap.getDouble("cornerRadius").toFloat()
          } else {
            null
          },
        ).heightDp(
          if (primaryButtonMap.hasKey("height")) {
            primaryButtonMap.getDouble("height").toFloat()
          } else {
            null
          },
        )
    } else {
      PrimaryButton()
    }

  return LinkAppearance()
    .lightColors(lightColors)
    .darkColors(darkColors)
    .style(style)
    .primaryButton(primaryButton)
}

@OptIn(ExperimentalCryptoOnramp::class)
@SuppressLint("RestrictedApi")
internal fun mapPaymentDetailsType(type: PaymentMethodDisplayData.Type): String =
  when (type) {
    PaymentMethodDisplayData.Type.Card -> "Card"
    PaymentMethodDisplayData.Type.BankAccount -> "BankAccount"
    PaymentMethodDisplayData.Type.GooglePay -> "GooglePay"
  }

@OptIn(ExperimentalCryptoOnramp::class)
@SuppressLint("RestrictedApi")
internal fun mapFromKycInfo(kycInfo: KycInfo): ReadableMap {
  val result = Arguments.createMap()

  kycInfo.firstName?.let { result.putString("firstName", it) }
  kycInfo.lastName?.let { result.putString("lastName", it) }
  kycInfo.idNumber?.let { result.putString("idNumber", it) }
  kycInfo.address?.let { result.putMap("address", mapFromKycAddress(it)) }
  kycInfo.dateOfBirth?.let { result.putMap("dateOfBirth", mapFromDateOfBirth(it)) }

  return result
}

private fun mapFromKycAddress(address: PaymentSheet.Address): ReadableMap {
  val result = Arguments.createMap()

  address.city?.let { result.putString("city", it) }
  address.country?.let { result.putString("country", it) }
  address.line1?.let { result.putString("line1", it) }
  address.line2?.let { result.putString("line2", it) }
  address.postalCode?.let { result.putString("postalCode", it) }
  address.state?.let { result.putString("state", it) }

  return result
}

private fun mapFromDateOfBirth(dateOfBirth: DateOfBirth): ReadableMap {
  val result = Arguments.createMap()
  result.putInt("day", dateOfBirth.day)
  result.putInt("month", dateOfBirth.month)
  result.putInt("year", dateOfBirth.year)
  return result
}
