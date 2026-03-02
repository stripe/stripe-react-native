package com.reactnativestripesdk

import android.annotation.SuppressLint
import androidx.compose.ui.graphics.Color
import com.facebook.react.bridge.ReadableMap
import com.stripe.android.crypto.onramp.model.OnrampConfiguration
import com.stripe.android.link.LinkAppearance
import com.stripe.android.link.LinkAppearance.Colors
import com.stripe.android.link.LinkAppearance.PrimaryButton
import com.stripe.android.link.LinkAppearance.Style

@SuppressLint("RestrictedApi")
internal fun mapConfig(
  configMap: ReadableMap,
  publishableKey: String,
): OnrampConfiguration {
  val appearanceMap = configMap.getMap("appearance")
  val appearance =
    if (appearanceMap != null) {
      mapAppearance(appearanceMap)
    } else {
      LinkAppearance()
        .style(Style.AUTOMATIC)
    }

  val displayName = configMap.getString("merchantDisplayName") ?: ""
  val cryptoCustomerId = configMap.getString("cryptoCustomerId")

  return OnrampConfiguration()
    .merchantDisplayName(displayName)
    .publishableKey(publishableKey)
    .appearance(appearance)
    .cryptoCustomerId(cryptoCustomerId)
}

@SuppressLint("RestrictedApi")
internal fun mapAppearance(appearanceMap: ReadableMap): LinkAppearance {
  val lightColorsMap = appearanceMap.getMap("lightColors")
  val darkColorsMap = appearanceMap.getMap("darkColors")
  val styleStr = appearanceMap.getString("style")
  val primaryButtonMap = appearanceMap.getMap("primaryButton")

  val lightColors =
    if (lightColorsMap != null) {
      val primaryColorStr = lightColorsMap.getString("primary")
      val contentColorStr = lightColorsMap.getString("contentOnPrimary")
      val borderSelectedColorStr = lightColorsMap.getString("borderSelected")

      Colors()
        .primary(Color(android.graphics.Color.parseColor(primaryColorStr)))
        .contentOnPrimary(Color(android.graphics.Color.parseColor(contentColorStr)))
        .borderSelected(Color(android.graphics.Color.parseColor(borderSelectedColorStr)))
    } else {
      Colors()
    }

  val darkColors =
    if (darkColorsMap != null) {
      val primaryColorStr = darkColorsMap.getString("primary")
      val contentColorStr = darkColorsMap.getString("contentOnPrimary")
      val borderSelectedColorStr = darkColorsMap.getString("borderSelected")

      Colors()
        .primary(Color(android.graphics.Color.parseColor(primaryColorStr)))
        .contentOnPrimary(Color(android.graphics.Color.parseColor(contentColorStr)))
        .borderSelected(Color(android.graphics.Color.parseColor(borderSelectedColorStr)))
    } else {
      Colors()
    }

  val style =
    when (styleStr) {
      "ALWAYS_LIGHT" -> Style.ALWAYS_LIGHT
      "ALWAYS_DARK" -> Style.ALWAYS_DARK
      else -> Style.AUTOMATIC
    }

  val primaryButton =
    if (primaryButtonMap != null) {
      PrimaryButton()
        .cornerRadiusDp(
          if (primaryButtonMap.hasKey("cornerRadius")) {
            primaryButtonMap.getDouble("cornerRadius").toFloat()
          } else {
            null
          },
        ).heightDp(
          if (primaryButtonMap.hasKey("height")) {
            primaryButtonMap.getDouble("height").toFloat()
          } else {
            null
          },
        )
    } else {
      PrimaryButton()
    }

  return LinkAppearance()
    .lightColors(lightColors)
    .darkColors(darkColors)
    .style(style)
    .primaryButton(primaryButton)
}
