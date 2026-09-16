package com.reactnativestripesdk.checkout

import androidx.compose.ui.text.AnnotatedString
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class CheckoutSessionSerializerTest {
  @Test
  fun `confirmation results preserve native outcomes and available payment status`() {
    val completed = NativeCheckoutFixtures.completedResult()
    val paid = CheckoutSessionSerializer.serialize(completed, NativeCheckoutFixtures.completeStatus())
    assertEquals("completed", paid.getString("status"))
    assertEquals("paid", paid.getString("paymentStatus"))
    val unrefreshed = CheckoutSessionSerializer.serialize(completed, NativeCheckoutFixtures.openStatus())
    assertEquals("completed", unrefreshed.getString("status"))
    assertFalse(unrefreshed.hasKey("paymentStatus"))
    val canceled = CheckoutSessionSerializer.serialize(NativeCheckoutFixtures.canceledResult(), null)
    assertEquals("canceled", canceled.getString("status"))
    val failed = CheckoutSessionSerializer.serialize(
      NativeCheckoutFixtures.failedResult(IllegalStateException("Declined")),
      null,
    )
    assertEquals("failed", failed.getString("status"))
    assertEquals("Failed", failed.getMap("error")!!.getString("code"))
    assertEquals("Declined", failed.getMap("error")!!.getString("message"))
  }

  @Test
  fun `serialize preserves session status and native order amounts`() = runTest {
    val statuses = listOf(
      NativeCheckoutFixtures.openStatus() to "open",
      NativeCheckoutFixtures.expiredStatus() to "expired",
      NativeCheckoutFixtures.completeStatus() to "complete",
    )
    for ((status, expected) in statuses) {
      val result = CheckoutSessionSerializer.serialize(checkoutSession(status = status))
      assertEquals("cs_test", result.getString("id"))
      assertEquals("usd", result.getString("currency"))
      assertEquals("jenny@example.com", result.getString("email"))
      assertFalse(result.getBoolean("livemode"))
      assertEquals(expected, result.getMap("status")?.getString("type"))
      if (status is CheckoutController.Session.Status.Complete) {
        assertEquals("paid", result.getMap("status")!!.getString("paymentStatus"))
      }
      assertEquals("Test business", result.getString("businessName"))
      assertEquals(100, result.getInt("minorUnitsAmountDivisor"))
      val total = result.getMap("totals")!!.getMap("total")!!
      assertEquals("$22.50", total.getString("amount"))
      assertEquals(2250.0, total.getDouble("minorUnitsAmount"), 0.0)
      val item = result.getArray("orderSummaryItems")!!.getMap(0)!!.getArray("items")!!.getMap(0)!!
      assertEquals("item_1", item.getString("key"))
      assertEquals(1050.25, item.getMap("unitAmountDecimal")!!.getDouble("minorUnitsAmount"), 0.0)
      assertEquals(2, item.getInt("quantity"))
      assertEquals(5, item.getMap("adjustableQuantity")!!.getInt("maximum"))
      assertFalse(result.hasKey("paymentOption"))
    }
  }

  @Test
  fun `serialize omits unavailable tax`() = runTest {
    val result = CheckoutSessionSerializer.serialize(
      checkoutSession(taxStatus = null),
    )
    assertFalse(result.hasKey("tax"))
  }

  @Test
  fun `serialize preserves partial billing addresses and tolerates image failure`() = runTest {
    val option = checkoutPaymentOption(
      imageLoader = { error("Image unavailable") },
      billingDetails = NativeCheckoutFixtures.postalBillingDetails("94103"),
      mandateText = AnnotatedString("Terms & conditions"),
    )
    val result = CheckoutSessionSerializer.serialize(checkoutSession(paymentOption = option))
    val paymentOption = result.getMap("paymentOption")!!
    val address = paymentOption.getMap("billingDetails")!!.getMap("address")!!

    assertEquals("94103", address.getString("postalCode"))
    assertFalse(address.hasKey("country"))
    assertEquals("", paymentOption.getString("image"))
    assertEquals("Visa 4242", paymentOption.getString("label"))
    assertTrue(paymentOption.getString("mandateHTML")!!.contains("&amp;"))
  }

  @Test
  fun `canceling image loading cancels serialization`() = runTest {
    val imageStarted = CompletableDeferred<Unit>()
    val option = checkoutPaymentOption(
      imageLoader = {
        imageStarted.complete(Unit)
        awaitCancellation()
      },
    )
    var returnedSnapshot = false
    val serialization = async {
      CheckoutSessionSerializer.serialize(checkoutSession(paymentOption = option))
      returnedSnapshot = true
    }
    imageStarted.await()
    serialization.cancelAndJoin()
    assertFalse(returnedSnapshot)
  }
}
