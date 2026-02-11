package com.reactnativestripesdk

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DrawableLoadingTest {
  /**
   * Mock drawable that simulates DelegateDrawable's async loading behavior
   */
  class MockAsyncDrawable : Drawable() {
    private var loaded = false
    private var width = 1
    private var height = 1

    override fun getIntrinsicWidth(): Int = width

    override fun getIntrinsicHeight(): Int = height

    suspend fun simulateLoading(delayMs: Long = 100) {
      delay(delayMs)
      width = 150
      height = 100
      loaded = true
      invalidateSelf() // Trigger callback
    }

    override fun draw(canvas: Canvas) {
      // Draw a simple colored rectangle
      canvas.drawColor(Color.RED)
    }

    override fun setAlpha(alpha: Int) {}

    override fun setColorFilter(colorFilter: ColorFilter?) {}

    override fun getOpacity(): Int = PixelFormat.OPAQUE
  }

  @Test
  fun `waitForDrawableToLoad returns immediately for already loaded drawable`() =
    runTest {
      val drawable = MockAsyncDrawable()
      // Pre-load the drawable
      drawable.simulateLoading(0)

      val startTime = System.currentTimeMillis()
      val result = waitForDrawableToLoad(drawable, timeoutMs = 3000)
      val elapsed = System.currentTimeMillis() - startTime

      assertNotNull(result)
      assertTrue("Should return quickly (< 100ms)", elapsed < 100)
      assertTrue("Drawable should be loaded", result.intrinsicWidth > 1)
    }

  @Test
  fun `waitForDrawableToLoad waits for drawable to load`() =
    runTest {
      val drawable = MockAsyncDrawable()

      // Start async loading
      launch {
        drawable.simulateLoading(100)
      }

      val result = waitForDrawableToLoad(drawable, timeoutMs = 3000)

      assertNotNull(result)
      assertTrue("Drawable should be loaded after waiting", result.intrinsicWidth > 1)
      assertTrue("Drawable should be loaded after waiting", result.intrinsicHeight > 1)
      assertTrue("Width should be 150", result.intrinsicWidth == 150)
      assertTrue("Height should be 100", result.intrinsicHeight == 100)
    }

  @Test
  fun `waitForDrawableToLoad times out gracefully for drawable that never loads`() =
    runTest {
      val drawable = MockAsyncDrawable() // Never call simulateLoading()

      val result = waitForDrawableToLoad(drawable, timeoutMs = 500)

      // Should return the drawable even if timeout (best effort)
      assertNotNull(result)
    }

  @Test
  fun `convertDrawableToBase64 with async drawable returns consistent results`() =
    runTest {
      val drawable1 = MockAsyncDrawable()
      val drawable2 = MockAsyncDrawable()

      // Simulate both loading
      launch { drawable1.simulateLoading(50) }
      launch { drawable2.simulateLoading(100) }

      val result1 = convertDrawableToBase64(drawable1)
      val result2 = convertDrawableToBase64(drawable2)

      assertNotNull("Result1 should not be null", result1)
      assertNotNull("Result2 should not be null", result2)

      // Both should be non-empty and similar length (same dimensions)
      assertTrue("Both results should be non-empty", result1!!.isNotEmpty())
      assertTrue("Both results should be non-empty", result2!!.isNotEmpty())

      // They should be similar length since both are 150x100
      val lengthDiff = kotlin.math.abs(result1.length - result2.length)
      assertTrue(
        "Results should have similar length (both 150x100), diff: $lengthDiff",
        lengthDiff < result1.length * 0.1, // Within 10%
      )
    }

  @Test
  fun `waitForDrawableToLoad handles multiple concurrent calls`() =
    runTest {
      val drawable1 = MockAsyncDrawable()
      val drawable2 = MockAsyncDrawable()
      val drawable3 = MockAsyncDrawable()

      // Start all loading at the same time
      launch { drawable1.simulateLoading(50) }
      launch { drawable2.simulateLoading(75) }
      launch { drawable3.simulateLoading(100) }

      // Wait for all concurrently
      val result1 = waitForDrawableToLoad(drawable1, timeoutMs = 3000)
      val result2 = waitForDrawableToLoad(drawable2, timeoutMs = 3000)
      val result3 = waitForDrawableToLoad(drawable3, timeoutMs = 3000)

      assertNotNull(result1)
      assertNotNull(result2)
      assertNotNull(result3)

      assertTrue("All drawables should be loaded", result1.intrinsicWidth > 1)
      assertTrue("All drawables should be loaded", result2.intrinsicWidth > 1)
      assertTrue("All drawables should be loaded", result3.intrinsicWidth > 1)
    }
}
