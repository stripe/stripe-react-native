package com.reactnativestripesdk

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.checkout.Checkout
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class CurrencySelectorAppearanceTest {
  private val context: Context = ApplicationProvider.getApplicationContext()

  @Test
  fun buildCurrencySelectorAppearance_WithNullMap_ReturnsDefaultAppearance() {
    val appearance = buildCurrencySelectorAppearance(null, context)

    assertNotNull(appearance)
  }

  @Test
  fun buildCurrencySelectorAppearance_WithEmptyMap_ReturnsDefaultAppearance() {
    val appearance = buildCurrencySelectorAppearance(readableMapOf(), context)

    assertNotNull(appearance)
  }

  @Test
  fun buildCurrencySelectorAppearance_WithColorStrings_Success() {
    val appearance =
      buildCurrencySelectorAppearance(
        readableMapOf(
          "background" to "#111111",
          "selectedBackground" to "#222222",
          "borderColor" to "#333333",
          "textColor" to "#444444",
          "selectedTextColor" to "#555555",
          "textSecondaryColor" to "#666666",
          "dangerColor" to "#777777",
        ),
        context,
      )

    assertNotNull(getField(appearance, "background"))
    assertNotNull(getField(appearance, "selectedBackground"))
    assertNotNull(getField(appearance, "borderColor"))
    assertNotNull(getField(appearance, "textColor"))
    assertNotNull(getField(appearance, "selectedTextColor"))
    assertNotNull(getField(appearance, "textSecondaryColor"))
    assertNotNull(getField(appearance, "dangerColor"))
  }

  @Test
  fun buildCurrencySelectorAppearance_WithThemedColor_UsesLightColor() {
    val appearance =
      buildCurrencySelectorAppearance(
        readableMapOf(
          "textColor" to
            readableMapOf(
              "light" to "#000000",
              "dark" to "#FFFFFF",
            ),
        ),
        context,
      )

    assertNotNull(getField(appearance, "textColor"))
  }

  @Test
  fun buildCurrencySelectorAppearance_WithInvalidColor_IgnoresValue() {
    val appearance =
      buildCurrencySelectorAppearance(
        readableMapOf(
          "textColor" to "#FF",
        ),
        context,
      )

    // Invalid hex is silently ignored (logged as warning), color remains null/default
    val field = appearance.javaClass.getDeclaredField("textColor")
    field.isAccessible = true
    val textColor = field.get(appearance)
    assertEquals(null, textColor)
  }

  @Test
  fun buildCurrencySelectorAppearance_WithDimensionsAndFont_Success() {
    val appearance =
      buildCurrencySelectorAppearance(
        readableMapOf(
          "cornerRadius" to 12.0,
          "borderWidth" to 2.0,
          "contentVerticalPadding" to 6.0,
          "font" to
            readableMapOf(
              "scale" to 1.2,
            ),
        ),
        context,
      )

    assertEquals(12f, getField(appearance, "cornerRadiusDp"))
    assertEquals(2f, getField(appearance, "borderWidthDp"))
    assertEquals(6f, getField(appearance, "contentVerticalPaddingDp"))
    assertEquals(1.2f, getField(appearance, "sizeScaleFactor"))
  }

  @Test
  fun buildCurrencySelectorAppearance_WithLabelContentValues_Success() {
    listOf("automatic", "currencyCode", "amount").forEach { labelContent ->
      val appearance =
        buildCurrencySelectorAppearance(
          readableMapOf(
            "labelContent" to labelContent,
          ),
          context,
        )

      assertNotNull(getField(appearance, "labelContent"))
    }
  }

  private fun getField(
    appearance: Checkout.CurrencySelectorContentAppearance,
    fieldName: String,
  ): Any? {
    val field = appearance.javaClass.getDeclaredField(fieldName)
    field.isAccessible = true
    return field.get(appearance)
  }
}
