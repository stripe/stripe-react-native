package com.reactnativestripesdk.mappers

import android.annotation.SuppressLint
import androidx.compose.ui.graphics.toArgb
import com.reactnativestripesdk.mapAppearance
import com.reactnativestripesdk.mapConfig
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.link.LinkAppearance.Style
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@RunWith(RobolectricTestRunner::class)
class OnrampMappersTest {
  @Test
  fun mapConfig_WithAppearance() {
    val appearance =
      readableMapOf(
        "style" to "ALWAYS_DARK",
      )
    val config =
      readableMapOf(
        "merchantDisplayName" to "Test",
        "appearance" to appearance,
        "cryptoCustomerId" to "cust_abc",
      )
    val result = mapConfig(config, "pk_test_123")

    assertNotNull(result)
  }

  @Test
  fun mapAppearance_EmptyMap_ReturnsDefaultValue() {
    val appearanceMap = readableMapOf()
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.AUTOMATIC, result.style)
  }

  @Test
  fun mapAppearance_StyleAlwaysLight() {
    val appearanceMap =
      readableMapOf(
        "style" to "ALWAYS_LIGHT",
      )
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.ALWAYS_LIGHT, result.style)
  }

  @Test
  fun mapAppearance_StyleAlwaysDark() {
    val appearanceMap =
      readableMapOf(
        "style" to "ALWAYS_DARK",
      )
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.ALWAYS_DARK, result.style)
  }

  @Test
  fun mapAppearance_StyleUnknown_DefaultsToAutomatic() {
    val appearanceMap =
      readableMapOf(
        "style" to "SOMETHING_UNKNOWN",
      )
    val result = mapAppearance(appearanceMap).build()

    assertEquals(Style.AUTOMATIC, result.style)
  }

  @Test
  fun mapAppearance_WithLightColors() {
    val lightColors =
      readableMapOf(
        "primary" to "#FF0000",
        "contentOnPrimary" to "#FFFFFF",
        "borderSelected" to "#00FF00",
      )
    val appearanceMap =
      readableMapOf(
        "lightColors" to lightColors,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(0xFFFF0000.toInt(), state.lightColors.primary.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), state.lightColors.contentOnPrimary.toArgb())
    assertEquals(0xFF00FF00.toInt(), state.lightColors.borderSelected.toArgb())
  }

  @Test
  fun mapAppearance_WithDarkColors() {
    val darkColors =
      readableMapOf(
        "primary" to "#0000FF",
        "contentOnPrimary" to "#000000",
        "borderSelected" to "#FF00FF",
      )
    val appearanceMap =
      readableMapOf(
        "darkColors" to darkColors,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(0xFF0000FF.toInt(), state.darkColors.primary.toArgb())
    assertEquals(0xFF000000.toInt(), state.darkColors.contentOnPrimary.toArgb())
    assertEquals(0xFFFF00FF.toInt(), state.darkColors.borderSelected.toArgb())
  }

  @Test
  fun mapAppearance_WithLightAndDarkColors() {
    val lightColors =
      readableMapOf(
        "primary" to "#FF0000",
        "contentOnPrimary" to "#FFFFFF",
        "borderSelected" to "#00FF00",
      )
    val darkColors =
      readableMapOf(
        "primary" to "#0000FF",
        "contentOnPrimary" to "#000000",
        "borderSelected" to "#FF00FF",
      )
    val appearanceMap =
      readableMapOf(
        "lightColors" to lightColors,
        "darkColors" to darkColors,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(0xFFFF0000.toInt(), state.lightColors.primary.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), state.lightColors.contentOnPrimary.toArgb())
    assertEquals(0xFF00FF00.toInt(), state.lightColors.borderSelected.toArgb())

    assertEquals(0xFF0000FF.toInt(), state.darkColors.primary.toArgb())
    assertEquals(0xFF000000.toInt(), state.darkColors.contentOnPrimary.toArgb())
    assertEquals(0xFFFF00FF.toInt(), state.darkColors.borderSelected.toArgb())
  }

  @Test
  fun mapAppearance_WithPrimaryButton() {
    val primaryButton =
      readableMapOf(
        "cornerRadius" to 8.0,
        "height" to 48.0,
      )
    val appearanceMap =
      readableMapOf(
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(8f, state.primaryButton.cornerRadiusDp)
    assertEquals(48f, state.primaryButton.heightDp)
  }

  @Test
  fun mapAppearance_WithPrimaryButtonPartialFields() {
    val primaryButton =
      readableMapOf(
        "cornerRadius" to 12.0,
      )
    val appearanceMap =
      readableMapOf(
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(12f, state.primaryButton.cornerRadiusDp)
    assertNull(state.primaryButton.heightDp)
  }

  @Test
  fun mapAppearance_FullConfig() {
    val lightColors =
      readableMapOf(
        "primary" to "#FF0000",
        "contentOnPrimary" to "#FFFFFF",
        "borderSelected" to "#00FF00",
      )
    val darkColors =
      readableMapOf(
        "primary" to "#0000FF",
        "contentOnPrimary" to "#000000",
        "borderSelected" to "#FF00FF",
      )
    val primaryButton =
      readableMapOf(
        "cornerRadius" to 8.0,
        "height" to 48.0,
      )
    val appearanceMap =
      readableMapOf(
        "style" to "ALWAYS_LIGHT",
        "lightColors" to lightColors,
        "darkColors" to darkColors,
        "primaryButton" to primaryButton,
      )
    val state = mapAppearance(appearanceMap).build()

    assertEquals(Style.ALWAYS_LIGHT, state.style)

    assertEquals(0xFFFF0000.toInt(), state.lightColors.primary.toArgb())
    assertEquals(0xFFFFFFFF.toInt(), state.lightColors.contentOnPrimary.toArgb())
    assertEquals(0xFF00FF00.toInt(), state.lightColors.borderSelected.toArgb())

    assertEquals(0xFF0000FF.toInt(), state.darkColors.primary.toArgb())
    assertEquals(0xFF000000.toInt(), state.darkColors.contentOnPrimary.toArgb())
    assertEquals(0xFFFF00FF.toInt(), state.darkColors.borderSelected.toArgb())

    assertEquals(8f, state.primaryButton.cornerRadiusDp)
    assertEquals(48f, state.primaryButton.heightDp)
  }
}
