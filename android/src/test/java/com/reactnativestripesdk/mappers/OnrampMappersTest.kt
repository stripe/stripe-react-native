@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk.mappers

import android.annotation.SuppressLint
import androidx.compose.ui.graphics.toArgb
import com.facebook.react.bridge.ReadableArray
import com.reactnativestripesdk.ComplianceIdentifierFieldException
import com.reactnativestripesdk.InvalidIdentifiersArrayException
import com.reactnativestripesdk.mapAppearance
import com.reactnativestripesdk.mapConfig
import com.reactnativestripesdk.mapFromComplianceIdentifierRequirements
import com.reactnativestripesdk.mapFromKycInfo
import com.reactnativestripesdk.mapFromSubmitIdentifiersResult
import com.reactnativestripesdk.mapGooglePayConfig
import com.reactnativestripesdk.mapPaymentDetailsType
import com.reactnativestripesdk.mapToComplianceIdentifiers
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.model.KycInfo
import com.stripe.android.crypto.onramp.model.PaymentMethodDisplayData
import com.stripe.android.crypto.onramp.model.compliance.ComplianceIdentifierAlternativeGroup
import com.stripe.android.crypto.onramp.model.compliance.ComplianceIdentifierRequirement
import com.stripe.android.crypto.onramp.model.compliance.ComplianceIdentifierRequirements
import com.stripe.android.crypto.onramp.model.compliance.ComplianceIdentifierType
import com.stripe.android.crypto.onramp.model.compliance.ComplianceRegulation
import com.stripe.android.crypto.onramp.model.compliance.SubmitIdentifiersResult
import com.stripe.android.googlepaylauncher.GooglePayEnvironment
import com.stripe.android.googlepaylauncher.GooglePayPaymentMethodLauncher
import com.stripe.android.link.LinkAppearance.Style
import com.stripe.android.model.DateOfBirth
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@Suppress("LargeClass")
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
  fun mapAppearance_WithPrimaryButton_HeightOnly() {
    val primaryButton =
      readableMapOf(
        "height" to 48.0,
      )
    val appearanceMap =
      readableMapOf(
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertNull(state.primaryButton.cornerRadiusDp)
    assertEquals(48f, state.primaryButton.heightDp)
  }

  @Test
  fun mapAppearance_WithPrimaryButton_EmptyMap() {
    val primaryButton = readableMapOf()
    val appearanceMap =
      readableMapOf(
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertNull(state.primaryButton.cornerRadiusDp)
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
  fun mapPaymentDetailsType_MapsAllSupportedTypes() {
    assertEquals("Card", mapPaymentDetailsType(PaymentMethodDisplayData.Type.Card))
    assertEquals("BankAccount", mapPaymentDetailsType(PaymentMethodDisplayData.Type.BankAccount))
    assertEquals("GooglePay", mapPaymentDetailsType(PaymentMethodDisplayData.Type.GooglePay))
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

  @Test
  fun mapToComplianceIdentifiers_ValidIdentifiers_TrimsAndMapsValues() {
    val identifiers =
      readableArrayOf(
        readableMapOf(
          "type" to " AT_STN ",
          "value" to " 123456789 ",
        ),
        readableMapOf(
          "type" to "DE_STN",
          "value" to "987654321",
        ),
      )

    val result = mapToComplianceIdentifiers(identifiers)

    assertEquals(2, result.size)
    val first = result[0].`build$crypto_onramp_release`()
    val second = result[1].`build$crypto_onramp_release`()
    assertEquals("AT_STN", first.type.value)
    assertEquals("123456789", first.value)
    assertEquals("DE_STN", second.type.value)
    assertEquals("987654321", second.value)
  }

  @Test
  fun mapToComplianceIdentifiers_BlankType_ThrowsFieldException() {
    val identifiers =
      readableArrayOf(
        readableMapOf(
          "type" to "   ",
          "value" to "123456789",
        ),
      )

    val error =
      assertThrows(ComplianceIdentifierFieldException::class.java) {
        mapToComplianceIdentifiers(identifiers)
      }

    assertEquals("Invalid format for field: type", error.message)
  }

  @Test
  fun mapToComplianceIdentifiers_BlankValue_ThrowsFieldException() {
    val identifiers =
      readableArrayOf(
        readableMapOf(
          "type" to "AT_STN",
          "value" to "   ",
        ),
      )

    val error =
      assertThrows(ComplianceIdentifierFieldException::class.java) {
        mapToComplianceIdentifiers(identifiers)
      }

    assertEquals("Invalid format for field: value", error.message)
  }

  @Test
  fun mapToComplianceIdentifiers_NonMapEntry_ThrowsInvalidArrayException() {
    val identifiers = readableArrayOf("AT_STN")

    val error =
      assertThrows(InvalidIdentifiersArrayException::class.java) {
        mapToComplianceIdentifiers(identifiers)
      }

    assertEquals(
      "Unexpected format of identifiers array. Expected dictionaries with String keys.",
      error.message,
    )
  }

  @Test
  fun mapFromComplianceIdentifierRequirements_MapsIdentifiersAndAlternatives() {
    val requirements =
      ComplianceIdentifierRequirements(
        identifiers =
          listOf(
            ComplianceIdentifierRequirement(
              ComplianceIdentifierType("AT_STN"),
              ComplianceRegulation.EuCarf,
            ),
            ComplianceIdentifierRequirement(
              ComplianceIdentifierType("DE_STN"),
              ComplianceRegulation.EuMica,
            ),
          ),
        alternatives =
          listOf(
            ComplianceIdentifierAlternativeGroup(
              originalMissingIdentifiers =
                listOf(
                  ComplianceIdentifierType("AT_STN"),
                  ComplianceIdentifierType("DE_STN"),
                ),
              alternativeMissingIdentifiers =
                listOf(
                  ComplianceIdentifierType("FR_SPI"),
                ),
            ),
          ),
      )

    val result = mapFromComplianceIdentifierRequirements(requirements)

    val identifierMaps = result.getArray("identifiers")!!
    assertEquals(2, identifierMaps.size())
    assertEquals("AT_STN", identifierMaps.getMap(0)!!.getString("type"))
    assertEquals("eu_carf", identifierMaps.getMap(0)!!.getString("regulation"))
    assertEquals("DE_STN", identifierMaps.getMap(1)!!.getString("type"))
    assertEquals("eu_mica", identifierMaps.getMap(1)!!.getString("regulation"))

    val alternativeGroups = result.getArray("alternatives")!!
    assertEquals(1, alternativeGroups.size())
    val firstGroup = alternativeGroups.getMap(0)!!
    assertEquals(
      listOf("AT_STN", "DE_STN"),
      firstGroup.getArray("originalMissingIdentifiers")!!.asStringList(),
    )
    assertEquals(
      listOf("FR_SPI"),
      firstGroup.getArray("alternativeMissingIdentifiers")!!.asStringList(),
    )
  }

  @Test
  fun mapFromSubmitIdentifiersResult_MapsValidityIdentifiersAlternativesAndInvalidIdentifiers() {
    val result =
      SubmitIdentifiersResult(
        valid = false,
        identifiers =
          listOf(
            ComplianceIdentifierRequirement(
              ComplianceIdentifierType("AT_STN"),
              ComplianceRegulation.EuCarf,
            ),
          ),
        alternatives =
          listOf(
            ComplianceIdentifierAlternativeGroup(
              originalMissingIdentifiers = listOf(ComplianceIdentifierType("DE_STN")),
              alternativeMissingIdentifiers = listOf(ComplianceIdentifierType("FR_SPI")),
            ),
          ),
        invalidIdentifiers =
          listOf(
            ComplianceIdentifierType("AT_STN"),
            ComplianceIdentifierType("FR_SPI"),
          ),
      )

    val mapped = mapFromSubmitIdentifiersResult(result)

    assertFalse(mapped.getBoolean("valid"))
    assertEquals("AT_STN", mapped.getArray("identifiers")!!.getMap(0)!!.getString("type"))
    assertEquals(
      listOf("DE_STN"),
      mapped.getArray("alternatives")!!
        .getMap(0)!!
        .getArray("originalMissingIdentifiers")!!
        .asStringList(),
    )
    assertEquals(
      listOf("AT_STN", "FR_SPI"),
      mapped.getArray("invalidIdentifiers")!!.asStringList(),
    )
  }

  private fun ReadableArray.asStringList(): List<String> =
    (0 until size()).map { index -> getString(index)!! }
}
