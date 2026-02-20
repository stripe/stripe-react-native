@file:OptIn(PaymentMethodMessagingElementPreview::class)

package com.reactnativestripesdk

import android.content.Context
import androidx.core.graphics.toColorInt
import androidx.test.core.app.ApplicationProvider
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementAppearanceException
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementConfigurationException
import com.reactnativestripesdk.utils.readableArrayOf
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PaymentMethodMessagingElementConfigTest {
  private val context: Context = ApplicationProvider.getApplicationContext()

  // ============================================
  // parseElementConfiguration Tests
  // ============================================

  @Test(expected = PaymentMethodMessagingElementConfigurationException::class)
  fun parseElementConfiguration_EmptyMap_Throws_Exception() {
    val params = readableMapOf()

    parseElementConfiguration(params)
  }

  @Test
  fun parseElementConfiguration_WithAmountAndCurrency_Success() {
    val params =
      readableMapOf(
        "amount" to 1000,
        "currency" to "usd",
      )

    val result = parseElementConfiguration(params)

    val expected =
      PaymentMethodMessagingElement
        .Configuration()
        .amount(1000)
        .currency("usd")

    checkEquals(expected, result)
  }

  @Test
  fun parseElementConfiguration_WithLocale_Success() {
    val params =
      readableMapOf(
        "amount" to 1000,
        "currency" to "usd",
        "locale" to "en_US",
      )

    val result = parseElementConfiguration(params)
    val expected =
      PaymentMethodMessagingElement
        .Configuration()
        .amount(1000)
        .currency("usd")
        .locale("en_US")

    checkEquals(expected, result)
  }

  @Test
  fun parseElementConfiguration_WithCountry_Success() {
    val params =
      readableMapOf(
        "amount" to 1000,
        "currency" to "usd",
        "country" to "US",
      )

    val result = parseElementConfiguration(params)
    val expected =
      PaymentMethodMessagingElement
        .Configuration()
        .amount(1000)
        .currency("usd")
        .countryCode("US")

    checkEquals(expected, result)
  }

  @Test
  fun parseElementConfiguration_WithPaymentMethodTypes_Success() {
    val params =
      readableMapOf(
        "amount" to 1000,
        "currency" to "usd",
        "paymentMethodTypes" to readableArrayOf("card", "klarna", "affirm"),
      )

    val result = parseElementConfiguration(params)
    val expected =
      PaymentMethodMessagingElement
        .Configuration()
        .amount(1000)
        .currency("usd")
        .paymentMethodTypes(
          listOf(PaymentMethod.Type.Card, PaymentMethod.Type.Klarna, PaymentMethod.Type.Affirm),
        )

    checkEquals(expected, result)
  }

  @Test
  fun parseElementConfiguration_WithInvalidPaymentMethodTypes_FiltersInvalid() {
    val params =
      readableMapOf(
        "amount" to 1000,
        "currency" to "usd",
        "paymentMethodTypes" to readableArrayOf("card", "invalid_type", "klarna"),
      )

    val result = parseElementConfiguration(params)
    val expected =
      PaymentMethodMessagingElement
        .Configuration()
        .amount(1000)
        .currency("usd")
        .paymentMethodTypes(
          listOf(PaymentMethod.Type.Card, PaymentMethod.Type.Klarna),
        )

    checkEquals(expected, result)
  }

  @Test
  fun parseElementConfiguration_CompleteConfiguration_Success() {
    val params =
      readableMapOf(
        "amount" to 5000.0,
        "currency" to "eur",
        "locale" to "fr_FR",
        "country" to "FR",
        "paymentMethodTypes" to readableArrayOf("card", "klarna"),
      )

    val result = parseElementConfiguration(params)
    val expected =
      PaymentMethodMessagingElement
        .Configuration()
        .amount(5000)
        .currency("eur")
        .locale("fr_FR")
        .countryCode("FR")
        .paymentMethodTypes(listOf(PaymentMethod.Type.Card, PaymentMethod.Type.Klarna))

    checkEquals(expected, result)
  }

  @Test(expected = PaymentMethodMessagingElementConfigurationException::class)
  fun parseElementConfiguration_WithNullAmount_ThrowsException() {
    val params =
      readableMapOf(
        "amount" to null,
        "currency" to "usd",
      )

    parseElementConfiguration(params)
  }

  @Test(expected = PaymentMethodMessagingElementConfigurationException::class)
  fun parseElementConfiguration_WithNullCurrency_ThrowsException() {
    val params =
      readableMapOf(
        "amount" to 1000.0,
        "currency" to null,
      )

    parseElementConfiguration(params)
  }

  // ============================================
  // parseAppearance Tests
  // ============================================

  @Test
  fun parseAppearance_EmptyMap_ReturnsDefaultAppearance() {
    val params = readableMapOf()

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        colors(PaymentMethodMessagingElement.Appearance.Colors())
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithLightStyle_Success() {
    val params =
      readableMapOf(
        "style" to "light",
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        colors(PaymentMethodMessagingElement.Appearance.Colors())
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithDarkStyle_Success() {
    val params =
      readableMapOf(
        "style" to "dark",
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.DARK)
        colors(PaymentMethodMessagingElement.Appearance.Colors())
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithFlatStyle_Success() {
    val params =
      readableMapOf(
        "style" to "flat",
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.FLAT)
        colors(PaymentMethodMessagingElement.Appearance.Colors())
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithInvalidStyle_DefaultsToLight() {
    val params =
      readableMapOf(
        "style" to "invalid_style",
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        colors(PaymentMethodMessagingElement.Appearance.Colors())
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithTextColorHex_Success() {
    val params =
      readableMapOf(
        "textColor" to "#FF0000",
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        val colors =
          PaymentMethodMessagingElement.Appearance
            .Colors()
            .textColor("#FF0000".toColorInt())
        colors(colors)
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithTextColorLightDarkObject_Success() {
    val params =
      readableMapOf(
        "style" to "light",
        "textColor" to
          readableMapOf(
            "light" to "#000000",
            "dark" to "#FFFFFF",
          ),
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        val colors =
          PaymentMethodMessagingElement.Appearance
            .Colors()
            .textColor("#000000".toColorInt())
        colors(colors)
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithTextColorDarkTheme_UsesCorrectColor() {
    val params =
      readableMapOf(
        "style" to "dark",
        "textColor" to
          readableMapOf(
            "light" to "#000000",
            "dark" to "#FFFFFF",
          ),
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.DARK)
        val colors =
          PaymentMethodMessagingElement.Appearance
            .Colors()
            .textColor("#FFFFFF".toColorInt())
        colors(colors)
      }

    checkEquals(expected, result)
  }

  @Test(expected = PaymentMethodMessagingElementAppearanceException::class)
  fun parseAppearance_WithInvalidTextColorHex_ThrowsException() {
    val params =
      readableMapOf(
        "textColor" to "#FF",
      )

    parseAppearance(params, context)
  }

  @Test
  fun parseAppearance_WithLinkTextColor_Success() {
    val params =
      readableMapOf(
        "linkTextColor" to "#0000FF",
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        val colors =
          PaymentMethodMessagingElement.Appearance
            .Colors()
            .infoIconColor("#0000FF".toColorInt())
        colors(colors)
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithLinkTextColorLightDarkObject_Success() {
    val params =
      readableMapOf(
        "style" to "light",
        "linkTextColor" to
          readableMapOf(
            "light" to "#0000FF",
            "dark" to "#00FFFF",
          ),
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        val colors =
          PaymentMethodMessagingElement.Appearance
            .Colors()
            .infoIconColor("#0000FF".toColorInt())
        colors(colors)
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_WithFontScaleOnly_Success() {
    val params =
      readableMapOf(
        "font" to
          readableMapOf(
            "scale" to 1.5,
          ),
      )

    val result = parseAppearance(params, context)
    val expected =
      PaymentMethodMessagingElement.Appearance().apply {
        theme(PaymentMethodMessagingElement.Appearance.Theme.LIGHT)
        val font =
          PaymentMethodMessagingElement.Appearance
            .Font()
            .fontFamily(null)
            .fontSizeSp((16 * 1.5).toFloat())
        font(font)
        colors(PaymentMethodMessagingElement.Appearance.Colors())
      }

    checkEquals(expected, result)
  }

  @Test
  fun parseAppearance_CompleteAppearance_Success() {
    val params =
      readableMapOf(
        "style" to "dark",
        "textColor" to "#FFFFFF",
        "linkTextColor" to "#00FFFF",
        "font" to
          readableMapOf(
            "scale" to 1.2,
          ),
      )

    val result = parseAppearance(params, context)

    // We can't easily predict the font resource ID in tests, so just verify it doesn't crash
    assertNotNull(result)
  }

  private fun checkEquals(
    expected: PaymentMethodMessagingElement.Configuration,
    actual: PaymentMethodMessagingElement.Configuration,
  ) {
    val fieldNames = listOf("amount", "currency", "locale", "countryCode", "paymentMethodTypes")

    for (fieldName in fieldNames) {
      val expectedField = expected.javaClass.getDeclaredField(fieldName)
      expectedField.isAccessible = true
      val expectedValue = expectedField.get(expected)

      val actualField = actual.javaClass.getDeclaredField(fieldName)
      actualField.isAccessible = true
      val actualValue = actualField.get(actual)

      assertEquals(expectedValue, actualValue)
    }
  }

  private fun checkEquals(
    expected: PaymentMethodMessagingElement.Appearance,
    actual: PaymentMethodMessagingElement.Appearance,
  ) {
    val fieldNames = listOf("theme", "font", "colors")

    for (fieldName in fieldNames) {
      val expectedField = expected.javaClass.getDeclaredField(fieldName)
      expectedField.isAccessible = true
      val expectedValue = expectedField.get(expected)

      val actualField = actual.javaClass.getDeclaredField(fieldName)
      actualField.isAccessible = true
      val actualValue = actualField.get(actual)

      when (fieldName) {
        "font" -> {
          if (expectedValue != null && actualValue != null) {
            checkEqualsFont(
              expectedValue, // as PaymentMethodMessagingElement.Appearance.Font,
              actualValue, // as PaymentMethodMessagingElement.Appearance.Font
            )
          } else {
            assertEquals(expectedValue, actualValue)
          }
        }
        "colors" -> {
          if (expectedValue != null && actualValue != null) {
            checkEqualsColors(
              expectedValue, // as PaymentMethodMessagingElement.Appearance.Colors,
              actualValue, // as PaymentMethodMessagingElement.Appearance.Colors
            )
          } else {
            assertEquals(expectedValue, actualValue)
          }
        }
        else -> assertEquals(expectedValue, actualValue)
      }
    }
  }

  private fun checkEqualsFont(
    expected: Any,
    actual: Any,
  ) {
    val fieldNames = listOf("fontFamily", "fontSizeSp")

    for (fieldName in fieldNames) {
      val expectedField = expected.javaClass.getDeclaredField(fieldName)
      expectedField.isAccessible = true
      val expectedValue = expectedField.get(expected)

      val actualField = actual.javaClass.getDeclaredField(fieldName)
      actualField.isAccessible = true
      val actualValue = actualField.get(actual)

      assertEquals("Font field '$fieldName' mismatch", expectedValue, actualValue)
    }
  }

  private fun checkEqualsColors(
    expected: Any,
    actual: Any,
  ) {
    val fieldNames = listOf("textColor", "infoIconColor")

    for (fieldName in fieldNames) {
      val expectedField = expected.javaClass.getDeclaredField(fieldName)
      expectedField.isAccessible = true
      val expectedValue = expectedField.get(expected)

      val actualField = actual.javaClass.getDeclaredField(fieldName)
      actualField.isAccessible = true
      val actualValue = actualField.get(actual)

      assertEquals("Colors field '$fieldName' mismatch", expectedValue, actualValue)
    }
  }
}
