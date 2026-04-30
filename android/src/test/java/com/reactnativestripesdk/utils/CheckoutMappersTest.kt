package com.reactnativestripesdk.utils

import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
@OptIn(CheckoutSessionPreview::class)
class CheckoutMappersTest {
  @Test
  fun mapFromCheckoutState_mapsLoadedSessionAndCurrentAndroidPlaceholders() {
    val mapped =
      mapFromCheckoutState(
        isLoading = false,
        session = CheckoutTestFixtures.fullSession(),
      )

    assertEquals("loaded", mapped.getString("status"))

    val session = mapped.getMap("session")
    assertNotNull(session)
    assertEquals("cs_test_123", session!!.getString("id"))
    assertEquals("unknown", session.getString("status"))
    assertEquals("unknown", session.getString("paymentStatus"))
    assertFalse(session.getBoolean("livemode"))
    assertEquals("usd", session.getString("currency"))
    assertFalse(session.hasKey("customerId"))
    assertFalse(session.hasKey("customerEmail"))
    assertFalse(session.hasKey("billingAddress"))
    assertFalse(session.hasKey("shippingAddress"))

    val totals = session.getMap("totals")
    assertNotNull(totals)
    assertEquals(5000.0, totals!!.getDouble("subtotal"), 0.0)
    assertEquals(4044.0, totals.getDouble("total"), 0.0)
    assertEquals(4044.0, totals.getDouble("due"), 0.0)
    assertEquals(0.0, totals.getDouble("discount"), 0.0)
    assertEquals(500.0, totals.getDouble("shipping"), 0.0)
    assertEquals(294.0, totals.getDouble("tax"), 0.0)

    val discounts = session.getArray("discounts")
    assertNotNull(discounts)
    assertEquals(0, discounts!!.size())

    val lineItems = session.getArray("lineItems")
    assertNotNull(lineItems)
    assertEquals(2, lineItems!!.size())
    assertEquals("li_item1", lineItems.getMap(0)?.getString("id"))
    assertEquals("Llama Figure", lineItems.getMap(0)?.getString("name"))
    assertEquals(2, lineItems.getMap(0)?.getInt("quantity"))
    assertEquals(0.0, lineItems.getMap(0)?.getDouble("unitAmount") ?: -1.0, 0.0)
    assertEquals("usd", lineItems.getMap(0)?.getString("currency"))
    assertEquals(2499.0, lineItems.getMap(1)?.getDouble("unitAmount") ?: -1.0, 0.0)

    val shippingOptions = session.getArray("shippingOptions")
    assertNotNull(shippingOptions)
    assertEquals(2, shippingOptions!!.size())
    assertEquals("shr_standard", shippingOptions.getMap(0)?.getString("id"))
    assertEquals("Standard Shipping", shippingOptions.getMap(0)?.getString("displayName"))
    assertEquals(500.0, shippingOptions.getMap(0)?.getDouble("amount") ?: -1.0, 0.0)
    assertEquals("usd", shippingOptions.getMap(0)?.getString("currency"))
    assertFalse(shippingOptions.getMap(0)?.hasKey("deliveryEstimate") ?: true)
    assertEquals("1-2 business days", shippingOptions.getMap(1)?.getString("deliveryEstimate"))
  }

  @Test
  fun mapFromCheckoutState_mapsLoadingStateAndOmitsBlankCurrency() {
    val mapped =
      mapFromCheckoutState(
        isLoading = true,
        session = CheckoutTestFixtures.blankCurrencySession(),
      )

    assertEquals("loading", mapped.getString("status"))

    val session = mapped.getMap("session")
    assertNotNull(session)
    assertEquals("cs_test_blank_currency", session!!.getString("id"))
    assertFalse(session.hasKey("currency"))
    assertFalse(session.hasKey("totals"))
    assertEquals(0, session.getArray("lineItems")!!.size())
    assertEquals(0, session.getArray("shippingOptions")!!.size())
    assertEquals(0, session.getArray("discounts")!!.size())
  }
}
