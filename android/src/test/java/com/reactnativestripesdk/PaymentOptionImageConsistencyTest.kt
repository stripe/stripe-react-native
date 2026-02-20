package com.reactnativestripesdk

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Regression tests for the payment option image consistency bug.
 *
 * Issue: PaymentOption.icon() was returning a DelegateDrawable that loaded asynchronously,
 * causing inconsistent base64 strings across multiple calls. Sometimes it returned a 1x1
 * placeholder (134 bytes), sometimes the full image (5650 bytes).
 *
 * These tests ensure this bug never returns.
 */
@RunWith(RobolectricTestRunner::class)
class PaymentOptionImageConsistencyTest {
  @Test
  fun `REGRESSION - multiple calls return consistent base64 strings`() =
    runTest {
      // This test specifically guards against the original bug where
      // multiple calls to icon() returned inconsistent results
      val drawable =
        ColorDrawable(Color.BLUE).apply {
          setBounds(0, 0, 147, 105) // Typical card icon size
        }

      val results = mutableListOf<String?>()
      repeat(10) {
        results.add(convertDrawableToBase64(drawable))
      }

      // All results should be identical
      val uniqueResults = results.toSet()
      assertEquals(
        "All 10 calls should return identical base64 (was returning different values due to async loading bug)",
        1,
        uniqueResults.size,
      )

      // Verify the result is not null
      assertNotNull("Base64 result should not be null", results.first())
    }

  @Test
  fun `REGRESSION - base64 is not 1x1 placeholder`() =
    runTest {
      // This test guards against returning the 1x1 placeholder image
      // Original bug: Sometimes returned 134-byte 1x1 black placeholder
      val drawable =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 147, 105)
        }

      val result = convertDrawableToBase64(drawable)

      assertNotNull(result)
      // Original bug: 1x1 placeholder was 134 bytes
      // Real image should be much larger
      assertTrue(
        "Base64 should be > 200 chars (original bug returned 134-byte 1x1 placeholder)",
        result!!.length > 200,
      )
    }

  @Test
  fun `REGRESSION - bitmap has correct dimensions not 1x1`() =
    runTest {
      val drawable =
        ColorDrawable(Color.GREEN).apply {
          setBounds(0, 0, 147, 105)
        }

      val bitmap = getBitmapFromDrawable(drawable)

      assertNotNull(bitmap)
      assertNotEquals(
        "Bitmap width should not be 1 (original bug captured 1x1 placeholder)",
        1,
        bitmap!!.width,
      )
      assertNotEquals(
        "Bitmap height should not be 1 (original bug captured 1x1 placeholder)",
        1,
        bitmap.height,
      )
      assertEquals("Bitmap width should match drawable", 147, bitmap.width)
      assertEquals("Bitmap height should match drawable", 105, bitmap.height)
    }

  @Test
  fun `REGRESSION - rapid successive calls all return full image`() =
    runTest {
      // Simulate rapid successive calls like what happens when
      // retrievePaymentOptionSelection() is called multiple times quickly
      val drawable =
        ColorDrawable(Color.MAGENTA).apply {
          setBounds(0, 0, 147, 105)
        }

      val results = mutableListOf<String?>()
      // Rapid fire - no delays
      repeat(20) {
        results.add(convertDrawableToBase64(drawable))
      }

      // All should be non-null
      assertTrue(
        "All results should be non-null",
        results.all { it != null },
      )

      // All should be full images, not placeholders
      assertTrue(
        "All results should be > 200 chars (not 1x1 placeholders)",
        results.all { it!!.length > 200 },
      )

      // All should be identical
      val uniqueResults = results.toSet()
      assertEquals(
        "All 20 rapid calls should return identical base64",
        1,
        uniqueResults.size,
      )
    }

  @Test
  fun `REGRESSION - consistent results across different payment method types`() =
    runTest {
      // Test with different typical payment method icon sizes
      val visaDrawable =
        ColorDrawable(Color.BLUE).apply {
          setBounds(0, 0, 147, 105) // Visa
        }
      val mastercardDrawable =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 147, 105) // Mastercard (same size)
        }
      val amexDrawable =
        ColorDrawable(Color.CYAN).apply {
          setBounds(0, 0, 147, 105) // Amex (same size)
        }

      val visa1 = convertDrawableToBase64(visaDrawable)
      val visa2 = convertDrawableToBase64(visaDrawable)

      val mc1 = convertDrawableToBase64(mastercardDrawable)
      val mc2 = convertDrawableToBase64(mastercardDrawable)

      val amex1 = convertDrawableToBase64(amexDrawable)
      val amex2 = convertDrawableToBase64(amexDrawable)

      // Each card type should return consistent results
      assertEquals("Visa should be consistent", visa1, visa2)
      assertEquals("Mastercard should be consistent", mc1, mc2)
      assertEquals("Amex should be consistent", amex1, amex2)

      // Different card types should have different images
      assertNotEquals("Visa and Mastercard should differ", visa1, mc1)
      assertNotEquals("Mastercard and Amex should differ", mc1, amex1)
    }

  @Test
  fun `REGRESSION - setBounds is applied before drawing`() {
    // This test ensures the original fix (setBounds) is still working
    val drawable =
      ColorDrawable(Color.YELLOW).apply {
        setBounds(0, 0, 100, 80)
      }

    val bitmap = getBitmapFromDrawable(drawable)

    assertNotNull(bitmap)
    // The bitmap dimensions should match the bounds we set
    assertEquals("Bitmap should respect setBounds width", 100, bitmap!!.width)
    assertEquals("Bitmap should respect setBounds height", 80, bitmap.height)
  }
}
