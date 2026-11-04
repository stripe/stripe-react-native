package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.elements.ExpressCheckoutElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.Appearance as ExpressAppearance
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.GooglePayConfiguration as ExpressGooglePay
import com.stripe.android.elements.ExpressCheckoutElement.Configuration.LinkConfiguration as ExpressLink

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class ExpressCheckoutConfigurationMapperTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()

  @Test
  fun `maps express configuration independently of payment element and ignores iOS options`() {
    val mapped = CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret",
        "paymentElement" to readableMapOf("link" to readableMapOf("display" to "automatic")),
        "expressCheckoutElement" to readableMapOf(
          "applePay" to readableMapOf("buttonType" to "checkout"),
          "googlePay" to readableMapOf(
            "display" to "never",
            "label" to "Total",
            "buttonType" to "checkout",
            "additionalEnabledNetworks" to readableArrayOf("INTERAC"),
          ),
          "link" to readableMapOf("display" to "never"),
          "appearance" to readableMapOf(
            "buttonTheme" to "dark",
            "buttonLayout" to readableMapOf("maxColumns" to 2, "maxRows" to 1),
            "borderRadius" to 12,
          ),
        ),
      ),
      context,
    ) {}.configuration.readField<ExpressCheckoutElement.Configuration>("expressCheckoutElementConfiguration")
    val googlePay = mapped.readField<ExpressGooglePay>("googlePayConfiguration")
    assertEquals(ExpressGooglePay.Display.Never, googlePay.readField("display"))
    assertEquals("Total", googlePay.readField<String>("label"))
    assertEquals(ExpressGooglePay.ButtonType.Checkout, googlePay.readField("buttonType"))
    assertEquals(listOf("INTERAC"), googlePay.readField("additionalEnabledNetworks"))
    assertEquals(ExpressLink.Display.Never, mapped.readField<ExpressLink>("linkConfiguration").readField("display"))
    val appearance = mapped.readField<ExpressAppearance>("appearance")
    assertEquals(ExpressAppearance.ButtonTheme.Dark, appearance.readField("buttonTheme"))
    assertEquals(12f, appearance.readField<Float>("cornerRadiusDp"))
    val layout = appearance.readField<ExpressAppearance.ButtonLayout>("buttonLayout")
    assertEquals(2, layout.readField<Int>("maxColumns"))
    assertEquals(1, layout.readField<Int>("maxRows"))
  }

  @Test
  fun `unconfigured express checkout remains disabled`() {
    val configuration = CheckoutConfigurationMapper.map(readableMapOf("clientSecret" to "cs_test_secret"), context) {}
    assertNull(configuration.configuration.readField<Any?>("expressCheckoutElementConfiguration"))
  }

  @Test
  fun `empty configuration preserves native wallet and appearance defaults`() {
    val mapped = ExpressCheckoutConfigurationMapper.map(readableMapOf())
    val defaults = ExpressCheckoutElement.Configuration()
    for (wallet in listOf("googlePayConfiguration", "linkConfiguration")) {
      assertEquals(
        defaults.readField<Any>(wallet).readField<Any>("display"),
        mapped.readField<Any>(wallet).readField<Any>("display"),
      )
    }
    val googlePay = mapped.readField<ExpressGooglePay>("googlePayConfiguration")
    assertNull(googlePay.readField<String?>("label"))
    assertEquals(ExpressGooglePay.ButtonType.Pay, googlePay.readField("buttonType"))
    assertEquals(emptyList<String>(), googlePay.readField("additionalEnabledNetworks"))
    val appearance = mapped.readField<ExpressAppearance>("appearance")
    val nativeAppearance = defaults.readField<ExpressAppearance>("appearance")
    assertEquals(nativeAppearance.readField<Float>("cornerRadiusDp"), appearance.readField<Float>("cornerRadiusDp"))
    assertEquals(nativeAppearance.readField<Any>("buttonTheme"), appearance.readField<Any>("buttonTheme"))
    val layout = appearance.readField<ExpressAppearance.ButtonLayout>("buttonLayout")
    assertNull(layout.readField<Int?>("maxRows"))
    assertNull(layout.readField<Int?>("maxColumns"))
  }

  @Test
  fun `maps every Google Pay button type and button theme`() {
    for (type in ExpressGooglePay.ButtonType.entries) {
      val configuration = ExpressCheckoutConfigurationMapper.map(
        readableMapOf("googlePay" to readableMapOf("buttonType" to type.name.lowercase())),
      )
      assertEquals(type, configuration.readField<ExpressGooglePay>("googlePayConfiguration").readField("buttonType"))
    }
    for (theme in ExpressAppearance.ButtonTheme.entries) {
      val appearance = mapAppearance(readableMapOf("buttonTheme" to theme.name.lowercase()))
      assertEquals(theme, appearance.readField("buttonTheme"))
    }
    val automatic = ExpressCheckoutConfigurationMapper.map(
      readableMapOf(
        "googlePay" to readableMapOf("display" to "automatic"),
        "link" to readableMapOf("display" to "automatic"),
      ),
    )
    assertEquals(
      ExpressGooglePay.Display.Automatic,
      automatic.readField<ExpressGooglePay>("googlePayConfiguration").readField<ExpressGooglePay.Display>("display"),
    )
    assertEquals(
      ExpressLink.Display.Automatic,
      automatic.readField<ExpressLink>("linkConfiguration").readField<ExpressLink.Display>("display"),
    )
  }

  @Test
  fun `preserves unspecified dimensions and accepts layout boundaries`() {
    for (key in listOf("maxRows", "maxColumns")) {
      for (value in listOf(null, 1, 10)) {
        val layout = mapAppearance(readableMapOf("buttonLayout" to readableMapOf(key to value)))
          .readField<ExpressAppearance.ButtonLayout>("buttonLayout")
        assertEquals(value, layout.readField<Int?>(key))
        assertNull(layout.readField<Int?>(if (key == "maxRows") "maxColumns" else "maxRows"))
      }
    }
  }

  @Test
  fun `rejects fractional and out of bounds layout dimensions`() {
    for (key in listOf("maxRows", "maxColumns")) {
      for (value in listOf(-1, 0, 11, 1.5, Double.NaN, Double.POSITIVE_INFINITY)) {
        assertThrows(IllegalArgumentException::class.java) {
          mapAppearance(readableMapOf("buttonLayout" to readableMapOf(key to value)))
        }
      }
    }
  }

  @Test
  fun `rejects unsupported enum values`() {
    val invalidOptions = listOf(
      "googlePay" to "buttonType",
      "googlePay" to "display",
      "link" to "display",
      "appearance" to "buttonTheme",
    )
    for ((key, option) in invalidOptions) {
      assertThrows(IllegalArgumentException::class.java) {
        ExpressCheckoutConfigurationMapper.map(readableMapOf(key to readableMapOf(option to "invalid")))
      }
    }
  }

  private fun mapAppearance(params: ReadableMap): ExpressAppearance =
    ExpressCheckoutConfigurationMapper.map(readableMapOf("appearance" to params)).readField("appearance")

  @Suppress("UNCHECKED_CAST")
  private inline fun <reified T> Any.readField(name: String): T =
    javaClass.getDeclaredField(name).let { field ->
      field.isAccessible = true
      field.get(this) as T
    }
}
