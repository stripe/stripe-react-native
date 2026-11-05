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
  fun `maps every native enum value without a hardcoded bridge list`() {
    for (type in ExpressGooglePay.ButtonType.entries) {
      val configuration = ExpressCheckoutConfigurationMapper.map(
        readableMapOf("googlePay" to readableMapOf("buttonType" to type.name.lowercase())),
      )
      assertEquals(type, configuration.readField<ExpressGooglePay>("googlePayConfiguration").readField("buttonType"))
    }
    for (display in ExpressGooglePay.Display.entries) {
      val configuration = ExpressCheckoutConfigurationMapper.map(
        readableMapOf("googlePay" to readableMapOf("display" to display.name.lowercase())),
      )
      assertEquals(display, configuration.readField<ExpressGooglePay>("googlePayConfiguration").readField("display"))
    }
    for (display in ExpressLink.Display.entries) {
      val configuration = ExpressCheckoutConfigurationMapper.map(
        readableMapOf("link" to readableMapOf("display" to display.name.lowercase())),
      )
      assertEquals(display, configuration.readField<ExpressLink>("linkConfiguration").readField("display"))
    }
  }

  @Test
  fun `rejects unsupported enum values`() {
    val invalidOptions = listOf(
      "googlePay" to "buttonType",
      "googlePay" to "display",
      "link" to "display",
    )
    for ((key, option) in invalidOptions) {
      assertThrows(IllegalArgumentException::class.java) {
        ExpressCheckoutConfigurationMapper.map(readableMapOf(key to readableMapOf(option to "invalid")))
      }
    }
  }

  @Suppress("UNCHECKED_CAST")
  private inline fun <reified T> Any.readField(name: String): T =
    javaClass.getDeclaredField(name).let { field ->
      field.isAccessible = true
      field.get(this) as T
    }
}
