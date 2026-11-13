package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.compose.ui.text.AnnotatedString
import androidx.test.core.app.ApplicationProvider
import com.stripe.android.checkout.CheckoutElementsController
import com.stripe.android.paymentelement.CheckoutSessionPreview
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.spy
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.atomic.AtomicReference

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class CheckoutSessionSerializerTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()

  @Test
  fun `serialize includes unavailable express payment methods`() = runTest {
    val result = CheckoutSessionSerializer.serialize(checkoutSession(), context)
    val methods = result.getMap("availableExpressCheckoutPaymentMethods")!!

    assertEquals(setOf("applePay", "googlePay", "link"), methods.toHashMap().keys)
    for ((key, type) in mapOf("applePay" to "apple_pay", "googlePay" to "google_pay", "link" to "link")) {
      val method = methods.getMap(key)!!
      assertFalse(method.getBoolean("available"))
      assertEquals(type, method.getString("type"))
    }
  }

  @Test
  fun `serialize follows real SDK express payment methods in every snapshot`() = runTest {
    val session = spy(checkoutSession())
    val googlePay = NativeCheckoutFixtures.googlePayPaymentMethod()
    val link = NativeCheckoutFixtures.linkPaymentMethod()
    for (available in listOf(setOf(googlePay), setOf(link), setOf(googlePay, link), emptySet())) {
      `when`(session.availableExpressCheckoutPaymentMethods).thenReturn(available)
      val methods = CheckoutSessionSerializer.serialize(session, context)
        .getMap("availableExpressCheckoutPaymentMethods")!!
      assertFalse(methods.getMap("applePay")!!.getBoolean("available"))
      assertEquals(googlePay in available, methods.getMap("googlePay")!!.getBoolean("available"))
      assertEquals(link in available, methods.getMap("link")!!.getBoolean("available"))
      assertEquals("google_pay", methods.getMap("googlePay")!!.getString("type"))
      assertEquals("link", methods.getMap("link")!!.getString("type"))
    }
  }

  @Test
  fun `confirmation results preserve native outcomes and completed payment status`() {
    val completed = NativeCheckoutFixtures.completedResult()
    val completedResult =
      CheckoutSessionSerializer.serialize(completed, NativeCheckoutFixtures.completeStatus(), context)
    assertEquals("completed", completedResult.getString("status"))
    assertEquals("paid", completedResult.getString("paymentStatus"))
    assertThrows(IllegalStateException::class.java) {
      CheckoutSessionSerializer.serialize(completed, NativeCheckoutFixtures.openStatus(), context)
    }
    val canceled = CheckoutSessionSerializer.serialize(NativeCheckoutFixtures.canceledResult(), null, context)
    assertEquals("canceled", canceled.getString("status"))
    val failed = CheckoutSessionSerializer.serialize(
      NativeCheckoutFixtures.failedResult(IllegalStateException("Declined"), "Your card was declined."),
      null,
      context,
    )
    assertEquals("failed", failed.getString("status"))
    assertEquals("Failed", failed.getMap("error")!!.getString("code"))
    assertEquals("Declined", failed.getMap("error")!!.getString("message"))
    // The customer-facing message comes from native Checkout, not the diagnostic error.
    assertEquals("Your card was declined.", failed.getMap("error")!!.getString("localizedMessage"))
  }

  @Test
  fun `serialize preserves session status and native order amounts`() = runTest {
    val statuses = listOf(
      NativeCheckoutFixtures.openStatus() to "open",
      NativeCheckoutFixtures.expiredStatus() to "expired",
      NativeCheckoutFixtures.completeStatus() to "complete",
    )
    for ((status, expected) in statuses) {
      val result = CheckoutSessionSerializer.serialize(checkoutSession(status = status), context)
      assertEquals("cs_test", result.getString("id"))
      assertEquals("usd", result.getString("currency"))
      assertEquals("jenny@example.com", result.getString("email"))
      assertFalse(result.getBoolean("livemode"))
      assertEquals(expected, result.getMap("status")?.getString("type"))
      if (status is CheckoutElementsController.Session.Status.Complete) {
        assertEquals("paid", result.getMap("status")!!.getString("paymentStatus"))
      }
      assertEquals("Test business", result.getString("businessName"))
      assertEquals(100, result.getInt("minorUnitsAmountDivisor"))
      val total = result.getMap("totals")!!.getMap("total")!!
      assertEquals("$22.50", total.getString("amount"))
      assertEquals(2250L, total.getLong("minorUnitsAmount"))
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
      context,
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
    val result = CheckoutSessionSerializer.serialize(checkoutSession(paymentOption = option), context)
    val paymentOption = result.getMap("paymentOption")!!
    val address = paymentOption.getMap("billingDetails")!!.getMap("address")!!

    assertEquals("94103", address.getString("postalCode"))
    assertFalse(address.hasKey("country"))
    assertEquals("", paymentOption.getString("image"))
    assertEquals("Visa", paymentOption.getString("label"))
    assertEquals("•••• 4242", paymentOption.getString("sublabel"))
    assertTrue(paymentOption.getString("mandateHTML")!!.contains("&amp;"))
  }

  @Test
  @Config(qualifiers = "night")
  fun `serialize requests a dark icon in dark mode`() = runTest {
    val requestedDarkTheme = AtomicReference<Boolean>()
    val option = checkoutPaymentOption(
      imageLoader = { error("Image unavailable") },
      requestedDarkTheme = requestedDarkTheme,
    )

    CheckoutSessionSerializer.serialize(checkoutSession(paymentOption = option), context)

    assertEquals(true, requestedDarkTheme.get())
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
      CheckoutSessionSerializer.serialize(checkoutSession(paymentOption = option), context)
      returnedSnapshot = true
    }
    imageStarted.await()
    serialization.cancelAndJoin()
    assertFalse(returnedSnapshot)
  }
}
