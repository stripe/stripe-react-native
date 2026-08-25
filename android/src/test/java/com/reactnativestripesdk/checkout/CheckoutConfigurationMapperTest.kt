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
import org.junit.Assert.assertNull
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
  fun `map accepts every reviewed configuration field`() {
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
                      "light" to colorParams("#112233"),
                      "dark" to colorParams("#AABBCC"),
                    ),
                  "primaryButton" to
                    readableMapOf(
                      "colors" to
                        readableMapOf(
                          "background" to "#123456",
                          "text" to "#234567",
                          "border" to "#345678",
                          "successBackgroundColor" to "#456789",
                          "successTextColor" to "#56789A",
                        ),
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
                      "right" to 24.0,
                      "bottom" to 32.0,
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
      didSelectPaymentOption = { selectionCount += 1 },
    )

    assertEquals("cs_test_secret_123", result.clientSecret)
    assertEquals("example://checkout", result.returnURL)
    assertEquals("Example Store", result.configuration.readField<String>("merchantDisplayName"))

    val defaults =
      result.configuration.readField<CheckoutController.Configuration.Defaults>("defaults")
    val billingDetails =
      defaults.readField<CheckoutController.Configuration.Defaults.ContactDetails>("billingDetails")
    assertEquals("Jenny Rosen", billingDetails.readField<String>("name"))
    assertAddress(billingDetails.readField("address"), "US")
    val shippingDetails =
      defaults.readField<CheckoutController.Configuration.Defaults.ContactDetails>("shippingDetails")
    assertEquals("Jenny Rosen", shippingDetails.readField<String>("name"))
    assertAddress(shippingDetails.readField("address"), "CA")
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
      mapOf(
        PaymentMethod.Type.Card to PaymentElement.Configuration.TermsDisplay.NEVER,
        PaymentMethod.Type.USBankAccount to PaymentElement.Configuration.TermsDisplay.AUTOMATIC,
      ),
      paymentElement.readField("termsDisplay"),
    )

    val billingCollection =
      paymentElement.readField<PaymentElement.Configuration.BillingDetailsCollectionConfiguration>(
        "billingDetailsCollectionConfiguration",
      )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Always,
      billingCollection.readField("name"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Full,
      billingCollection.readField("address"),
    )

    val appearance =
      paymentElement.readField<PaymentElement.Configuration.Appearance>("appearance")
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.AlwaysDark,
      appearance.readField("themeMode"),
    )
    assertColors(
      appearance.readField("colorsLight"),
      "#112233".toColorInt(),
    )
    assertColors(
      appearance.readField("colorsDark"),
      "#AABBCC".toColorInt(),
    )
    assertPrimaryButton(appearance.readField("primaryButton"))
    val insets =
      appearance.readField<PaymentElement.Configuration.Appearance.Insets>("formInsetValues")
    assertEquals(16f, insets.readField<Float>("startDp"))
    assertEquals(8f, insets.readField<Float>("topDp"))
    assertEquals(24f, insets.readField<Float>("endDp"))
    assertEquals(32f, insets.readField<Float>("bottomDp"))

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
    val link =
      paymentElement.readField<PaymentElement.Configuration.LinkConfiguration>("linkConfiguration")
    assertEquals(
      PaymentElement.Configuration.LinkConfiguration.Display.Never,
      link.readField("display"),
    )

    invokeImmediateAction(result.rowSelectionBehavior)
    assertEquals(1, selectionCount)
  }

  @Test
  @Suppress("LongMethod")
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
    assertNull(result.configuration.readField<String?>("merchantDisplayName"))
    val defaults =
      result.configuration.readField<CheckoutController.Configuration.Defaults>("defaults")
    assertNull(defaults.readField<Any?>("billingDetails"))
    assertNull(defaults.readField<Any?>("shippingDetails"))
    assertNull(defaults.readField<String?>("email"))

    val paymentElement =
      result.configuration.readField<PaymentElement.Configuration>("paymentElementConfiguration")
    assertFalse(paymentElement.readField("embeddedViewDisplaysMandateText"))
    assertFalse(paymentElement.readField("opensCardScannerAutomatically"))
    assertTrue(paymentElement.readField<List<*>>("preferredNetworks").isEmpty())
    assertTrue(paymentElement.readField<List<*>>("paymentMethodOrder").isEmpty())
    assertTrue(paymentElement.readField<Map<*, *>>("termsDisplay").isEmpty())
    assertEquals(
      PaymentElement.Configuration.PaymentMethodLayout.Automatic,
      paymentElement.readField("paymentMethodLayout"),
    )
    val billingCollection =
      paymentElement.readField<PaymentElement.Configuration.BillingDetailsCollectionConfiguration>(
        "billingDetailsCollectionConfiguration",
      )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Automatic,
      billingCollection.readField("name"),
    )
    assertEquals(
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic,
      billingCollection.readField("address"),
    )
    val appearance =
      paymentElement.readField<PaymentElement.Configuration.Appearance>("appearance")
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.Automatic,
      appearance.readField("themeMode"),
    )
    val insets =
      appearance.readField<PaymentElement.Configuration.Appearance.Insets>("formInsetValues")
    assertEquals(20f, insets.readField<Float>("startDp"))
    assertEquals(0f, insets.readField<Float>("topDp"))
    assertEquals(20f, insets.readField<Float>("endDp"))
    assertEquals(40f, insets.readField<Float>("bottomDp"))
    val googlePay =
      paymentElement.readField<PaymentElement.Configuration.GooglePayConfiguration>(
        "googlePayConfiguration",
      )
    assertEquals(
      PaymentElement.Configuration.GooglePayConfiguration.Display.Automatic,
      googlePay.readField("display"),
    )
    assertNull(googlePay.readField<String?>("label"))
    assertEquals(
      PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Pay,
      googlePay.readField("buttonType"),
    )
    assertTrue(googlePay.readField<List<*>>("additionalEnabledNetworks").isEmpty())
    val link =
      paymentElement.readField<PaymentElement.Configuration.LinkConfiguration>("linkConfiguration")
    assertEquals(
      PaymentElement.Configuration.LinkConfiguration.Display.Automatic,
      link.readField("display"),
    )
    assertTrue(result.rowSelectionBehavior.javaClass.simpleName.contains("Default"))
  }

  @Test
  fun `partial form insets preserve independent native defaults`() {
    val result = CheckoutConfigurationMapper.map(
      params =
        readableMapOf(
          "clientSecret" to "cs_test_secret_123",
          "returnURL" to "example://checkout",
          "paymentElement" to
            readableMapOf(
              "appearance" to
                readableMapOf(
                  "formInsetValues" to readableMapOf("left" to 16.0),
                ),
            ),
        ),
      context = context,
      didSelectPaymentOption = {},
    )

    val paymentElement =
      result.configuration.readField<PaymentElement.Configuration>("paymentElementConfiguration")
    val appearance =
      paymentElement.readField<PaymentElement.Configuration.Appearance>("appearance")
    val insets =
      appearance.readField<PaymentElement.Configuration.Appearance.Insets>("formInsetValues")
    assertEquals(16f, insets.readField<Float>("startDp"))
    assertEquals(0f, insets.readField<Float>("topDp"))
    assertEquals(20f, insets.readField<Float>("endDp"))
    assertEquals(40f, insets.readField<Float>("bottomDp"))
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

  private fun colorParams(color: String) =
    readableMapOf(
      "primary" to color,
      "background" to color,
      "componentBackground" to color,
      "componentBorder" to color,
      "componentDivider" to color,
      "componentText" to color,
      "secondaryText" to color,
      "placeholderText" to color,
      "primaryText" to color,
      "icon" to color,
      "error" to color,
    )

  private fun assertColors(
    colors: PaymentElement.Configuration.Appearance.Colors,
    expected: Int,
  ) {
    assertEquals(expected, colors.readField<Int>("primary"))
    assertEquals(expected, colors.readField<Int>("surface"))
    assertEquals(expected, colors.readField<Int>("component"))
    assertEquals(expected, colors.readField<Int>("componentBorder"))
    assertEquals(expected, colors.readField<Int>("componentDivider"))
    assertEquals(expected, colors.readField<Int>("onComponent"))
    assertEquals(expected, colors.readField<Int>("subtitle"))
    assertEquals(expected, colors.readField<Int>("placeholderText"))
    assertEquals(expected, colors.readField<Int>("onSurface"))
    assertEquals(expected, colors.readField<Int>("appBarIcon"))
    assertEquals(expected, colors.readField<Int>("error"))
  }

  private fun assertPrimaryButton(
    primaryButton: PaymentElement.Configuration.Appearance.PrimaryButton,
  ) {
    val lightColors =
      primaryButton.readField<PaymentElement.Configuration.Appearance.PrimaryButton.Colors>(
        "colorsLight",
      )
    val darkColors =
      primaryButton.readField<PaymentElement.Configuration.Appearance.PrimaryButton.Colors>(
        "colorsDark",
      )
    for (colors in listOf(lightColors, darkColors)) {
      assertEquals("#123456".toColorInt(), colors.readField<Int>("background"))
      assertEquals("#234567".toColorInt(), colors.readField<Int>("onBackground"))
      assertEquals("#345678".toColorInt(), colors.readField<Int>("border"))
      assertEquals("#456789".toColorInt(), colors.readField<Int>("successBackgroundColor"))
      assertEquals("#56789A".toColorInt(), colors.readField<Int>("onSuccessBackgroundColor"))
    }

    val shape =
      primaryButton.readField<PaymentElement.Configuration.Appearance.PrimaryButton.Shape>("shape")
    assertEquals(8f, shape.readField<Float>("cornerRadiusDp"))
    assertEquals(1f, shape.readField<Float>("borderStrokeWidthDp"))
    assertEquals(52f, shape.readField<Float>("heightDp"))
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

  private fun assertAddress(
    address: CheckoutController.Address,
    country: String,
  ) {
    assertEquals(country, address.readField<String>("country"))
    assertEquals("510 Townsend Street", address.readField<String>("line1"))
    assertEquals("Suite 100", address.readField<String>("line2"))
    assertEquals("San Francisco", address.readField<String>("city"))
    assertEquals("CA", address.readField<String>("state"))
    assertEquals("94103", address.readField<String>("postalCode"))
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
