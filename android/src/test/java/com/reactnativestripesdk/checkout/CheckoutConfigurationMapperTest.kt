package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.core.graphics.toColorInt
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.elements.CurrencySelectorElement
import com.stripe.android.elements.PaymentElement
import com.stripe.android.elements.PaymentElement.Configuration.Appearance.Embedded.RowStyle
import com.stripe.android.model.CardBrand
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
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
  fun `map maps currency selector element appearance`() {
    val mapped = CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret_123",
        "currencySelectorElement" to readableMapOf(
          "appearance" to readableMapOf(
            "contentVerticalPadding" to 8,
            "shapes" to readableMapOf("cornerRadius" to 12, "borderWidth" to 2),
            "colors" to readableMapOf("background" to "#112233"),
            "font" to readableMapOf("scale" to 1.2),
            "labelContent" to "amount",
          ),
        ),
      ),
      context,
    ) {}.configuration

    val configuration = mapped.readField<CurrencySelectorElement.Configuration>(
      "currencySelectorElementConfiguration",
    )
    val appearance = configuration.readField<CurrencySelectorElement.Configuration.Appearance>("appearance")
    assertEquals(8f, appearance.readField<Float>("contentVerticalPaddingDp"))
    assertEquals(12f, appearance.readField<Float>("cornerRadiusDp"))
    assertEquals(2f, appearance.readField<Float>("borderWidthDp"))
    assertEquals(1.2f, appearance.readField<Float>("sizeScaleFactor"))
    assertEquals(Color("#112233".toColorInt()), appearance.readField<Color>("background"))
    assertEquals(
      CurrencySelectorElement.Configuration.Appearance.LabelContent.AMOUNT,
      appearance.readField<CurrencySelectorElement.Configuration.Appearance.LabelContent>("labelContent"),
    )
  }

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
              "phone" to "+15555551234",
            ),
          "paymentElement" to
            readableMapOf(
              "appearance" to
                readableMapOf(
                  "font" to readableMapOf("scale" to 1.2),
                  "shapes" to readableMapOf("borderRadius" to 10, "borderWidth" to 2),
                  "formInsetValues" to readableMapOf("left" to 12, "bottom" to 24),
                  "embeddedPaymentElement" to readableMapOf(
                    "row" to readableMapOf(
                      "style" to "flatWithRadio",
                      "additionalInsets" to 8,
                      "flat" to readableMapOf(
                        "separatorThickness" to 2,
                        "separatorColor" to readableMapOf("light" to "#112233", "dark" to "#AABBCC"),
                        "radio" to readableMapOf("selectedColor" to "#445566"),
                      ),
                    ),
                  ),
                  "colors" to
                    readableMapOf(
                      "light" to readableMapOf("primary" to "#112233"),
                      "dark" to readableMapOf("primary" to "#AABBCC"),
                    ),
                ),
              "preferredNetworks" to readableArrayOf(7, 5),
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
    assertEquals("Example Store", result.configuration.readField<String>("merchantDisplayName"))

    val defaults = result.configuration.readField<CheckoutController.Configuration.Defaults>("defaults")
    assertContactDetails(defaults.readField("billingDetails"), "US")
    assertContactDetails(defaults.readField("shippingDetails"), "CA")
    assertEquals("jenny@example.com", defaults.readField<String>("email"))
    assertEquals("+15555551234", defaults.readField<String>("phone"))

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

    val appearance = paymentElement.readField<PaymentElement.Configuration.Appearance>("appearance")
    val typography = appearance.readField<PaymentElement.Configuration.Appearance.Typography>("typography")
    assertEquals(1.2f, typography.readField<Float>("sizeScaleFactor"))
    val shapes = appearance.readField<PaymentElement.Configuration.Appearance.Shapes>("shapes")
    assertEquals(10f, shapes.readField<Float>("cornerRadiusDp"))
    assertEquals(2f, shapes.readField<Float>("borderStrokeWidthDp"))
    val embedded = appearance.readField<PaymentElement.Configuration.Appearance.Embedded>("embeddedAppearance")
    val row = embedded.readField<RowStyle.FlatWithRadio>("rowStyle")
    assertEquals(8f, row.readField<Float>("additionalVerticalInsetsDp"))
    assertEquals(2f, row.readField<Float>("separatorThicknessDp"))
    assertEquals(
      "#112233".toColorInt(),
      row.readField<RowStyle.FlatWithRadio.Colors>("colorsLight").readField<Int>("separatorColor"),
    )
    assertEquals(
      "#AABBCC".toColorInt(),
      row.readField<RowStyle.FlatWithRadio.Colors>("colorsDark").readField<Int>("separatorColor"),
    )
    assertEquals(
      "#445566".toColorInt(),
      row.readField<RowStyle.FlatWithRadio.Colors>("colorsLight").readField<Int>("selectedColor"),
    )
    assertEquals(
      PaymentElement.Configuration.Appearance.ThemeMode.AlwaysDark,
      appearance.readField("themeMode"),
    )
    assertEquals(
      "#112233".toColorInt(),
      appearance.readField<PaymentElement.Configuration.Appearance.Colors>("colorsLight")
        .readField<Int>("primary"),
    )
    val insets = appearance.readField<PaymentElement.Configuration.Appearance.Insets>("formInsetValues")
    assertEquals(12f, insets.readField<Float>("startDp"))
    assertEquals(com.stripe.android.uicore.StripeThemeDefaults.formInsets.top, insets.readField<Float>("topDp"))
    assertEquals(com.stripe.android.uicore.StripeThemeDefaults.formInsets.end, insets.readField<Float>("endDp"))
    assertEquals(24f, insets.readField<Float>("bottomDp"))
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
  fun `legacy billing collection options do not interfere with Android Checkout configuration`() {
    val mapped = CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret_123",
        "returnURL" to "example://checkout",
        "paymentElement" to readableMapOf(
          "billingDetailsCollectionConfiguration" to readableMapOf(
            "name" to "always",
            "address" to "full",
          ),
          "paymentMethodOrder" to readableArrayOf("card", "link"),
        ),
      ),
      context,
    ) {}.configuration.readField<PaymentElement.Configuration>("paymentElementConfiguration")

    assertEquals(listOf("card", "link"), mapped.readField("paymentMethodOrder"))
  }

  @Test
  fun `map maps other embedded row styles`() {
    val checkmark = mapEmbeddedRow(
      readableMapOf(
        "style" to "flatWithCheckmark",
        "flat" to readableMapOf("checkmark" to readableMapOf("color" to "#112233")),
      ),
    ).readField<RowStyle.FlatWithCheckmark>("rowStyle")
    assertEquals(
      "#112233".toColorInt(),
      checkmark.readField<RowStyle.FlatWithCheckmark.Colors>("colorsLight").readField<Int>("checkmarkColor"),
    )

    val disclosure = mapEmbeddedRow(
      readableMapOf(
        "style" to "flatWithDisclosure",
        "flat" to readableMapOf("disclosure" to readableMapOf("color" to "#445566")),
      ),
    ).readField<RowStyle.FlatWithDisclosure>("rowStyle")
    assertEquals(
      "#445566".toColorInt(),
      disclosure.readField<RowStyle.FlatWithDisclosure.Colors>("colorsLight").readField<Int>("disclosureColor"),
    )

    val floating = mapEmbeddedRow(
      readableMapOf(
        "style" to "floatingButton",
        "additionalInsets" to 6,
        "floating" to readableMapOf("spacing" to 14),
      ),
    ).readField<RowStyle.FloatingButton>("rowStyle")
    assertEquals(6f, floating.readField<Float>("additionalInsetsDp"))
    assertEquals(14f, floating.readField<Float>("spacingDp"))
  }

  @Test
  fun `map preserves native defaults for missing options`() {
    val mapped = CheckoutConfigurationMapper.map(baseParams(), context) {}
      .configuration
      .readField<PaymentElement.Configuration>("paymentElementConfiguration")
    val nativeDefaults = PaymentElement.Configuration()

    assertEquals(
      nativeDefaults.readField<Boolean>("embeddedViewDisplaysMandateText"),
      mapped.readField("embeddedViewDisplaysMandateText"),
    )
    assertEquals(
      nativeDefaults.readField<Boolean>("opensCardScannerAutomatically"),
      mapped.readField("opensCardScannerAutomatically"),
    )
    assertEquals(nativeDefaults.readField<List<String>>("paymentMethodOrder"), mapped.readField("paymentMethodOrder"))
  }

  @Test
  fun `map leaves configuration validation to native Checkout`() {
    val result = CheckoutConfigurationMapper.map(readableMapOf(), context) {}

    assertEquals("", result.clientSecret)
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
  fun `helper mappers reject unsupported enum values`() {
    assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.mapTermsDisplay(readableMapOf("unknown_method" to "never"))
    }
    assertThrows(IllegalArgumentException::class.java) {
      CheckoutConfigurationMapper.mapTermsDisplay(readableMapOf("card" to "invalid"))
    }
  }

  private fun baseParams() =
    readableMapOf(
      "clientSecret" to "cs_test_secret_123",
      "returnURL" to "example://checkout",
    )

  private fun mapEmbeddedRow(row: ReadableMap): PaymentElement.Configuration.Appearance.Embedded =
    CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret_123",
        "paymentElement" to readableMapOf(
          "appearance" to readableMapOf("embeddedPaymentElement" to readableMapOf("row" to row)),
        ),
      ),
      context,
    ) {}.configuration
      .readField<PaymentElement.Configuration>("paymentElementConfiguration")
      .readField<PaymentElement.Configuration.Appearance>("appearance")
      .readField("embeddedAppearance")

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
