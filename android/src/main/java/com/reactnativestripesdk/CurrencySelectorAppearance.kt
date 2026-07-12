package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import androidx.compose.ui.graphics.Color
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.stripe.android.checkout.Checkout
import com.stripe.android.paymentelement.CheckoutSessionPreview

@OptIn(CheckoutSessionPreview::class)
@SuppressLint("RestrictedApi")
fun buildCurrencySelectorAppearance(
  params: ReadableMap?,
  context: Context,
): Checkout.CurrencySelectorContentAppearance {
  val appearance = Checkout.CurrencySelectorContentAppearance()

  params ?: return appearance

  applyCurrencySelectorColors(appearance, params, context)
  applyCurrencySelectorDimensions(appearance, params)
  applyCurrencySelectorFont(appearance, params, context)
  applyCurrencySelectorLabelContent(appearance, params)

  return appearance
}

@OptIn(CheckoutSessionPreview::class)
@SuppressLint("RestrictedApi")
private fun applyCurrencySelectorColors(
  appearance: Checkout.CurrencySelectorContentAppearance,
  params: ReadableMap,
  context: Context,
) {
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.BACKGROUND)?.let {
    appearance.background(it)
  }
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.SELECTED_BACKGROUND)?.let {
    appearance.selectedBackground(it)
  }
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.BORDER_COLOR)?.let {
    appearance.borderColor(it)
  }
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.TEXT_COLOR)?.let {
    appearance.textColor(it)
  }
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.SELECTED_TEXT_COLOR)?.let {
    appearance.selectedTextColor(it)
  }
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.TEXT_SECONDARY_COLOR)?.let {
    appearance.textSecondaryColor(it)
  }
  dynamicColorFromParams(context, params, CurrencySelectorAppearanceKeys.DANGER_COLOR)?.let {
    appearance.dangerColor(it)
  }
}

@OptIn(CheckoutSessionPreview::class)
@SuppressLint("RestrictedApi")
private fun applyCurrencySelectorDimensions(
  appearance: Checkout.CurrencySelectorContentAppearance,
  params: ReadableMap,
) {
  getFloatOrNull(params, CurrencySelectorAppearanceKeys.CORNER_RADIUS)?.let {
    appearance.cornerRadiusDp(it)
  }
  getFloatOrNull(params, CurrencySelectorAppearanceKeys.BORDER_WIDTH)?.let {
    appearance.borderWidthDp(it)
  }
  getFloatOrNull(params, CurrencySelectorAppearanceKeys.CONTENT_VERTICAL_PADDING)?.let {
    appearance.contentVerticalPaddingDp(it)
  }
}

@OptIn(CheckoutSessionPreview::class)
@SuppressLint("RestrictedApi")
private fun applyCurrencySelectorFont(
  appearance: Checkout.CurrencySelectorContentAppearance,
  params: ReadableMap,
  context: Context,
) {
  params.getMap(CurrencySelectorAppearanceKeys.FONT)?.let { font ->
    getCurrencySelectorFontResId(font, CurrencySelectorAppearanceKeys.FAMILY, context)?.let {
      appearance.fontResId(it)
    }
    getFloatOrNull(font, CurrencySelectorAppearanceKeys.SCALE)?.let {
      appearance.sizeScaleFactor(it)
    }
  }
}

@OptIn(CheckoutSessionPreview::class)
@SuppressLint("RestrictedApi")
private fun applyCurrencySelectorLabelContent(
  appearance: Checkout.CurrencySelectorContentAppearance,
  params: ReadableMap,
) {
  when (params.getString(CurrencySelectorAppearanceKeys.LABEL_CONTENT)) {
    CurrencySelectorAppearanceKeys.AMOUNT -> {
      appearance.labelContent(Checkout.CurrencySelectorContentAppearance.LabelContent.AMOUNT)
    }
    CurrencySelectorAppearanceKeys.CURRENCY_CODE -> {
      appearance.labelContent(Checkout.CurrencySelectorContentAppearance.LabelContent.CURRENCY_CODE)
    }
    CurrencySelectorAppearanceKeys.AUTOMATIC -> {
      appearance.labelContent(Checkout.CurrencySelectorContentAppearance.LabelContent.AUTOMATIC)
    }
  }
}

