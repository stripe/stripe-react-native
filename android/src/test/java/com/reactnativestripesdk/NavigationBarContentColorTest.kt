package com.reactnativestripesdk

import android.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NavigationBarContentColorTest {
  @Test
  fun `uses black content on white`() {
    assertEquals(Color.BLACK, NavigationBarView.contentColorFor(Color.WHITE))
  }

  @Test
  fun `uses white content on black`() {
    assertEquals(Color.WHITE, NavigationBarView.contentColorFor(Color.BLACK))
  }

  @Test
  fun `uses white content on dark dashboard backgrounds`() {
    assertEquals(Color.WHITE, NavigationBarView.contentColorFor(0xFF14171D.toInt()))
    assertEquals(Color.WHITE, NavigationBarView.contentColorFor(0xFF21252C.toInt()))
  }

  @Test
  fun `uses black content on light backgrounds`() {
    assertEquals(Color.BLACK, NavigationBarView.contentColorFor(0xFFF4F7FA.toInt()))
    assertEquals(Color.BLACK, NavigationBarView.contentColorFor(0xFFFFE082.toInt()))
  }

  @Test
  fun `uses white content on saturated dark brand colors`() {
    assertEquals(Color.WHITE, NavigationBarView.contentColorFor(0xFF533AFD.toInt()))
  }

  @Test
  fun `ignores the alpha channel when choosing`() {
    assertEquals(Color.WHITE, NavigationBarView.contentColorFor(0x8014171D.toInt()))
  }
}
