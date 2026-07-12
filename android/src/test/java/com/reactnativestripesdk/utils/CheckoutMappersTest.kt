package com.reactnativestripesdk.utils

import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
@OptIn(CheckoutSessionPreview::class)
class CheckoutMappersTest {
  @Test
  fun mapFromCheckoutState_mapsLoadedSession() {
    val mapped =
      mapFromCheckoutState(
        isLoading = false,
        session = CheckoutTestFixtures.fullSession(),
      )

    assertEquals("loaded", mapped.getString("status"))

    val session = mapped.getMap("session")
    assertNotNull(session)
    assertEquals("cs_test_123", session!!.getString("id"))
    assertFalse(session.getBoolean("livemode"))
    assertEquals("usd", session.getString("currency"))

    val status = session.getMap("status")
    assertNotNull(status)
    assertEquals("open", status!!.getString("type"))

    val tax = session.getMap("tax")
    assertNotNull(tax)
    assertEquals("ready", tax!!.getString("status"))

    val total = session.getMap("total")
    assertNotNull(total)
    val subtotal = total!!.getMap("subtotal")
    assertNotNull(subtotal)
    assertEquals(5000.0, subtotal!!.getDouble("minorUnitsAmount"), 0.0)
    assertEquals("", subtotal.getString("amount"))

    val grandTotal = total.getMap("total")
    assertNotNull(grandTotal)
    assertEquals(4044.0, grandTotal!!.getDouble("minorUnitsAmount"), 0.0)

    val lineItems = session.getArray("lineItems")
    assertNotNull(lineItems)
    assertEquals(2, lineItems!!.size())
    assertEquals("li_item1", lineItems.getMap(0)?.getString("id"))
    assertEquals("Llama Figure", lineItems.getMap(0)?.getString("name"))
    assertEquals(2, lineItems.getMap(0)?.getInt("quantity"))
    assertFalse(lineItems.getMap(0)!!.hasKey("unitAmount"))

    val item2UnitAmount = lineItems.getMap(1)?.getMap("unitAmount")
    assertNotNull(item2UnitAmount)
    assertEquals(2499.0, item2UnitAmount!!.getDouble("minorUnitsAmount"), 0.0)

    val shippingOptions = session.getArray("shippingOptions")
    assertNotNull(shippingOptions)
    assertEquals(2, shippingOptions!!.size())
    assertEquals("shr_standard", shippingOptions.getMap(0)?.getString("id"))
    val shippingAmount = shippingOptions.getMap(0)?.getMap("amount")
    assertNotNull(shippingAmount)
    assertEquals(500.0, shippingAmount!!.getDouble("minorUnitsAmount"), 0.0)

    val discountAmounts = session.getArray("discountAmounts")
    assertNotNull(discountAmounts)
    assertEquals(0, discountAmounts!!.size())

    val currencyOptions = session.getArray("currencyOptions")
    assertNotNull(currencyOptions)
    assertEquals(0, currencyOptions!!.size())
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
    assertNull(session.getMap("total"))
    assertEquals(0, session.getArray("lineItems")!!.size())
    assertEquals(0, session.getArray("shippingOptions")!!.size())
    assertEquals(0, session.getArray("discountAmounts")!!.size())
  }
}
