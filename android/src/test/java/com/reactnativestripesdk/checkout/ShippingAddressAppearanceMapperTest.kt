//
//  ShippingAddressAppearanceMapperTest.kt
//  stripe-react-native
//
//  Created by George Birch on 10/21/26.
//

package com.reactnativestripesdk.checkout

import android.content.Context
import androidx.core.graphics.toColorInt
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.elements.ShippingAddressElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import com.stripe.android.elements.ShippingAddressElement.Configuration.Appearance as ShippingAddressAppearance

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class ShippingAddressAppearanceMapperTest {

  private val context = ApplicationProvider.getApplicationContext<Context>()

  @Test
  fun `map maps shipping colors in both theme palettes`() {
    // Distinct values catch colors being dropped or assigned to a different field.
    val colors = mapOf(
      "primary" to Triple("primary", "#112233", "#102030"),
      "background" to Triple("surface", "#223344", "#203040"),
      "componentBackground" to Triple("component", "#334455", "#304050"),
      "componentBorder" to Triple("componentBorder", "#445566", "#405060"),
      "componentDivider" to Triple("componentDivider", "#556677", "#506070"),
      "primaryText" to Triple("onSurface", "#667788", "#607080"),
      "secondaryText" to Triple("subtitle", "#778899", "#708090"),
      "componentText" to Triple("onComponent", "#8899AA", "#8090A0"),
      "placeholderText" to Triple("placeholderText", "#99AABB", "#90A0B0"),
      "icon" to Triple("appBarIcon", "#AABBCC", "#A0B0C0"),
      "error" to Triple("error", "#BBCCDD", "#B0C0D0"),
    )
    val light = readableMapOf(*colors.map { (key, value) -> key to value.second }.toTypedArray())
    val dark = readableMapOf(*colors.map { (key, value) -> key to value.third }.toTypedArray())
    val palettes = listOf(
      light to false,
      readableMapOf("light" to light, "dark" to dark) to true,
    )

    for ((params, usesThemePalettes) in palettes) {
      val appearance = mapAppearance(readableMapOf("colors" to params))
      val mappedLight = appearance.readField<ShippingAddressAppearance.Colors>("colorsLight")
      val mappedDark = appearance.readField<ShippingAddressAppearance.Colors>("colorsDark")
      for ((key, expected) in colors) {
        val (field, lightHex, darkHex) = expected
        assertEquals("light $key", lightHex.toColorInt(), mappedLight.readField<Int>(field))
        assertEquals(
          "dark $key",
          (if (usesThemePalettes) darkHex else lightHex).toColorInt(),
          mappedDark.readField<Int>(field),
        )
      }
    }
  }

  @Test
  fun `map maps shipping insets and preserves omitted edges`() {
    val defaults = ShippingAddressAppearance().readField<ShippingAddressAppearance.Insets>("formInsetValues")
    val cases = listOf(
      readableMapOf() to listOf(
        defaults.readField<Float>("startDp"),
        defaults.readField<Float>("topDp"),
        defaults.readField<Float>("endDp"),
        defaults.readField<Float>("bottomDp"),
      ),
      readableMapOf("left" to 3.5, "top" to 7.5, "right" to 11.5, "bottom" to 15.5) to
        listOf(3.5f, 7.5f, 11.5f, 15.5f),
      readableMapOf("left" to 0, "bottom" to 9.5) to listOf(
        0f,
        defaults.readField<Float>("topDp"),
        defaults.readField<Float>("endDp"),
        9.5f,
      ),
    )

    // Asymmetric edges also catch left/right or top/bottom being swapped.
    for ((params, expected) in cases) {
      val insets = mapAppearance(readableMapOf("formInsetValues" to params))
        .readField<ShippingAddressAppearance.Insets>("formInsetValues")
      assertEquals(expected[0], insets.readField<Float>("startDp"))
      assertEquals(expected[1], insets.readField<Float>("topDp"))
      assertEquals(expected[2], insets.readField<Float>("endDp"))
      assertEquals(expected[3], insets.readField<Float>("bottomDp"))
    }
  }

  @Test
  fun `map maps shipping primary button appearance`() {
    val fontResId = context.resources.getIdentifier("nunito_400regular", "font", context.packageName)
    assertTrue("The bundled test font must be available", fontResId != 0)
    val light = readableMapOf("background" to "#112233", "text" to "#445566", "border" to "#778899")
    val dark = readableMapOf("background" to "#AABBCC", "text" to "#DDEEFF", "border" to "#102030")
    val palettes = listOf(
      light to false,
      readableMapOf("light" to light, "dark" to dark) to true,
    )

    for ((params, usesThemePalettes) in palettes) {
      val button = mapAppearance(
        readableMapOf(
          "primaryButton" to readableMapOf(
            "colors" to params,
            "shapes" to readableMapOf("borderRadius" to 14.5, "borderWidth" to 2.5, "height" to 52.5),
            "font" to readableMapOf("family" to "nunito_400regular"),
          ),
        ),
      ).readField<ShippingAddressAppearance.PrimaryButton>("primaryButton")

      val shape = button.readField<ShippingAddressAppearance.PrimaryButton.Shape>("shape")
      assertEquals(14.5f, shape.readField<Float>("cornerRadiusDp"))
      assertEquals(2.5f, shape.readField<Float>("borderStrokeWidthDp"))
      assertEquals(52.5f, shape.readField<Float>("heightDp"))
      assertEquals(
        fontResId,
        button.readField<ShippingAddressAppearance.PrimaryButton.Typography>("typography")
          .readField<Int>("fontResId"),
      )

      val colors = mapOf(
        "background" to ("#112233" to "#AABBCC"),
        "onBackground" to ("#445566" to "#DDEEFF"),
        "border" to ("#778899" to "#102030"),
      )
      val mappedLight = button.readField<ShippingAddressAppearance.PrimaryButton.Colors>("colorsLight")
      val mappedDark = button.readField<ShippingAddressAppearance.PrimaryButton.Colors>("colorsDark")
      for ((field, expected) in colors) {
        assertEquals("light $field", expected.first.toColorInt(), mappedLight.readField<Int>(field))
        assertEquals(
          "dark $field",
          (if (usesThemePalettes) expected.second else expected.first).toColorInt(),
          mappedDark.readField<Int>(field),
        )
      }
    }
  }

  private fun mapAppearance(params: ReadableMap): ShippingAddressAppearance =
    // Exercise the public configuration path, including the shipping-specific mapper.
    CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret_123",
        "returnURL" to "example://checkout",
        "shippingAddressElement" to readableMapOf("appearance" to params),
      ),
      context,
    ) {}.configuration
      .readField<ShippingAddressElement.Configuration>("shippingAddressElementConfiguration")
      .readField("appearance")

  @Suppress("UNCHECKED_CAST")
  private inline fun <reified T> Any.readField(name: String): T =
    javaClass.getDeclaredField(name).let { field ->
      field.isAccessible = true
      field.get(this) as T
    }
}
