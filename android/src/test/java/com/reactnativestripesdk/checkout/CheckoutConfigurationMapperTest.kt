package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.elements.PaymentElement
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class CheckoutConfigurationMapperTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()

  @Test
  @Suppress("LongMethod")
  fun `map accepts every reviewed configuration field`() {
    val result = CheckoutConfigurationMapper.map(
      params =
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
          "merchantDisplayName" to "Example Store",
          "style" to "alwaysDark",
          "defaults" to
            readableMapOf(
              "billingDetails" to
                readableMapOf(
                  "name" to "Jenny Rosen",
                  "address" to address("US"),
                ),
              "shippingDetails" to
                readableMapOf(
                  "name" to "Jenny Rosen",
                  "address" to address("CA"),
                ),
              "email" to "jenny@example.com",
              "phone" to "+15555555555",
            ),
          "paymentElement" to
            readableMapOf(
              "savePaymentMethodOptInBehavior" to "requiresOptOut",
              "appearance" to
                readableMapOf(
                  "colors" to
                    readableMapOf(
                      "light" to readableMapOf("primary" to "#112233"),
                      "dark" to readableMapOf("primary" to "#AABBCC"),
                    ),
                  "primaryButton" to
                    readableMapOf(
                      "colors" to readableMapOf("background" to "#123456"),
                      "shapes" to
                        readableMapOf(
                          "borderRadius" to 8.0,
                          "borderWidth" to 1.0,
                          "height" to 52.0,
                        ),
                    ),
                  "formInsetValues" to
                    readableMapOf(
                      "left" to 16.0,
                      "top" to 8.0,
                      "right" to 16.0,
                      "bottom" to 8.0,
                    ),
                ),
              "preferredNetworks" to readableArrayOf(7, 5),
              "billingDetailsCollectionConfiguration" to
                readableMapOf(
                  "name" to "always",
                  "phone" to "always",
                  "address" to "full",
                  "attachDefaultsToPaymentMethod" to true,
                ),
              "paymentMethodOrder" to readableArrayOf("card", "link"),
              "opensCardScannerAutomatically" to true,
              "termsDisplay" to
                readableMapOf(
                  "card" to "never",
                  "us_bank_account" to "automatic",
                ),
              "paymentMethodLayout" to "Vertical",
              "displaysMandateText" to true,
              "rowSelectionBehavior" to readableMapOf("type" to "immediateAction"),
              "googlePay" to
                readableMapOf(
                  "testEnv" to true,
                  "label" to "Total",
                  "buttonType" to "checkout",
                  "additionalEnabledNetworks" to readableArrayOf("INTERAC"),
                ),
              "link" to readableMapOf("display" to "never"),
            ),
        ),
      context = context,
      didSelectPaymentOption = {},
    )

    assertEquals("cs_test_secret_123", result.clientSecret)
    assertEquals("example://checkout", result.returnURL)
    assertNotNull(result.configuration)
    assertNotNull(result.rowSelectionBehavior)
  }

  @Test
  fun `map uses native defaults when optional values are omitted`() {
    val result = CheckoutConfigurationMapper.map(
      params =
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
        ),
      context = context,
      didSelectPaymentOption = {},
    )

    assertEquals("cs_test_secret_123", result.clientSecret)
    assertEquals("example://checkout", result.returnURL)
    assertNotNull(result.configuration)
    assertNotNull(result.rowSelectionBehavior)
  }

  @Test
  fun `map rejects malformed appearance colors`() {
    assertThrows(PaymentSheetAppearanceException::class.java) {
      CheckoutConfigurationMapper.map(
        params =
          readableMapOf(
            "clientSecret" to "cs_test_secret_123",
            "returnURL" to "example://checkout",
            "paymentElement" to
              readableMapOf(
                "appearance" to
                  readableMapOf(
                    "colors" to readableMapOf("primary" to "#12345"),
                  ),
              ),
          ),
        context = context,
        didSelectPaymentOption = {},
      )
    }
  }

  @Test
  fun `map requires shared cross-platform parameters`() {
    val missingClientSecret = assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.map(
        readableMapOf("returnURL" to "example://checkout"),
        context,
      ) {}
    }
    val missingReturnURL = assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.map(
        readableMapOf("clientSecret" to "cs_test_secret_123"),
        context,
      ) {}
    }

    assertEquals("Checkout configuration requires `clientSecret`.", missingClientSecret.message)
    assertEquals("Checkout configuration requires `returnURL`.", missingReturnURL.message)
  }

  @Test
  fun `map requires country when a default address is present`() {
    val error = assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.map(
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
          "defaults" to
            readableMapOf(
              "billingDetails" to
                readableMapOf(
                  "address" to readableMapOf("city" to "San Francisco"),
                ),
            ),
        ),
        context,
      ) {}
    }

    assertEquals(
      "Checkout configuration requires `defaults.billingDetails.address.country`.",
      error.message,
    )
  }

  @Test
  fun `Checkout-specific billing modes cannot map never`() {
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Always,
      CheckoutConfigurationMapper.mapCollectionMode("always"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      CheckoutConfigurationMapper.mapCollectionMode("never"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Full,
      CheckoutConfigurationMapper.mapAddressCollectionMode("full"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      CheckoutConfigurationMapper.mapAddressCollectionMode("never"),
    )
  }

  @Test
  fun `enum mappers use reviewed values and native defaults`() {
    assertEquals(
      PaymentElement.Configuration.PaymentMethodLayout.Horizontal,
      CheckoutConfigurationMapper.mapPaymentMethodLayout("Horizontal"),
    )
    assertEquals(
      PaymentElement.Configuration.PaymentMethodLayout.Automatic,
      CheckoutConfigurationMapper.mapPaymentMethodLayout("invalid"),
    )
    assertEquals(
      PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Plain,
      CheckoutConfigurationMapper.mapGooglePayButtonType("plain"),
    )
    assertEquals(
      PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Pay,
      CheckoutConfigurationMapper.mapGooglePayButtonType(null),
    )
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.AlwaysLight,
      CheckoutConfigurationMapper.mapThemeMode("alwaysLight"),
    )
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.Automatic,
      CheckoutConfigurationMapper.mapThemeMode(null),
    )
  }

  @Test
  fun `terms mapper drops unknown methods and invalid values`() {
    val terms = CheckoutConfigurationMapper.mapTermsDisplay(
      readableMapOf(
        "card" to "never",
        "us_bank_account" to "automatic",
        "unknown_method" to "never",
        "cashapp" to "invalid",
      ),
    )

    assertEquals(PaymentElement.Configuration.TermsDisplay.NEVER, terms[PaymentMethod.Type.Card])
    assertEquals(
      PaymentElement.Configuration.TermsDisplay.AUTOMATIC,
      terms[PaymentMethod.Type.USBankAccount],
    )
    assertEquals(2, terms.size)
  }

  private fun address(country: String) =
    readableMapOf(
      "country" to country,
      "line1" to "510 Townsend Street",
      "line2" to "Suite 100",
      "city" to "San Francisco",
      "state" to "CA",
      "postalCode" to "94103",
    )
}
