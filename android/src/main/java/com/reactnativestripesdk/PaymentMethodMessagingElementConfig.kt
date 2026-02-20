@file:OptIn(PaymentMethodMessagingElementPreview::class)

package com.reactnativestripesdk

import android.content.Context
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementAppearanceException
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementConfigurationException
import com.reactnativestripesdk.utils.getDoubleOrNull
import com.reactnativestripesdk.utils.getStringList
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview

@Throws(PaymentMethodMessagingElementConfigurationException::class)
fun parseElementConfiguration(map: ReadableMap): PaymentMethodMessagingElement.Configuration {
  val amount =
    map.getDoubleOrNull("amount")?.toLong()
      ?: throw PaymentMethodMessagingElementConfigurationException("`amount` is required")
  val currency =
    map.getString("currency")
      ?: throw PaymentMethodMessagingElementConfigurationException("`currency` is required")

  val locale = map.getString("locale")
  val countryCode = map.getString("country")
  val stringPaymentMethodTypes = map.getStringList("paymentMethodTypes")
  val paymentMethodTypes =
    stringPaymentMethodTypes?.mapNotNull {
      PaymentMethod.Type.fromCode(it)
    }

  val config = PaymentMethodMessagingElement.Configuration()
  config.amount(amount)
  config.currency(currency)
  locale?.let { config.locale(it) }
  countryCode?.let { config.countryCode(it) }
  paymentMethodTypes?.let { config.paymentMethodTypes(it) }

  return config
}

fun parseAppearance(
  map: ReadableMap,
  context: Context,
): PaymentMethodMessagingElement.Appearance {
  val font =
    map.getMap("font")?.let {
      parseFont(
        it,
        context,
      )
    }

  val theme = getTheme(map)
  val textColor = dynamicColorFromParams(map, "textColor", theme)
  val linkTextColor = dynamicColorFromParams(map, "linkTextColor", theme)
  val appearance = PaymentMethodMessagingElement.Appearance()
  appearance.theme(theme)
  font?.let { appearance.font(font) }
  val colors = PaymentMethodMessagingElement.Appearance.Colors()
  textColor?.let { colors.textColor(it) }
  linkTextColor?.let { colors.infoIconColor(linkTextColor) }
  appearance.colors(colors)

  return appearance
}

private fun parseFont(
  map: ReadableMap,
  context: Context,
): PaymentMethodMessagingElement.Appearance.Font {
  val fontFamily =
    getFontResId(
      map,
      "family",
      context,
    )
  val scaleFactor = map.getDoubleOrNull("scale") ?: 1.0
  val textSize: Double = 16 * scaleFactor

  val font =
    PaymentMethodMessagingElement.Appearance
      .Font()
      .fontFamily(fontFamily)
      .fontSizeSp(textSize.toFloat())

  return font
}

private fun getTheme(map: ReadableMap): PaymentMethodMessagingElement.Appearance.Theme {
  val style = map.getString("style")
  return when (style) {
    "dark" -> PaymentMethodMessagingElement.Appearance.Theme.DARK
    "flat" -> PaymentMethodMessagingElement.Appearance.Theme.FLAT
    else -> PaymentMethodMessagingElement.Appearance.Theme.LIGHT
  }
}

/**
 * Parses a ThemedColor from [params] at [key]. Supports both:
 * - Single hex string: "#RRGGBB"
 * - Light/dark object: { "light": "#RRGGBB", "dark": "#RRGGBB" }
 * For light/dark objects, chooses the appropriate color based on current UI mode.
 * Returns null if no color is provided.
 */
private fun dynamicColorFromParams(
  params: ReadableMap?,
  key: String,
  theme: PaymentMethodMessagingElement.Appearance.Theme,
): Int? {
  if (params == null) {
    return null
  }

  // First check if it's a nested map { "light": "#RRGGBB", "dark": "#RRGGBB" }
  if (params.hasKey(key) && params.getType(key) == ReadableType.Map) {
    val colorMap = params.getMap(key)
    val isDark = theme == PaymentMethodMessagingElement.Appearance.Theme.DARK

    // Pick the hex for current mode, or null
    val hex =
      if (isDark) {
        colorMap?.getString("dark")
      } else {
        colorMap?.getString("light")
      }

    return colorFromHex(hex)
  }

  // Check if it's a single color string
  return colorFromHex(params.getString(key))
}

@Throws(PaymentMethodMessagingElementAppearanceException::class)
private fun colorFromHex(hexString: String?): Int? =
  hexString?.trim()?.replace("#", "")?.let {
    if (it.length == 6 || it.length == 8) {
      "#$it".toColorInt()
    } else {
      throw PaymentMethodMessagingElementAppearanceException(
        "Failed to set appearance. Expected hex string of length 6 or 8, but received: $it",
      )
    }
  }
