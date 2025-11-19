package com.reactnativestripesdk

import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentelement.PaymentMethodOptionsSetupFutureUsagePreview
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
@OptIn(PaymentMethodOptionsSetupFutureUsagePreview::class)
class PaymentSheetManagerTest {
  // ============================================
  // mapToCollectionMode Tests
  // ============================================

  @Test
  fun mapToCollectionMode_ValidValues() {
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      mapToCollectionMode("automatic"),
    )
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Never,
      mapToCollectionMode("never"),
    )
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Always,
      mapToCollectionMode("always"),
    )
  }

  @Test
  fun mapToCollectionMode_InvalidValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      mapToCollectionMode("invalid"),
    )
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      mapToCollectionMode(""),
    )
  }

  @Test
  fun mapToCollectionMode_NullValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      mapToCollectionMode(null),
    )
  }

  // ============================================
  // mapToPaymentMethodLayout Tests
  // ============================================

  @Test
  fun mapToPaymentMethodLayout_ValidValues() {
    assertEquals(
      PaymentSheet.PaymentMethodLayout.Horizontal,
      mapToPaymentMethodLayout("Horizontal"),
    )
    assertEquals(
      PaymentSheet.PaymentMethodLayout.Vertical,
      mapToPaymentMethodLayout("Vertical"),
    )
    assertEquals(
      PaymentSheet.PaymentMethodLayout.Automatic,
      mapToPaymentMethodLayout("Automatic"),
    )
  }

  @Test
  fun mapToPaymentMethodLayout_InvalidValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.PaymentMethodLayout.Automatic,
      mapToPaymentMethodLayout("invalid"),
    )
    assertEquals(
      PaymentSheet.PaymentMethodLayout.Automatic,
      mapToPaymentMethodLayout(""),
    )
  }

  @Test
  fun mapToPaymentMethodLayout_NullValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.PaymentMethodLayout.Automatic,
      mapToPaymentMethodLayout(null),
    )
  }

  // ============================================
  // mapToAddressCollectionMode Tests
  // ============================================

  @Test
  fun mapToAddressCollectionMode_ValidValues() {
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      mapToAddressCollectionMode("automatic"),
    )
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Never,
      mapToAddressCollectionMode("never"),
    )
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Full,
      mapToAddressCollectionMode("full"),
    )
  }

  @Test
  fun mapToAddressCollectionMode_InvalidValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      mapToAddressCollectionMode("invalid"),
    )
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      mapToAddressCollectionMode(""),
    )
  }

  @Test
  fun mapToAddressCollectionMode_NullValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      mapToAddressCollectionMode(null),
    )
  }

  // ============================================
  // mapToCardBrandCategory Tests
  // ============================================

  @Test
  fun mapToCardBrandCategory_ValidValues() {
    assertEquals(
      PaymentSheet.CardBrandAcceptance.BrandCategory.Visa,
      mapToCardBrandCategory("visa"),
    )
    assertEquals(
      PaymentSheet.CardBrandAcceptance.BrandCategory.Mastercard,
      mapToCardBrandCategory("mastercard"),
    )
    assertEquals(
      PaymentSheet.CardBrandAcceptance.BrandCategory.Amex,
      mapToCardBrandCategory("amex"),
    )
    assertEquals(
      PaymentSheet.CardBrandAcceptance.BrandCategory.Discover,
      mapToCardBrandCategory("discover"),
    )
  }

  @Test
  fun mapToCardBrandCategory_InvalidValue_ReturnsNull() {
    assertEquals(null, mapToCardBrandCategory("invalid"))
    assertEquals(null, mapToCardBrandCategory(""))
    assertEquals(null, mapToCardBrandCategory("unknown"))
  }

  // ============================================
  // mapToCardBrandAcceptance Tests
  // ============================================

  @Test
  fun mapToCardBrandAcceptance_NullParams_ReturnsAll() {
    val result = mapToCardBrandAcceptance(null)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_NoCardBrandAcceptanceKey_ReturnsAll() {
    val params =
      readableMapOf(
        "someOtherKey" to "value",
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "all",
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterAllowed_WithBrands() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "allowed",
            "brands" to readableArrayOf("visa", "mastercard"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterAllowed_EmptyBrands_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "allowed",
            "brands" to readableArrayOf(),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterAllowed_NullBrands_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "allowed",
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterAllowed_InvalidBrands_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "allowed",
            "brands" to readableArrayOf("invalid", "unknown"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterAllowed_MixedValidInvalidBrands() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "allowed",
            "brands" to readableArrayOf("visa", "invalid", "amex"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterDisallowed_WithBrands() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "disallowed",
            "brands" to readableArrayOf("amex", "discover"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterDisallowed_EmptyBrands_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "disallowed",
            "brands" to readableArrayOf(),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterDisallowed_NullBrands_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "disallowed",
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterDisallowed_InvalidBrands_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "disallowed",
            "brands" to readableArrayOf("invalid", "unknown"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_FilterDisallowed_MixedValidInvalidBrands() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "disallowed",
            "brands" to readableArrayOf("mastercard", "invalid", "discover"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_InvalidFilter_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "filter" to "invalid",
            "brands" to readableArrayOf("visa"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  @Test
  fun mapToCardBrandAcceptance_NullFilter_ReturnsAll() {
    val params =
      readableMapOf(
        "cardBrandAcceptance" to
          readableMapOf(
            "brands" to readableArrayOf("visa"),
          ),
      )
    val result = mapToCardBrandAcceptance(params)
    assertNotNull(result)
  }

  // ============================================
  // mapToSetupFutureUse Tests
  // ============================================

  @Test
  fun mapToSetupFutureUse_ValidValues() {
    assertEquals(
      PaymentSheet.IntentConfiguration.SetupFutureUse.OffSession,
      mapToSetupFutureUse("OffSession"),
    )
    assertEquals(
      PaymentSheet.IntentConfiguration.SetupFutureUse.OnSession,
      mapToSetupFutureUse("OnSession"),
    )
    assertEquals(
      PaymentSheet.IntentConfiguration.SetupFutureUse.None,
      mapToSetupFutureUse("None"),
    )
  }

  @Test
  fun mapToSetupFutureUse_InvalidValue_ReturnsNull() {
    assertEquals(null, mapToSetupFutureUse("Unknown"))
    assertEquals(null, mapToSetupFutureUse("OneTime"))
    assertEquals(null, mapToSetupFutureUse("invalid"))
    assertEquals(null, mapToSetupFutureUse(""))
  }

  @Test
  fun mapToSetupFutureUse_NullValue_ReturnsNull() {
    assertEquals(null, mapToSetupFutureUse(null))
  }

  // ============================================
  // mapToCaptureMethod Tests
  // ============================================

  @Test
  fun mapToCaptureMethod_ValidValues() {
    assertEquals(
      PaymentSheet.IntentConfiguration.CaptureMethod.Automatic,
      mapToCaptureMethod("Automatic"),
    )
    assertEquals(
      PaymentSheet.IntentConfiguration.CaptureMethod.Manual,
      mapToCaptureMethod("Manual"),
    )
    assertEquals(
      PaymentSheet.IntentConfiguration.CaptureMethod.AutomaticAsync,
      mapToCaptureMethod("AutomaticAsync"),
    )
  }

  @Test
  fun mapToCaptureMethod_InvalidValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.IntentConfiguration.CaptureMethod.Automatic,
      mapToCaptureMethod("invalid"),
    )
    assertEquals(
      PaymentSheet.IntentConfiguration.CaptureMethod.Automatic,
      mapToCaptureMethod(""),
    )
  }

  @Test
  fun mapToCaptureMethod_NullValue_DefaultsToAutomatic() {
    assertEquals(
      PaymentSheet.IntentConfiguration.CaptureMethod.Automatic,
      mapToCaptureMethod(null),
    )
  }

  // ============================================
  // mapToPaymentMethodOptions Tests
  // ============================================

  @Test
  fun mapToPaymentMethodOptions_NullOptions_ReturnsNull() {
    assertEquals(null, mapToPaymentMethodOptions(null))
  }

  @Test
  fun mapToPaymentMethodOptions_ValidOptions() {
    val options =
      readableMapOf(
        "setupFutureUsageValues" to
          readableMapOf(
            "card" to "OffSession",
            "us_bank_account" to "OnSession",
          ),
      )

    val result = mapToPaymentMethodOptions(options)

    assertNotNull(result)
  }

  @Test
  fun mapToPaymentMethodOptions_EmptyMap_ReturnsNull() {
    val options =
      readableMapOf(
        "setupFutureUsageValues" to readableMapOf(),
      )

    val result = mapToPaymentMethodOptions(options)

    assertEquals(null, result)
  }

  @Test
  fun mapToPaymentMethodOptions_InvalidPaymentMethodCodes_ReturnsNull() {
    val options =
      readableMapOf(
        "setupFutureUsageValues" to
          readableMapOf(
            "invalid_code" to "OffSession",
            "another_invalid" to "OnSession",
          ),
      )

    val result = mapToPaymentMethodOptions(options)

    assertEquals(null, result)
  }

  @Test
  fun mapToPaymentMethodOptions_MixedValidInvalidCodes() {
    val options =
      readableMapOf(
        "setupFutureUsageValues" to
          readableMapOf(
            "card" to "OffSession",
            "invalid_code" to "OnSession",
            "us_bank_account" to "None",
          ),
      )

    val result = mapToPaymentMethodOptions(options)

    assertNotNull(result)
  }

  @Test
  fun mapToPaymentMethodOptions_InvalidSetupFutureUsageValue_SkipsThatEntry() {
    val options =
      readableMapOf(
        "setupFutureUsageValues" to
          readableMapOf(
            "card" to "InvalidValue",
            "us_bank_account" to "OnSession",
          ),
      )

    val result = mapToPaymentMethodOptions(options)

    assertNotNull(result)
  }
}
