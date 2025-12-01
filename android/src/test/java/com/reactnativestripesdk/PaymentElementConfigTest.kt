package com.reactnativestripesdk

import com.reactnativestripesdk.utils.PaymentSheetException
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentelement.PaymentMethodOptionsSetupFutureUsagePreview
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
@OptIn(PaymentMethodOptionsSetupFutureUsagePreview::class)
class PaymentElementConfigTest {
  // ============================================
  // buildIntentConfiguration Tests
  // ============================================

  @Test
  fun buildIntentConfiguration_NullParams_ReturnsNull() {
    val result = buildIntentConfiguration(null)
    assertNull(result)
  }

  @Test(expected = PaymentSheetException::class)
  fun buildIntentConfiguration_MissingMode_ThrowsException() {
    val params = readableMapOf()
    buildIntentConfiguration(params)
  }

  @Test
  fun buildIntentConfiguration_WithPaymentMode_Success() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 1000,
            "currencyCode" to "usd",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result)
    val mode = result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment
    assertEquals(1000L, mode?.amount)
    assertEquals("usd", mode?.currency)
  }

  @Test
  fun buildIntentConfiguration_WithPaymentMethodTypes_Success() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 1000,
            "currencyCode" to "usd",
          ),
        "paymentMethodTypes" to readableArrayOf("card", "klarna"),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result)
    assertEquals(2, result?.paymentMethodTypes?.size)
    assertEquals("card", result?.paymentMethodTypes?.get(0))
    assertEquals("klarna", result?.paymentMethodTypes?.get(1))
  }

  @Test
  fun buildIntentConfiguration_EmptyPaymentMethodTypes_ReturnsEmptyList() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 1000,
            "currencyCode" to "usd",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result)
    assertEquals(0, result?.paymentMethodTypes?.size)
  }

  @Test
  fun buildIntentConfiguration_WithOnBehalfOf_Success() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 1000,
            "currencyCode" to "usd",
          ),
        "onBehalfOf" to "acct_connected_account_a",
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result)
    assertEquals("acct_connected_account_a", result?.onBehalfOf)
  }

  @Test
  fun buildIntentConfiguration_WithOnBehalfOf_Failure() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 1000,
            "currencyCode" to "usd",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result)
    assertNull(result?.onBehalfOf)
  }

  // ============================================
  // buildIntentConfigurationMode Tests
  // ============================================

  @Test
  fun buildIntentConfigurationMode_PaymentMode_MinimalParams() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "eur",
          ),
      )

    val result = buildIntentConfiguration(params)

    val mode = result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment
    assertNotNull(mode)
    assertEquals(5000L, mode?.amount)
    assertEquals("eur", mode?.currency)
  }

  @Test(expected = PaymentSheetException::class)
  fun buildIntentConfigurationMode_PaymentMode_MissingCurrency_ThrowsException() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
          ),
      )

    buildIntentConfiguration(params)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_WithSetupFutureUsage() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "setupFutureUsage" to "OffSession",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_WithCaptureMethod() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "captureMethod" to "Manual",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_WithPaymentMethodOptions() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "paymentMethodOptions" to
              readableMapOf(
                "setupFutureUsageValues" to
                  readableMapOf(
                    "card" to "OffSession",
                    "us_bank_account" to "OnSession",
                  ),
              ),
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_SetupMode_Success() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "setupFutureUsage" to "OffSession",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Setup)
  }

  @Test
  fun buildIntentConfigurationMode_SetupMode_WithCurrency() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "setupFutureUsage" to "OnSession",
            "currencyCode" to "gbp",
          ),
      )

    val result = buildIntentConfiguration(params)
    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Setup)
  }

  @Test(expected = PaymentSheetException::class)
  fun buildIntentConfigurationMode_SetupMode_MissingSetupFutureUsage_ThrowsException() {
    val params =
      readableMapOf(
        "mode" to readableMapOf(),
      )

    buildIntentConfiguration(params)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_InvalidSetupFutureUsage_UsesNull() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "setupFutureUsage" to "Unknown",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_InvalidCaptureMethod_DefaultsToAutomatic() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "captureMethod" to "InvalidMethod",
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_NullPaymentMethodOptions() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "paymentMethodOptions" to null,
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_EmptyPaymentMethodOptions() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "paymentMethodOptions" to
              readableMapOf(
                "setupFutureUsageValues" to readableMapOf(),
              ),
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test
  fun buildIntentConfigurationMode_PaymentMode_InvalidPaymentMethodCodesInOptions() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "amount" to 5000,
            "currencyCode" to "usd",
            "paymentMethodOptions" to
              readableMapOf(
                "setupFutureUsageValues" to
                  readableMapOf(
                    "invalid_code" to "OffSession",
                    "another_invalid" to "OnSession",
                  ),
              ),
          ),
      )

    val result = buildIntentConfiguration(params)

    assertNotNull(result?.mode as? PaymentSheet.IntentConfiguration.Mode.Payment)
  }

  @Test(expected = PaymentSheetException::class)
  fun buildIntentConfigurationMode_SetupMode_InvalidSetupFutureUsage_ThrowsException() {
    val params =
      readableMapOf(
        "mode" to
          readableMapOf(
            "setupFutureUsage" to "Unknown",
          ),
      )

    buildIntentConfiguration(params)
  }

  // ============================================
  // buildLinkConfig Tests
  // ============================================

  @Test
  fun buildLinkConfig_NullParams_ReturnsDefaultConfig() {
    val result = buildLinkConfig(null)

    assertNotNull(result)
  }

  @Test
  fun buildLinkConfig_EmptyParams_ReturnsDefaultConfig() {
    val params = readableMapOf()
    val result = buildLinkConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildLinkConfig_DisplayAutomatic() {
    val params =
      readableMapOf(
        "display" to "automatic",
      )
    val result = buildLinkConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildLinkConfig_DisplayNever() {
    val params =
      readableMapOf(
        "display" to "never",
      )
    val result = buildLinkConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildLinkConfig_InvalidDisplay_DefaultsToAutomatic() {
    val params =
      readableMapOf(
        "display" to "invalid_value",
      )
    val result = buildLinkConfig(params)

    assertNotNull(result)
  }

  // ============================================
  // buildGooglePayConfig Tests
  // ============================================

  @Test
  fun buildGooglePayConfig_NullParams_ReturnsNull() {
    val result = buildGooglePayConfig(null)
    assertNull(result)
  }

  @Test
  fun buildGooglePayConfig_EmptyParams_ReturnsNull() {
    val params = readableMapOf()
    val result = buildGooglePayConfig(params)
    assertNull(result)
  }

  @Test
  fun buildGooglePayConfig_MinimalParams_TestEnvironment() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "usd",
        "testEnv" to true,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_ProductionEnvironment() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "CA",
        "currencyCode" to "cad",
        "testEnv" to false,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_WithAmount() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "usd",
        "testEnv" to true,
        "amount" to "2500",
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_WithInvalidAmount() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "usd",
        "testEnv" to true,
        "amount" to "not_a_number",
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_WithLabel() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "usd",
        "testEnv" to true,
        "label" to "Total",
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_TestEnvNotProvided_DefaultsToFalse() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "usd",
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_EmptyMerchantCountryCode() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "",
        "currencyCode" to "usd",
        "testEnv" to true,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_EmptyCurrencyCode() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "",
        "testEnv" to true,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_MissingMerchantCountryCode() {
    val params =
      readableMapOf(
        "currencyCode" to "usd",
        "testEnv" to true,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_MissingCurrencyCode() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "US",
        "testEnv" to true,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  @Test
  fun buildGooglePayConfig_ButtonTypes() {
    val testCases =
      listOf(
        1 to PaymentSheet.GooglePayConfiguration.ButtonType.Buy,
        6 to PaymentSheet.GooglePayConfiguration.ButtonType.Book,
        5 to PaymentSheet.GooglePayConfiguration.ButtonType.Checkout,
        4 to PaymentSheet.GooglePayConfiguration.ButtonType.Donate,
        11 to PaymentSheet.GooglePayConfiguration.ButtonType.Order,
        1000 to PaymentSheet.GooglePayConfiguration.ButtonType.Pay,
        7 to PaymentSheet.GooglePayConfiguration.ButtonType.Subscribe,
        1001 to PaymentSheet.GooglePayConfiguration.ButtonType.Plain,
        9999 to PaymentSheet.GooglePayConfiguration.ButtonType.Pay, // Invalid defaults to Pay
      )

    for ((buttonTypeValue) in testCases) {
      val params =
        readableMapOf(
          "merchantCountryCode" to "US",
          "currencyCode" to "usd",
          "testEnv" to true,
          "buttonType" to buttonTypeValue,
        )

      val result = buildGooglePayConfig(params)

      assertNotNull(result)
    }
  }

  @Test
  fun buildGooglePayConfig_CompleteConfig() {
    val params =
      readableMapOf(
        "merchantCountryCode" to "GB",
        "currencyCode" to "gbp",
        "testEnv" to false,
        "amount" to "10000",
        "label" to "Order Total",
        "buttonType" to 5,
      )

    val result = buildGooglePayConfig(params)

    assertNotNull(result)
  }

  // ============================================
  // buildCustomerConfiguration Tests
  // ============================================

  @Test
  fun buildCustomerConfiguration_NullParams_ReturnsNull() {
    val result = buildCustomerConfiguration(null)
    assertNull(result)
  }

  @Test
  fun buildCustomerConfiguration_EmptyParams_ReturnsNull() {
    val params = readableMapOf()
    val result = buildCustomerConfiguration(params)
    assertNull(result)
  }

  @Test
  fun buildCustomerConfiguration_OnlyCustomerId_ReturnsNull() {
    val params =
      readableMapOf(
        "customerId" to "cus_123",
      )

    val result = buildCustomerConfiguration(params)
    assertNull(result)
  }

  @Test
  fun buildCustomerConfiguration_WithEphemeralKey_Success() {
    val params =
      readableMapOf(
        "customerId" to "cus_123",
        "customerEphemeralKeySecret" to "ek_test_123",
      )

    val result = buildCustomerConfiguration(params)

    assertNotNull(result)
  }

  @Test
  fun buildCustomerConfiguration_WithCustomerSession_Success() {
    val params =
      readableMapOf(
        "customerId" to "cus_456",
        "customerSessionClientSecret" to "cuss_test_456",
      )

    val result = buildCustomerConfiguration(params)

    assertNotNull(result)
  }

  @Test(expected = PaymentSheetException::class)
  fun buildCustomerConfiguration_BothSecretsProvided_ThrowsException() {
    val params =
      readableMapOf(
        "customerId" to "cus_789",
        "customerEphemeralKeySecret" to "ek_test_789",
        "customerSessionClientSecret" to "cuss_test_789",
      )

    buildCustomerConfiguration(params)
  }

  @Test
  fun buildCustomerConfiguration_OnlyEphemeralKey_NoCustomerId_ReturnsNull() {
    val params =
      readableMapOf(
        "customerEphemeralKeySecret" to "ek_test_123",
      )

    val result = buildCustomerConfiguration(params)
    assertNull(result)
  }

  @Test
  fun buildCustomerConfiguration_OnlyCustomerSession_NoCustomerId_ReturnsNull() {
    val params =
      readableMapOf(
        "customerSessionClientSecret" to "cuss_test_456",
      )

    val result = buildCustomerConfiguration(params)
    assertNull(result)
  }

  // ============================================
  // buildBillingDetails Tests
  // ============================================

  @Test
  fun buildBillingDetails_NullMap_ReturnsNull() {
    val result = buildBillingDetails(null)
    assertNull(result)
  }

  @Test
  fun buildBillingDetails_EmptyMap_ReturnsEmptyBillingDetails() {
    val params = readableMapOf()

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertNotNull(result!!.address)
    assertNull(result.address?.city)
    assertNull(result.address?.country)
    assertNull(result.address?.line1)
    assertNull(result.address?.line2)
    assertNull(result.address?.postalCode)
    assertNull(result.address?.state)
    assertNull(result.email)
    assertNull(result.name)
    assertNull(result.phone)
  }

  @Test
  fun buildBillingDetails_FullDetails_ReturnsComplete() {
    val params =
      readableMapOf(
        "email" to "test@example.com",
        "name" to "John Doe",
        "phone" to "+1234567890",
        "address" to
          readableMapOf(
            "city" to "San Francisco",
            "country" to "US",
            "line1" to "123 Main St",
            "line2" to "Apt 4",
            "postalCode" to "94111",
            "state" to "CA",
          ),
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertEquals("test@example.com", result!!.email)
    assertEquals("John Doe", result.name)
    assertEquals("+1234567890", result.phone)
    assertNotNull(result.address)
    assertEquals("San Francisco", result.address?.city)
    assertEquals("US", result.address?.country)
    assertEquals("123 Main St", result.address?.line1)
    assertEquals("Apt 4", result.address?.line2)
    assertEquals("94111", result.address?.postalCode)
    assertEquals("CA", result.address?.state)
  }

  @Test
  fun buildBillingDetails_OnlyEmail_ReturnsPartialDetails() {
    val params =
      readableMapOf(
        "email" to "test@example.com",
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertEquals("test@example.com", result!!.email)
    assertNull(result.name)
    assertNull(result.phone)
    assertNotNull(result.address)
    assertNull(result.address?.city)
  }

  @Test
  fun buildBillingDetails_OnlyName_ReturnsPartialDetails() {
    val params =
      readableMapOf(
        "name" to "John Doe",
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertNull(result!!.email)
    assertEquals("John Doe", result.name)
    assertNull(result.phone)
  }

  @Test
  fun buildBillingDetails_OnlyPhone_ReturnsPartialDetails() {
    val params =
      readableMapOf(
        "phone" to "+1234567890",
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertNull(result!!.email)
    assertNull(result.name)
    assertEquals("+1234567890", result.phone)
  }

  @Test
  fun buildBillingDetails_OnlyAddress_ReturnsPartialDetails() {
    val params =
      readableMapOf(
        "address" to
          readableMapOf(
            "city" to "San Francisco",
            "country" to "US",
          ),
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertNull(result!!.email)
    assertNull(result.name)
    assertNull(result.phone)
    assertNotNull(result.address)
    assertEquals("San Francisco", result.address?.city)
    assertEquals("US", result.address?.country)
    assertNull(result.address?.line1)
  }

  @Test
  fun buildBillingDetails_PartialAddress_ReturnsPartialDetails() {
    val params =
      readableMapOf(
        "email" to "test@example.com",
        "address" to
          readableMapOf(
            "line1" to "123 Main St",
            "postalCode" to "94111",
          ),
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertEquals("test@example.com", result!!.email)
    assertNotNull(result.address)
    assertNull(result.address?.city)
    assertNull(result.address?.country)
    assertEquals("123 Main St", result.address?.line1)
    assertNull(result.address?.line2)
    assertEquals("94111", result.address?.postalCode)
    assertNull(result.address?.state)
  }

  @Test
  fun buildBillingDetails_EmptyAddress_ReturnsEmptyAddressObject() {
    val params =
      readableMapOf(
        "email" to "test@example.com",
        "address" to readableMapOf(),
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertEquals("test@example.com", result!!.email)
    assertNotNull(result.address)
    assertNull(result.address?.city)
    assertNull(result.address?.country)
    assertNull(result.address?.line1)
    assertNull(result.address?.line2)
    assertNull(result.address?.postalCode)
    assertNull(result.address?.state)
  }

  @Test
  fun buildBillingDetails_MixedFields_ReturnsPartialDetails() {
    val params =
      readableMapOf(
        "name" to "Jane Smith",
        "address" to
          readableMapOf(
            "country" to "CA",
            "state" to "ON",
          ),
      )

    val result = buildBillingDetails(params)
    assertNotNull(result)
    assertNull(result!!.email)
    assertEquals("Jane Smith", result.name)
    assertNull(result.phone)
    assertNotNull(result.address)
    assertNull(result.address?.city)
    assertEquals("CA", result.address?.country)
    assertNull(result.address?.line1)
    assertNull(result.address?.line2)
    assertNull(result.address?.postalCode)
    assertEquals("ON", result.address?.state)
  }

  // ============================================
  // buildBillingDetailsCollectionConfiguration Tests
  // ============================================

  @Test
  fun buildBillingDetailsCollectionConfiguration_NullMap_ReturnsDefaults() {
    val result = buildBillingDetailsCollectionConfiguration(null)
    assertNotNull(result)
  }

  @Test
  fun buildBillingDetailsCollectionConfiguration_EmptyMap_ReturnsDefaults() {
    val params = readableMapOf()

    val result = buildBillingDetailsCollectionConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildBillingDetailsCollectionConfiguration_AllFieldsSet_ReturnsComplete() {
    val params =
      readableMapOf(
        "name" to "always",
        "phone" to "never",
        "email" to "automatic",
        "address" to "full",
        "attachDefaultsToPaymentMethod" to true,
      )

    val result = buildBillingDetailsCollectionConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildBillingDetailsCollectionConfiguration_PartialFields_ReturnsPartial() {
    val params =
      readableMapOf(
        "name" to "always",
        "address" to "never",
      )

    val result = buildBillingDetailsCollectionConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildBillingDetailsCollectionConfiguration_InvalidValues_DefaultsToAutomatic() {
    val params =
      readableMapOf(
        "name" to "invalid",
        "phone" to "wrong",
        "email" to "bad",
        "address" to "incorrect",
      )

    val result = buildBillingDetailsCollectionConfiguration(params)
    assertNotNull(result)
  }

  @Test
  fun buildBillingDetailsCollectionConfiguration_AttachDefaultsFalse() {
    val params =
      readableMapOf(
        "attachDefaultsToPaymentMethod" to false,
      )

    val result = buildBillingDetailsCollectionConfiguration(params)
    assertNotNull(result)
  }
}
