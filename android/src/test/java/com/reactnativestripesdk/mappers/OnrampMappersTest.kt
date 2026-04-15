@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk.mappers

import android.annotation.SuppressLint
import androidx.compose.ui.graphics.toArgb
import com.reactnativestripesdk.mapAppearance
import com.reactnativestripesdk.mapConfig
import com.reactnativestripesdk.mapFromKycInfo
import com.reactnativestripesdk.mapGooglePayConfig
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.model.KycInfo
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher
import com.stripe.android.link.LinkAppearance.Style
import com.stripe.android.model.DateOfBirth
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@RunWith(RobolectricTestRunner::class)
class OnrampMappersTest {
  @Test
  fun mapGooglePayConfig_NullMap_ReturnsNull() {
    val result = mapGooglePayConfig(null)
    assertNull(result)
  }

  @Test
  fun mapGooglePayConfig_MissingMerchantCountryCode_ReturnsNull() {
    val params =
      readableMapOf(
        "merchantName" to "Test Merchant",
      )
    val result = mapGooglePayConfig(params)
    assertNull(result)
  }

  @Test
  fun mapGooglePayConfig_Defaults() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertEquals(GooglePayEnvironment.Production, result!!.environment)
    assertFalse(result.isEmailRequired)
    assertTrue(result.allowCreditCards)
    assertFalse(result.existingPaymentMethodRequired)
  }

  @Test
  fun mapGooglePayConfig_TestEnv() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "testEnv" to true,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertEquals(GooglePayEnvironment.Test, result!!.environment)
  }

  @Test
  fun mapGooglePayConfig_IsEmailRequired_True() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "isEmailRequired" to true,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertTrue(result!!.isEmailRequired)
  }

  @Test
  fun mapGooglePayConfig_AllowCreditCards_False() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "allowCreditCards" to false,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertFalse(result!!.allowCreditCards)
  }

  @Test
  fun mapGooglePayConfig_MissingMerchantName_ReturnsNull() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
      )
    val result = mapGooglePayConfig(params)
    assertNull(result)
  }

  @Test
  fun mapGooglePayConfig_ExistingPaymentMethodRequired_False() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "existingPaymentMethodRequired" to false,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertFalse(result!!.existingPaymentMethodRequired)
  }

  @Test
  fun mapGooglePayConfig_WithBillingAddressConfig_IsRequired() {
    val billingAddressConfig =
      readableMapOf(
        "isRequired" to true,
      )
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "billingAddressConfig" to billingAddressConfig,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertTrue(result!!.billingAddressConfig.isRequired)
  }

  @Test
  fun mapGooglePayConfig_WithBillingAddressConfig_FullFormat() {
    val billingAddressConfig =
      readableMapOf(
        "format" to "Full",
      )
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "billingAddressConfig" to billingAddressConfig,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertEquals(
      GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Full,
      result!!.billingAddressConfig.format,
    )
  }

  @Test
  fun mapGooglePayConfig_WithBillingAddressConfig_UnknownFormat_DefaultsToMin() {
    val billingAddressConfig =
      readableMapOf(
        "format" to "Unknown",
      )
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "billingAddressConfig" to billingAddressConfig,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertEquals(
      GooglePayPaymentMethodLauncher.BillingAddressConfig.Format.Min,
      result!!.billingAddressConfig.format,
    )
  }

  @Test
  fun mapGooglePayConfig_WithBillingAddressConfig_IsPhoneNumberRequired() {
    val billingAddressConfig =
      readableMapOf(
        "isPhoneNumberRequired" to true,
      )
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "merchantName" to "Test Merchant",
        "billingAddressConfig" to billingAddressConfig,
      )
    val result = mapGooglePayConfig(params)

    assertNotNull(result)
    assertTrue(result!!.billingAddressConfig.isPhoneNumberRequired)
  }

  @Test
  fun mapConfig_WithAppearance() {
    val appearance =
      readableMapOf(
        "style" to "ALWAYS_DARK",
      )
    val config =
      readableMapOf(
        "merchantDisplayName" to "Test",
        "appearance" to appearance,
        "cryptoCustomerId" to "cust_abc",
      )
    val result = mapConfig(config, "pk_test_123")

    assertNotNull(result)
  }

  @Test
  fun mapAppearance_EmptyMap_ReturnsDefaultValue() {
    val appearanceMap = readableMapOf()
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.AUTOMATIC, result.style)
  }

  @Test
  fun mapAppearance_StyleAlwaysLight() {
    val appearanceMap =
      readableMapOf(
        "style" to "ALWAYS_LIGHT",
      )
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.ALWAYS_LIGHT, result.style)
  }

  @Test
  fun mapAppearance_StyleAlwaysDark() {
    val appearanceMap =
      readableMapOf(
        "style" to "ALWAYS_DARK",
      )
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.ALWAYS_DARK, result.style)
  }

  @Test
  fun mapAppearance_StyleUnknown_DefaultsToAutomatic() {
    val appearanceMap =
      readableMapOf(
        "style" to "SOMETHING_UNKNOWN",
      )
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.AUTOMATIC, result.style)
  }

  @Test
  fun mapAppearance_WithLightColors() {
    val lightColors =
      readableMapOf(
        "primary" to "#FF0000",
        "contentOnPrimary" to "#FFFFFF",
        "borderSelected" to "#00FF00",
      )
    val appearanceMap =
      readableMapOf(
        "lightColors" to lightColors,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(0xFFFF0000.toInt(), state.lightColors.primary.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), state.lightColors.contentOnPrimary.toArgb())
    assertEquals(0xFF00FF00.toInt(), state.lightColors.borderSelected.toArgb())
  }

  @Test
  fun mapAppearance_WithDarkColors() {
    val darkColors =
      readableMapOf(
        "primary" to "#0000FF",
        "contentOnPrimary" to "#000000",
        "borderSelected" to "#FF00FF",
      )
    val appearanceMap =
      readableMapOf(
        "darkColors" to darkColors,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(0xFF0000FF.toInt(), state.darkColors.primary.toArgb())
    assertEquals(0xFF000000.toInt(), state.darkColors.contentOnPrimary.toArgb())
    assertEquals(0xFFFF00FF.toInt(), state.darkColors.borderSelected.toArgb())
  }

  @Test
  fun mapAppearance_WithLightAndDarkColors() {
    val lightColors =
      readableMapOf(
        "primary" to "#FF0000",
        "contentOnPrimary" to "#FFFFFF",
        "borderSelected" to "#00FF00",
      )
    val darkColors =
      readableMapOf(
        "primary" to "#0000FF",
        "contentOnPrimary" to "#000000",
        "borderSelected" to "#FF00FF",
      )
    val appearanceMap =
      readableMapOf(
        "lightColors" to lightColors,
        "darkColors" to darkColors,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(0xFFFF0000.toInt(), state.lightColors.primary.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), state.lightColors.contentOnPrimary.toArgb())
    assertEquals(0xFF00FF00.toInt(), state.lightColors.borderSelected.toArgb())

    assertEquals(0xFF0000FF.toInt(), state.darkColors.primary.toArgb())
    assertEquals(0xFF000000.toInt(), state.darkColors.contentOnPrimary.toArgb())
    assertEquals(0xFFFF00FF.toInt(), state.darkColors.borderSelected.toArgb())
  }

  @Test
  fun mapAppearance_WithPrimaryButton() {
    val primaryButton =
      readableMapOf(
        "cornerRadius" to 8.0,
        "height" to 48.0,
      )
    val appearanceMap =
      readableMapOf(
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(8f, state.primaryButton.cornerRadiusDp)
    assertEquals(48f, state.primaryButton.heightDp)
  }

  @Test
  fun mapAppearance_WithPrimaryButtonPartialFields() {
    val primaryButton =
      readableMapOf(
        "cornerRadius" to 12.0,
      )
    val appearanceMap =
      readableMapOf(
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(12f, state.primaryButton.cornerRadiusDp)
    assertNull(state.primaryButton.heightDp)
  }

  @Test
  fun mapAppearance_FullConfig() {
    val lightColors =
      readableMapOf(
        "primary" to "#FF0000",
        "contentOnPrimary" to "#FFFFFF",
        "borderSelected" to "#00FF00",
      )
    val darkColors =
      readableMapOf(
        "primary" to "#0000FF",
        "contentOnPrimary" to "#000000",
        "borderSelected" to "#FF00FF",
      )
    val primaryButton =
      readableMapOf(
        "cornerRadius" to 8.0,
        "height" to 48.0,
      )
    val appearanceMap =
      readableMapOf(
        "style" to "ALWAYS_LIGHT",
        "lightColors" to lightColors,
        "darkColors" to darkColors,
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(Style.ALWAYS_LIGHT, state.style)

    assertEquals(0xFFFF0000.toInt(), state.lightColors.primary.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), state.lightColors.contentOnPrimary.toArgb())
    assertEquals(0xFF00FF00.toInt(), state.lightColors.borderSelected.toArgb())

    assertEquals(0xFF0000FF.toInt(), state.darkColors.primary.toArgb())
    assertEquals(0xFF000000.toInt(), state.darkColors.contentOnPrimary.toArgb())
    assertEquals(0xFFFF00FF.toInt(), state.darkColors.borderSelected.toArgb())

    assertEquals(8f, state.primaryButton.cornerRadiusDp)
    assertEquals(48f, state.primaryButton.heightDp)
  }

  @Test
  fun mapFromKycInfo_AllFields() {
    val kycInfo =
      KycInfo(
        firstName = "Jane",
        lastName = "Doe",
        idNumber = "123456789",
        address =
          PaymentSheet.Address(
            city = "San Francisco",
            country = "US",
            line1 = "123 Main St",
            line2 = "Apt 4",
            postalCode = "94105",
            state = "CA",
          ),
        dateOfBirth = DateOfBirth(day = 15, month = 6, year = 1990),
      )
    val result = mapFromKycInfo(kycInfo)

    assertEquals("Jane", result.getString("firstName"))
    assertEquals("Doe", result.getString("lastName"))
    assertEquals("123456789", result.getString("idNumber"))

    val address = result.getMap("address")
    assertNotNull(address)
    assertEquals("San Francisco", address!!.getString("city"))
    assertEquals("US", address.getString("country"))
    assertEquals("123 Main St", address.getString("line1"))
    assertEquals("Apt 4", address.getString("line2"))
    assertEquals("94105", address.getString("postalCode"))
    assertEquals("CA", address.getString("state"))

    val dob = result.getMap("dateOfBirth")
    assertNotNull(dob)
    assertEquals(15, dob!!.getInt("day"))
    assertEquals(6, dob.getInt("month"))
    assertEquals(1990, dob.getInt("year"))
  }

  @Test
  fun mapFromKycInfo_AllNullFields() {
    val kycInfo =
      KycInfo(
        firstName = null,
        lastName = null,
        idNumber = null,
        address = null,
        dateOfBirth = null,
      )
    val result = mapFromKycInfo(kycInfo)

    assertFalse(result.hasKey("firstName"))
    assertFalse(result.hasKey("lastName"))
    assertFalse(result.hasKey("idNumber"))
    assertFalse(result.hasKey("address"))
    assertFalse(result.hasKey("dateOfBirth"))
  }

  @Test
  fun mapFromKycInfo_PartialFields() {
    val kycInfo =
      KycInfo(
        firstName = "Jane",
        lastName = null,
        idNumber = null,
        address = null,
        dateOfBirth = DateOfBirth(day = 1, month = 1, year = 2000),
      )
    val result = mapFromKycInfo(kycInfo)

    assertEquals("Jane", result.getString("firstName"))
    assertFalse(result.hasKey("lastName"))
    assertFalse(result.hasKey("idNumber"))
    assertFalse(result.hasKey("address"))

    val dob = result.getMap("dateOfBirth")
    assertNotNull(dob)
    assertEquals(1, dob!!.getInt("day"))
    assertEquals(1, dob.getInt("month"))
    assertEquals(2000, dob.getInt("year"))
  }

  @Test
  fun mapFromKycInfo_AddressWithPartialFields() {
    val kycInfo =
      KycInfo(
        firstName = null,
        lastName = null,
        idNumber = null,
        address =
          PaymentSheet.Address(
            city = "New York",
            country = "US",
            line1 = null,
            line2 = null,
            postalCode = null,
            state = null,
          ),
        dateOfBirth = null,
      )
    val result = mapFromKycInfo(kycInfo)

    val address = result.getMap("address")
    assertNotNull(address)
    assertEquals("New York", address!!.getString("city"))
    assertEquals("US", address.getString("country"))
    assertFalse(address.hasKey("line1"))
    assertFalse(address.hasKey("line2"))
    assertFalse(address.hasKey("postalCode"))
    assertFalse(address.hasKey("state"))
  }
}