private fun dynamicColorFromParams(
  context: Context,
  params: ReadableMap?,
  key: String,
): Color? {
  if (params == null) {
    return null
  }

  if (params.hasKey(key) && params.getType(key) == ReadableType.Map) {
    val colorMap = params.getMap(key)
    val isDark =
      (
        context.resources.configuration.uiMode
          and Configuration.UI_MODE_NIGHT_MASK
      ) == Configuration.UI_MODE_NIGHT_YES

    val hex =
      if (isDark) {
        colorMap?.getString(CurrencySelectorAppearanceKeys.DARK)
      } else {
        colorMap?.getString(CurrencySelectorAppearanceKeys.LIGHT)
      }

    return colorFromHex(hex)?.let { Color(it) }
  }

  return colorFromHex(params.getString(key))?.let { Color(it) }
}

private fun colorFromHex(hexString: String?): Int? =
  hexString?.trim()?.replace("#", "")?.let {
    if (it.length == HEX_COLOR_LENGTH_RGB || it.length == HEX_COLOR_LENGTH_ARGB) {
      "#$it".toColorInt()
    } else {
      android.util.Log.w(
        "StripeCurrencySelector",
        "Invalid hex color: expected length 6 or 8, but received: $it",
      )
      null
    }
  }

private fun getFloatOrNull(
  map: ReadableMap?,
  key: String,
): Float? =
  if (map?.hasKey(key) == true && map.getType(key) == ReadableType.Number) {
    map.getDouble(key).toFloat()
  } else {
    null
  }

@SuppressLint("DiscouragedApi")
private fun getCurrencySelectorFontResId(
  map: ReadableMap?,
  key: String,
  context: Context,
): Int? {
  val fontErrorPrefix = "Encountered an error when setting a custom font:"
  if (map?.hasKey(key) != true) {
    return null
  }

  val fontFileName = map.getString(key)
  val validationError =
    when {
      fontFileName == null ->
        "$fontErrorPrefix expected String for font.$key, but received null."
      Regex("[^a-z0-9_]").containsMatchIn(fontFileName) ->
        "$fontErrorPrefix appearance.font.$key should only contain " +
          "lowercase alphanumeric characters and underscores on Android, " +
          "but received '$fontFileName'. " +
          "This value must match the filename in android/app/src/main/res/font"
      else -> null
    }
  if (validationError != null) {
    throw PaymentSheetAppearanceException(validationError)
  }

  val id = context.resources.getIdentifier(fontFileName, "font", context.packageName)
  if (id == 0) {
    throw PaymentSheetAppearanceException("$fontErrorPrefix Failed to find font: $fontFileName")
  }
  return id
}

private object CurrencySelectorAppearanceKeys {
  const val LIGHT = "light"
  const val DARK = "dark"

  const val BACKGROUND = "background"
  const val SELECTED_BACKGROUND = "selectedBackground"
  const val BORDER_COLOR = "borderColor"
  const val TEXT_COLOR = "textColor"
  const val SELECTED_TEXT_COLOR = "selectedTextColor"
  const val TEXT_SECONDARY_COLOR = "textSecondaryColor"
  const val DANGER_COLOR = "dangerColor"

  const val CORNER_RADIUS = "cornerRadius"
  const val BORDER_WIDTH = "borderWidth"
  const val CONTENT_VERTICAL_PADDING = "contentVerticalPadding"

  const val FONT = "font"
  const val FAMILY = "family"
  const val SCALE = "scale"

  const val LABEL_CONTENT = "labelContent"
  const val AUTOMATIC = "automatic"
  const val CURRENCY_CODE = "currencyCode"
  const val AMOUNT = "amount"
}

private const val HEX_COLOR_LENGTH_RGB = 6
private const val HEX_COLOR_LENGTH_ARGB = 8
