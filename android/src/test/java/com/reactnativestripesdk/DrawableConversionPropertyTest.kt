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
import kotlin.random.Random

/**
 * Property-based tests for drawable conversion.
 * These tests verify mathematical properties that should always hold true.
 */
@RunWith(RobolectricTestRunner::class)
class DrawableConversionPropertyTest {
  @Test
  fun `PROPERTY - conversion is idempotent`() =
    runTest {
      // Property: Converting the same drawable multiple times yields same result
      repeat(20) {
        val color =
          Color.rgb(
            Random.nextInt(256),
            Random.nextInt(256),
            Random.nextInt(256),
          )
        val width = Random.nextInt(50, 200)
        val height = Random.nextInt(50, 200)

        val drawable =
          ColorDrawable(color).apply {
            setBounds(0, 0, width, height)
          }

        val result1 = convertDrawableToBase64(drawable)
        val result2 = convertDrawableToBase64(drawable)

        assertEquals(
          "Same drawable should always produce same base64 (iteration $it, ${width}x$height)",
          result1,
          result2,
        )
      }
    }

  @Test
  fun `PROPERTY - different drawables produce different base64`() =
    runTest {
      val drawable1 =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 100, 100)
        }
      val drawable2 =
        ColorDrawable(Color.BLUE).apply {
          setBounds(0, 0, 100, 100)
        }

      val result1 = convertDrawableToBase64(drawable1)
      val result2 = convertDrawableToBase64(drawable2)

      assertNotEquals(
        "Different colored drawables should produce different base64",
        result1,
        result2,
      )
    }

  @Test
  fun `PROPERTY - base64 length scales with drawable size`() =
    runTest {
      val small =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 50, 50)
        }
      val medium =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 100, 100)
        }
      val large =
        ColorDrawable(Color.RED).apply {
          setBounds(0, 0, 200, 200)
        }

      val smallResult = convertDrawableToBase64(small)
      val mediumResult = convertDrawableToBase64(medium)
      val largeResult = convertDrawableToBase64(large)

      assertNotNull(smallResult)
      assertNotNull(mediumResult)
      assertNotNull(largeResult)

      assertTrue(
        "Medium drawable should produce longer base64 than small",
        mediumResult!!.length > smallResult!!.length,
      )
      assertTrue(
        "Large drawable should produce longer base64 than medium",
        largeResult!!.length > mediumResult.length,
      )
    }

  @Test
  fun `PROPERTY - conversion preserves drawable dimensions`() =
    runTest {
      val testSizes =
        listOf(
          Pair(50, 50),
          Pair(100, 75),
          Pair(147, 105), // Typical card icon
          Pair(200, 150),
          Pair(250, 200),
        )

      testSizes.forEach { (width, height) ->
        val drawable =
          ColorDrawable(Color.GREEN).apply {
            setBounds(0, 0, width, height)
          }

        val bitmap = getBitmapFromDrawable(drawable)

        assertNotNull("Bitmap should not be null for ${width}x$height", bitmap)
        assertEquals("Width should be preserved for ${width}x$height", width, bitmap!!.width)
        assertEquals("Height should be preserved for ${width}x$height", height, bitmap.height)
      }
    }

  @Test
  fun `PROPERTY - null input produces null output consistently`() =
    runTest {
      // Invalid drawables (no bounds set) should consistently return null
      val invalidDrawable1 = ColorDrawable(Color.RED)
      val invalidDrawable2 = ColorDrawable(Color.BLUE)

      val result1 = convertDrawableToBase64(invalidDrawable1)
      val result2 = convertDrawableToBase64(invalidDrawable2)

      assertNotNull("Result1 should be null for invalid drawable", result1 == null)
      assertNotNull("Result2 should be null for invalid drawable", result2 == null)
    }

  @Test
  fun `PROPERTY - aspect ratio is preserved in bitmap`() {
    val testCases =
      listOf(
        Triple(100, 100, 1.0), // Square
        Triple(200, 100, 2.0), // 2:1
        Triple(147, 105, 1.4), // Card icon ratio
        Triple(100, 200, 0.5), // Portrait
      )

    testCases.forEach { (width, height, expectedRatio) ->
      val drawable =
        ColorDrawable(Color.YELLOW).apply {
          setBounds(0, 0, width, height)
        }

      val bitmap = getBitmapFromDrawable(drawable)

      assertNotNull(bitmap)
      val actualRatio = bitmap!!.width.toDouble() / bitmap.height.toDouble()
      assertEquals(
        "Aspect ratio should be preserved for ${width}x$height",
        expectedRatio,
        actualRatio,
        0.01, // Allow small floating point error
      )
    }
  }

  @Test
  fun `PROPERTY - conversion is deterministic across multiple runs`() =
    runTest {
      // Same drawable, converted multiple times in sequence, should always yield same result
      val drawable =
        ColorDrawable(Color.CYAN).apply {
          setBounds(0, 0, 120, 90)
        }

      val results = (1..15).map { convertDrawableToBase64(drawable) }

      // All results should be identical
      val firstResult = results.first()
      results.forEach { result ->
        assertEquals("All conversions should be identical", firstResult, result)
      }
    }

  @Test
  fun `PROPERTY - different sizes with same color produce different base64`() =
    runTest {
      val color = Color.rgb(100, 150, 200)

      val sizes =
        listOf(
          Pair(50, 50),
          Pair(75, 75),
          Pair(100, 100),
          Pair(125, 125),
        )

      val results =
        sizes.map { (width, height) ->
          val drawable =
            ColorDrawable(color).apply {
              setBounds(0, 0, width, height)
            }
          convertDrawableToBase64(drawable)
        }

      // All results should be different (different sizes → different images)
      val uniqueResults = results.toSet()
      assertEquals(
        "Different sizes should produce different base64 even with same color",
        results.size,
        uniqueResults.size,
      )
    }
}
