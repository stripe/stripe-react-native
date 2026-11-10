package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.test.core.app.ApplicationProvider
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
  }

  @Test
  fun `unconfigured express checkout remains disabled`() {
    val configuration = CheckoutConfigurationMapper.map(readableMapOf("clientSecret" to "cs_test_secret"), context) {}
    assertNull(configuration.configuration.readField<Any?>("expressCheckoutElementConfiguration"))
  }

  @Test
  fun `empty configuration preserves native wallet defaults`() {
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
  }

  @Test
  fun `maps Google Pay buy button`() = assertGooglePayButtonType("buy", ExpressGooglePay.ButtonType.Buy)

  @Test
  fun `maps Google Pay book button`() = assertGooglePayButtonType("book", ExpressGooglePay.ButtonType.Book)

  @Test
  fun `maps Google Pay checkout button`() = assertGooglePayButtonType("checkout", ExpressGooglePay.ButtonType.Checkout)

  @Test
  fun `maps Google Pay donate button`() = assertGooglePayButtonType("donate", ExpressGooglePay.ButtonType.Donate)

  @Test
  fun `maps Google Pay order button`() = assertGooglePayButtonType("order", ExpressGooglePay.ButtonType.Order)

  @Test
  fun `maps Google Pay subscribe button`() =
    assertGooglePayButtonType("subscribe", ExpressGooglePay.ButtonType.Subscribe)

  @Test
  fun `maps Google Pay plain button`() = assertGooglePayButtonType("plain", ExpressGooglePay.ButtonType.Plain)

  @Test
  fun `maps Google Pay pay button`() = assertGooglePayButtonType("pay", ExpressGooglePay.ButtonType.Pay)

  @Test
  fun `maps automatic Google Pay display`() = assertGooglePayDisplay("automatic", ExpressGooglePay.Display.Automatic)

  @Test
  fun `maps never Google Pay display`() = assertGooglePayDisplay("never", ExpressGooglePay.Display.Never)

  @Test
  fun `maps automatic Link display`() = assertLinkDisplay("automatic", ExpressLink.Display.Automatic)

  @Test
  fun `maps never Link display`() = assertLinkDisplay("never", ExpressLink.Display.Never)

  @Test
  fun `rejects native enum names instead of wire button types`() =
    assertUnsupportedValue("googlePay", "buttonType", "Checkout")

  @Test
  fun `rejects unsupported Google Pay display`() = assertUnsupportedValue("googlePay", "display", "invalid")

  @Test
  fun `rejects unsupported Link display`() = assertUnsupportedValue("link", "display", "invalid")

  private fun assertGooglePayButtonType(value: String, expected: ExpressGooglePay.ButtonType) {
    val configuration = ExpressCheckoutConfigurationMapper.map(
      readableMapOf("googlePay" to readableMapOf("buttonType" to value)),
    )
    assertEquals(expected, configuration.readField<ExpressGooglePay>("googlePayConfiguration").readField("buttonType"))
  }

  private fun assertGooglePayDisplay(value: String, expected: ExpressGooglePay.Display) {
    val configuration = ExpressCheckoutConfigurationMapper.map(
      readableMapOf("googlePay" to readableMapOf("display" to value)),
    )
    assertEquals(expected, configuration.readField<ExpressGooglePay>("googlePayConfiguration").readField("display"))
  }

  private fun assertLinkDisplay(value: String, expected: ExpressLink.Display) {
    val configuration = ExpressCheckoutConfigurationMapper.map(
      readableMapOf("link" to readableMapOf("display" to value)),
    )
    assertEquals(expected, configuration.readField<ExpressLink>("linkConfiguration").readField("display"))
  }

  private fun assertUnsupportedValue(configuration: String, field: String, value: String) {
    val error = assertThrows(IllegalArgumentException::class.java) {
      ExpressCheckoutConfigurationMapper.map(readableMapOf(configuration to readableMapOf(field to value)))
    }
    assertEquals(
      "Unsupported Checkout configuration value `$value` for `expressCheckoutElement.$configuration.$field`.",
      error.message,
    )
  }

  @Suppress("UNCHECKED_CAST")
  private inline fun <reified T> Any.readField(name: String): T =
    javaClass.getDeclaredField(name).let { field ->
      field.isAccessible = true
      field.get(this) as T
    }
}
