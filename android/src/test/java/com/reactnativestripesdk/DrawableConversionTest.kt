package com.reactnativestripesdk

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DrawableConversionTest {
  // ============================================
  // convertDrawableToBase64 Tests
  // ============================================

  @Test
  fun `convertDrawableToBase64 returns non-null for valid drawable`() =
    runTest {
      val drawable =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 100, 100)
        }

      val result = convertDrawableToBase64(drawable)

      assertNotNull("Base64 should not be null for valid drawable", result)
      assertTrue("Base64 should not be empty", result!!.isNotEmpty())
    }

  @Test
  fun `convertDrawableToBase64 returns consistent results for same drawable`() =
    runTest {
      val drawable =
        ColorDrawable(Color.BLUE).apply {
          setBounds(0, 0, 100, 100)
        }

      val result1 = convertDrawableToBase64(drawable)
      val result2 = convertDrawableToBase64(drawable)
      val result3 = convertDrawableToBase64(drawable)

      assertEquals("Multiple calls should return identical base64", result1, result2)
      assertEquals("Multiple calls should return identical base64", result2, result3)
    }

  @Test
  fun `convertDrawableToBase64 returns null for invalid drawable`() =
    runTest {
      // Drawable with 0 intrinsic size (never set bounds)
      val drawable = ColorDrawable(Color.RED)

      val result = convertDrawableToBase64(drawable)

      assertNull("Base64 should be null for invalid drawable", result)
    }

  @Test
  fun `convertDrawableToBase64 result is valid base64 format`() =
    runTest {
      val drawable =
        ColorDrawable(Color.GREEN).apply {
          setBounds(0, 0, 50, 50)
        }

      val result = convertDrawableToBase64(drawable)

      assertNotNull(result)
      // Valid base64 should match pattern: [A-Za-z0-9+/=]+
      assertTrue(
        "Result should be valid base64",
        result!!.matches(Regex("^[A-Za-z0-9+/=\\n]+$")),
      )
    }

  @Test
  fun `convertDrawableToBase64 result size is reasonable`() =
    runTest {
      val drawable =
        ColorDrawable(Color.YELLOW).apply {
          setBounds(0, 0, 100, 100)
        }

      val result = convertDrawableToBase64(drawable)

      assertNotNull(result)
      // Should be larger than tiny placeholder (134 bytes)
      // but smaller than unreasonably large
      assertTrue(
        "Base64 should be larger than 200 chars (not a 1x1 placeholder)",
        result!!.length > 200,
      )
      assertTrue(
        "Base64 should be smaller than 100KB",
        result.length < 100_000,
      )
    }

  // ============================================
  // getBitmapFromDrawable Tests
  // ============================================

  @Test
  fun `getBitmapFromDrawable returns correct size bitmap`() {
    val drawable =
      ColorDrawable(Color.CYAN).apply {
        setBounds(0, 0, 150, 100)
      }

    val bitmap = getBitmapFromDrawable(drawable)

    assertNotNull("Bitmap should not be null", bitmap)
    assertEquals("Bitmap width should match drawable", 150, bitmap!!.width)
    assertEquals("Bitmap height should match drawable", 100, bitmap.height)
    assertEquals("Bitmap should use ARGB_8888", Bitmap.Config.ARGB_8888, bitmap.config)
  }

  @Test
  fun `getBitmapFromDrawable returns null for zero-size drawable`() {
    val drawable = ColorDrawable(Color.MAGENTA)
    // Don't set bounds, intrinsic size will be -1

    val bitmap = getBitmapFromDrawable(drawable)

    assertNull("Bitmap should be null for invalid drawable", bitmap)
  }

  @Test
  fun `getBitmapFromDrawable preserves drawable dimensions`() {
    // Test with typical card icon dimensions
    val drawable =
      ColorDrawable(Color.RED).apply {
        setBounds(0, 0, 147, 105)
      }

    val bitmap = getBitmapFromDrawable(drawable)

    assertNotNull(bitmap)
    assertEquals("Width should be preserved", 147, bitmap!!.width)
    assertEquals("Height should be preserved", 105, bitmap.height)
  }
}
