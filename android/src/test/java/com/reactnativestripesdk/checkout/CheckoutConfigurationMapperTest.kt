package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.core.graphics.toColorInt
import androidx.test.core.app.ApplicationProvider
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.elements.PaymentElement
import com.stripe.android.model.CardBrand
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class CheckoutConfigurationMapperTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()

  @Test
  @Suppress("LongMethod")
  fun `map maps supported configuration fields`() {
    var selectionCount = 0
    val result = CheckoutConfigurationMapper.map(
      params =
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
          "merchantDisplayName" to "Example Store",
          "style" to "alwaysDark",
          "defaults" to
            readableMapOf(
              "billingDetails" to contactDetails("US"),
              "shippingDetails" to contactDetails("CA"),
              "email" to "jenny@example.com",
            ),
          "paymentElement" to
            readableMapOf(
              "appearance" to
                readableMapOf(
                  "colors" to
                    readableMapOf(
                      "light" to readableMapOf("primary" to "#112233"),
                      "dark" to readableMapOf("primary" to "#AABBCC"),
                    ),
                  "formInsetValues" to
                    readableMapOf(
                      "left" to 16.0,
                      "top" to 8.0,
                      "right" to 24.0,
                      "bottom" to 32.0,
                    ),
                ),
              "preferredNetworks" to readableArrayOf(7, 5),
              "billingDetailsCollectionConfiguration" to
                readableMapOf(
                  "name" to "always",
                  "address" to "full",
                ),
              "paymentMethodOrder" to readableArrayOf("card", "link"),
              "opensCardScannerAutomatically" to true,
              "termsDisplay" to readableMapOf("card" to "never"),
              "paymentMethodLayout" to "Vertical",
              "displaysMandateText" to true,
              "rowSelectionBehavior" to readableMapOf("type" to "immediateAction"),
              "googlePay" to
                readableMapOf(
                  "label" to "Total",
                  "buttonType" to "checkout",
                  "additionalEnabledNetworks" to readableArrayOf("INTERAC"),
                ),
              "link" to readableMapOf("display" to "never"),
            ),
        ),
      context = context,
      didSelectPaymentOption = { selectionCount += 1 },
    )

    assertEquals("cs_test_secret_123", result.clientSecret)
    assertEquals("example://checkout", result.returnURL)
    assertEquals("Example Store", result.configuration.readField<String>("merchantDisplayName"))

    val defaults = result.configuration.readField<CheckoutController.Configuration.Defaults>("defaults")
    assertContactDetails(defaults.readField("billingDetails"), "US")
    assertContactDetails(defaults.readField("shippingDetails"), "CA")
    assertEquals("jenny@example.com", defaults.readField<String>("email"))

    val paymentElement =
      result.configuration.readField<PaymentElement.Configuration>("paymentElementConfiguration")
    assertEquals(listOf(CardBrand.Visa, CardBrand.MasterCard), paymentElement.readField("preferredNetworks"))
    assertEquals(listOf("card", "link"), paymentElement.readField("paymentMethodOrder"))
    assertTrue(paymentElement.readField("opensCardScannerAutomatically"))
    assertTrue(paymentElement.readField("embeddedViewDisplaysMandateText"))
    assertEquals(
      PaymentElement.Configuration.PaymentMethodLayout.Vertical,
      paymentElement.readField("paymentMethodLayout"),
    )
    assertEquals(
      PaymentElement.Configuration.TermsDisplay.NEVER,
      paymentElement.readField<Map<PaymentMethod.Type, *>>("termsDisplay")[PaymentMethod.Type.Card],
    )

    val billing =
      paymentElement.readField<PaymentElement.Configuration.BillingDetailsCollectionConfiguration>(
        "billingDetailsCollectionConfiguration",
      )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Always,
      billing.readField("name"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Full,
      billing.readField("address"),
    )

    val appearance = paymentElement.readField<PaymentElement.Configuration.Appearance>("appearance")
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.AlwaysDark,
      appearance.readField("themeMode"),
    )
    assertEquals(
      "#112233".toColorInt(),
      appearance.readField<PaymentElement.Configuration.Appearance.Colors>("colorsLight")
        .readField<Int>("primary"),
    )
    assertInsets(appearance.readField("formInsetValues"), 16f, 8f, 24f, 32f)

    val googlePay =
      paymentElement.readField<PaymentElement.Configuration.GooglePayConfiguration>(
        "googlePayConfiguration",
      )
    assertEquals("Total", googlePay.readField<String>("label"))
    assertEquals(
      PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Checkout,
      googlePay.readField("buttonType"),
    )
    assertEquals(listOf("INTERAC"), googlePay.readField("additionalEnabledNetworks"))
    assertEquals(
      PaymentElement.Configuration.LinkConfiguration.Display.Never,
      paymentElement.readField<PaymentElement.Configuration.LinkConfiguration>("linkConfiguration")
        .readField("display"),
    )

    invokeImmediateAction(result.rowSelectionBehavior)
    assertEquals(1, selectionCount)
  }

  @Test
  fun `map applies reviewed defaults with or without payment element options`() {
    val withoutPaymentElement = CheckoutConfigurationMapper.map(baseParams(), context) {}
    val withoutOptions =
      withoutPaymentElement.configuration
        .readField<PaymentElement.Configuration>("paymentElementConfiguration")
    assertFalse(withoutOptions.readField("embeddedViewDisplaysMandateText"))
    val withoutAppearance =
      withoutOptions.readField<PaymentElement.Configuration.Appearance>("appearance")
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.Automatic,
      withoutAppearance.readField("themeMode"),
    )
    assertInsets(
      withoutAppearance.readField("formInsetValues"),
      20f,
      0f,
      20f,
      40f,
    )

    val withPartialInsets = CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret_123",
        "returnURL" to "example://checkout",
        "paymentElement" to
          readableMapOf(
            "appearance" to
              readableMapOf("formInsetValues" to readableMapOf("left" to 16.0)),
          ),
      ),
      context,
    ) {}
    val partialAppearance =
      withPartialInsets.configuration
        .readField<PaymentElement.Configuration>("paymentElementConfiguration")
        .readField<PaymentElement.Configuration.Appearance>("appearance")
    assertInsets(partialAppearance.readField("formInsetValues"), 16f, 0f, 20f, 40f)
  }

  @Test
  fun `map validates required configuration`() {
    val missingClientSecret = assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.map(readableMapOf("returnURL" to "example://checkout"), context) {}
    }
    assertEquals("Checkout configuration requires `clientSecret`.", missingClientSecret.message)

    val missingReturnURL = assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.map(readableMapOf("clientSecret" to "cs_test_secret_123"), context) {}
    }
    assertEquals("Checkout configuration requires `returnURL`.", missingReturnURL.message)

    val missingCountry = assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.map(
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
          "defaults" to
            readableMapOf(
              "billingDetails" to
                readableMapOf("address" to readableMapOf("city" to "San Francisco")),
            ),
        ),
        context,
      ) {}
    }
    assertEquals(
      "Checkout configuration requires `defaults.billingDetails.address.country`.",
      missingCountry.message,
    )
  }

  @Test
  fun `map rejects malformed appearance colors`() {
    assertThrows(PaymentSheetAppearanceException::class.java) {
      CheckoutConfigurationMapper.map(
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
          "paymentElement" to
            readableMapOf(
              "appearance" to
                readableMapOf("colors" to readableMapOf("primary" to "#12345")),
            ),
        ),
        context,
      ) {}
    }
  }

  @Test
  fun `helper mappers reject unsupported billing and terms values`() {
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      CheckoutConfigurationMapper.mapCollectionMode("never"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      CheckoutConfigurationMapper.mapAddressCollectionMode("never"),
    )

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

  private fun baseParams() =
    readableMapOf(
      "clientSecret" to "cs_test_secret_123",
      "returnURL" to "example://checkout",
    )

  private fun contactDetails(country: String) =
    readableMapOf(
      "name" to "Jenny Rosen",
      "address" to
        readableMapOf(
          "country" to country,
          "line1" to "510 Townsend Street",
          "line2" to "Suite 100",
          "city" to "San Francisco",
          "state" to "CA",
          "postalCode" to "94103",
        ),
    )

  private fun assertContactDetails(
    details: CheckoutController.Configuration.Defaults.ContactDetails,
    country: String,
  ) {
    assertEquals("Jenny Rosen", details.readField<String>("name"))
    val address = details.readField<CheckoutController.Address>("address")
    assertEquals(country, address.readField<String>("country"))
    assertEquals("510 Townsend Street", address.readField<String>("line1"))
    assertEquals("94103", address.readField<String>("postalCode"))
  }

  private fun assertInsets(
    insets: PaymentElement.Configuration.Appearance.Insets,
    left: Float,
    top: Float,
    right: Float,
    bottom: Float,
  ) {
    assertEquals(left, insets.readField<Float>("startDp"))
    assertEquals(top, insets.readField<Float>("topDp"))
    assertEquals(right, insets.readField<Float>("endDp"))
    assertEquals(bottom, insets.readField<Float>("bottomDp"))
  }

  @Suppress("UNCHECKED_CAST")
  private fun invokeImmediateAction(rowSelectionBehavior: PaymentElement.RowSelectionBehavior) {
    val callback =
      rowSelectionBehavior.javaClass
        .getDeclaredMethod("getDidSelectPaymentOption")
        .apply { isAccessible = true }
        .invoke(rowSelectionBehavior) as () -> Unit
    callback()
  }

  @Suppress("UNCHECKED_CAST")
  private inline fun <reified T> Any.readField(name: String): T =
    javaClass.getDeclaredField(name).let { field ->
      field.isAccessible = true
      field.get(this) as T
    }
}
