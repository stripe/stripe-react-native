package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.getBooleanOrNull
import com.reactnativestripesdk.utils.getDoubleOrNull
import com.reactnativestripesdk.utils.getFloatOr
import com.reactnativestripesdk.utils.getFloatOrNull
import com.stripe.android.paymentelement.AppearanceAPIAdditionsPreview
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.uicore.StripeThemeDefaults

@SuppressLint("RestrictedApi")
fun buildPaymentSheetAppearance(
  userParams: ReadableMap?,
  context: Context,
): PaymentSheet.Appearance {
  val colorParams = userParams?.getMap(PaymentSheetAppearanceKeys.COLORS)
  val lightColorParams = colorParams?.getMap(PaymentSheetAppearanceKeys.LIGHT) ?: colorParams
  val darkColorParams = colorParams?.getMap(PaymentSheetAppearanceKeys.DARK) ?: colorParams
  val insetParams = userParams?.getMap(PaymentSheetAppearanceKeys.FORM_INSETS)

  val embeddedAppearance =
    buildEmbeddedAppearance(
      userParams?.getMap(PaymentSheetAppearanceKeys.EMBEDDED_PAYMENT_ELEMENT),
      context,
    )

  val builder = PaymentSheet.Appearance.Builder()
  builder.typography(buildTypography(userParams?.getMap(PaymentSheetAppearanceKeys.FONT), context))
  builder.colorsLight(buildColorsBuilder(isLightMode = true, lightColorParams).build())
  builder.colorsDark(buildColorsBuilder(isLightMode = false, darkColorParams).build())
  builder.shapes(buildShapes(userParams?.getMap(PaymentSheetAppearanceKeys.SHAPES)))
  builder.primaryButton(
    buildPrimaryButton(
      userParams?.getMap(PaymentSheetAppearanceKeys.PRIMARY_BUTTON),
      context,
    ),
  )
  builder.embeddedAppearance(embeddedAppearance)
  builder.formInsetValues(buildFormInsets(insetParams))
  return builder.build()
}

@SuppressLint("RestrictedApi")
@OptIn(AppearanceAPIAdditionsPreview::class)
private fun buildTypography(
  fontParams: ReadableMap?,
  context: Context,
): PaymentSheet.Typography {
  val scale = fontParams.getDoubleOrNull(PaymentSheetAppearanceKeys.SCALE)
  val resId =
    getFontResId(
      fontParams,
      PaymentSheetAppearanceKeys.FAMILY,
      context,
    )
  val builder = PaymentSheet.Typography.Builder()
  scale?.let {
    builder.sizeScaleFactor(it.toFloat())
  }
  resId?.let {
    builder.fontResId(it)
  }
  return builder.build()
}

@Throws(PaymentSheetAppearanceException::class)
private fun colorFromHex(hexString: String?): Int? =
  hexString?.trim()?.replace("#", "")?.let {
    if (it.length == 6 || it.length == 8) {
      "#$it".toColorInt()
    } else {
      throw PaymentSheetAppearanceException(
        "Failed to set Payment Sheet appearance. Expected hex string of length 6 or 8, but received: $it",
      )
    }
  }

@SuppressLint("RestrictedApi")
private fun buildColorsBuilder(
  isLightMode: Boolean,
  colorParams: ReadableMap?,
): PaymentSheet.Colors.Builder {
  val builder =
    if (isLightMode) {
      PaymentSheet.Colors.Builder.light()
    } else {
      PaymentSheet.Colors.Builder.dark()
    }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.PRIMARY))?.let {
    builder.primary(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.BACKGROUND))?.let {
    builder.surface(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.COMPONENT_BACKGROUND))?.let {
    builder.component(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.COMPONENT_BORDER))?.let {
    builder.componentBorder(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.COMPONENT_DIVIDER))?.let {
    builder.componentDivider(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.COMPONENT_TEXT))?.let {
    builder.onComponent(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.PRIMARY_TEXT))?.let {
    builder.onSurface(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.SECONDARY_TEXT))?.let {
    builder.subtitle(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.PLACEHOLDER_TEXT))?.let {
    builder.placeholderText(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.ICON))?.let {
    builder.appBarIcon(it)
  }

  colorFromHex(colorParams?.getString(PaymentSheetAppearanceKeys.ERROR))?.let {
    builder.error(it)
  }

  return builder
}

@SuppressLint("RestrictedApi")
private fun buildShapes(shapeParams: ReadableMap?): PaymentSheet.Shapes {
  val builder = PaymentSheet.Shapes.Builder()

  shapeParams.getFloatOrNull(PaymentSheetAppearanceKeys.BORDER_RADIUS)?.let {
    builder.cornerRadiusDp(it)
  }

  shapeParams.getFloatOrNull(PaymentSheetAppearanceKeys.BORDER_WIDTH)?.let {
    builder.borderStrokeWidthDp(it)
  }

  return builder.build()
}

@SuppressLint("RestrictedApi")
private fun buildPrimaryButton(
  params: ReadableMap?,
  context: Context,
): PaymentSheet.PrimaryButton {
  if (params == null) {
    return PaymentSheet.PrimaryButton()
  }

  val fontParams = params.getMap(PaymentSheetAppearanceKeys.FONT) ?: Arguments.createMap()
  val shapeParams = params.getMap(PaymentSheetAppearanceKeys.SHAPES) ?: Arguments.createMap()
  val colorParams = params.getMap(PaymentSheetAppearanceKeys.COLORS) ?: Arguments.createMap()
  val lightColorParams = colorParams.getMap(PaymentSheetAppearanceKeys.LIGHT) ?: colorParams
  val darkColorParams = colorParams.getMap(PaymentSheetAppearanceKeys.DARK) ?: colorParams

  return PaymentSheet.PrimaryButton(
    colorsLight =
      buildPrimaryButtonColors(true, lightColorParams, context).build(),
    colorsDark =
      buildPrimaryButtonColors(false, darkColorParams, context).build(),
    shape =
      PaymentSheet.PrimaryButtonShape(
        cornerRadiusDp =
          shapeParams.getFloatOrNull(PaymentSheetAppearanceKeys.BORDER_RADIUS),
        borderStrokeWidthDp =
          shapeParams.getFloatOrNull(PaymentSheetAppearanceKeys.BORDER_WIDTH),
        heightDp = shapeParams.getFloatOrNull(PaymentSheetAppearanceKeys.HEIGHT),
      ),
    typography =
      PaymentSheet.PrimaryButtonTypography(
        fontResId =
          getFontResId(fontParams, PaymentSheetAppearanceKeys.FAMILY, context),
      ),
  )
}

@SuppressLint("RestrictedApi")
@Throws(PaymentSheetAppearanceException::class)
private fun buildPrimaryButtonColors(
  isLightMode: Boolean,
  colorParams: ReadableMap,
  context: Context,
): PaymentSheet.PrimaryButtonColors.Builder {
  val builder =
    if (isLightMode) {
      PaymentSheet.PrimaryButtonColors.Builder.light()
    } else {
      PaymentSheet.PrimaryButtonColors.Builder.dark()
    }

  // TODO: Why is background a string but successBackgroundColor a "dynamic" color?
  // https://stripe.dev/stripe-react-native/api-reference/types/PaymentSheet.PrimaryButtonColorConfig.html
  colorFromHex(colorParams.getString(PaymentSheetAppearanceKeys.BACKGROUND))?.let {
    builder.background(it)
  }

  colorFromHex(colorParams.getString(PaymentSheetAppearanceKeys.TEXT))?.let {
    builder.onBackground(it)
  }

  colorFromHex(colorParams.getString(PaymentSheetAppearanceKeys.BORDER))?.let {
    builder.border(it)
  }

  dynamicColorFromParams(
    context,
    colorParams,
    PaymentSheetAppearanceKeys.SUCCESS_BACKGROUND,
  )?.let {
    builder.successBackgroundColor(it)
  }

  dynamicColorFromParams(
    context,
    colorParams,
    PaymentSheetAppearanceKeys.SUCCESS_TEXT,
  )?.let {
    builder.onSuccessBackgroundColor(it)
  }
  return builder
}

@SuppressLint("RestrictedApi")
@Throws(PaymentSheetAppearanceException::class)
private fun buildEmbeddedAppearance(
  embeddedParams: ReadableMap?,
  context: Context,
): PaymentSheet.Appearance.Embedded {
  val embeddedBuilder = PaymentSheet.Appearance.Embedded.Builder()
  val rowParams = embeddedParams?.getMap(PaymentSheetAppearanceKeys.ROW)
  val styleString = rowParams?.getString(PaymentSheetAppearanceKeys.STYLE)
  when (styleString) {
    "flatWithRadio" -> {
      val flatParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLAT)
      val radioParams = flatParams?.getMap(PaymentSheetAppearanceKeys.RADIO)
      val separatorInsetsParams =
        flatParams?.getMap(PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

      val flatRadioLightColorsBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors
          .Builder
          .light()

      val flatRadioDarkColorsBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors
          .Builder
          .dark()

      dynamicColorFromParams(
        context,
        flatParams,
        PaymentSheetAppearanceKeys.SEPARATOR_COLOR,
      )?.let {
        flatRadioLightColorsBuilder.separatorColor(it)
        flatRadioDarkColorsBuilder.separatorColor(it)
      }

      dynamicColorFromParams(
        context,
        radioParams,
        PaymentSheetAppearanceKeys.SELECTED_COLOR,
      )?.let {
        flatRadioLightColorsBuilder.selectedColor(it)
        flatRadioDarkColorsBuilder.selectedColor(it)
      }

      dynamicColorFromParams(
        context,
        radioParams,
        PaymentSheetAppearanceKeys.UNSELECTED_COLOR,
      )?.let {
        flatRadioLightColorsBuilder.unselectedColor(it)
        flatRadioDarkColorsBuilder.unselectedColor(it)
      }

      val rowStyleBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio
          .Builder()

      flatParams.getFloatOrNull(PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS)?.let {
        rowStyleBuilder.separatorThicknessDp(it)
      }

      separatorInsetsParams.getFloatOrNull(PaymentSheetAppearanceKeys.LEFT)?.let {
        rowStyleBuilder.startSeparatorInsetDp(it)
      }

      separatorInsetsParams.getFloatOrNull(PaymentSheetAppearanceKeys.RIGHT)?.let {
        rowStyleBuilder.endSeparatorInsetDp(it)
      }

      flatParams.getBooleanOrNull(PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED)?.let {
        rowStyleBuilder.topSeparatorEnabled(it)
      }

      flatParams.getBooleanOrNull(PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED)?.let {
        rowStyleBuilder.bottomSeparatorEnabled(it)
      }

      rowParams.getFloatOrNull(PaymentSheetAppearanceKeys.ADDITIONAL_INSETS)?.let {
        rowStyleBuilder.additionalVerticalInsetsDp(it)
      }

      rowStyleBuilder.colorsLight(flatRadioLightColorsBuilder.build())
      rowStyleBuilder.colorsDark(flatRadioDarkColorsBuilder.build())

      embeddedBuilder.rowStyle(rowStyleBuilder.build())
    }

    "flatWithCheckmark" -> {
      val flatParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLAT)
      val checkmarkParams = flatParams?.getMap(PaymentSheetAppearanceKeys.CHECKMARK)
      val separatorInsetsParams =
        flatParams?.getMap(PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

      val flatCheckmarkLightColorsBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors
          .Builder
          .light()
      val flatCheckmarkDarkColorsBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors
          .Builder
          .dark()

      dynamicColorFromParams(
        context,
        flatParams,
        PaymentSheetAppearanceKeys.SEPARATOR_COLOR,
      )?.let {
        flatCheckmarkLightColorsBuilder.separatorColor(it)
        flatCheckmarkDarkColorsBuilder.separatorColor(it)
      }

      dynamicColorFromParams(context, checkmarkParams, PaymentSheetAppearanceKeys.COLOR)?.let {
        flatCheckmarkLightColorsBuilder.checkmarkColor(it)
        flatCheckmarkDarkColorsBuilder.checkmarkColor(it)
      }

      val rowStyleBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark
          .Builder()

      flatParams.getFloatOrNull(PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS)?.let {
        rowStyleBuilder.separatorThicknessDp(it)
      }

      separatorInsetsParams.getFloatOrNull(PaymentSheetAppearanceKeys.LEFT)?.let {
        rowStyleBuilder.startSeparatorInsetDp(it)
      }

      separatorInsetsParams.getFloatOrNull(PaymentSheetAppearanceKeys.RIGHT)?.let {
        rowStyleBuilder.endSeparatorInsetDp(it)
      }

      flatParams.getBooleanOrNull(PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED)?.let {
        rowStyleBuilder.topSeparatorEnabled(it)
      }

      flatParams.getBooleanOrNull(PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED)?.let {
        rowStyleBuilder.bottomSeparatorEnabled(it)
      }

      checkmarkParams.getFloatOrNull(PaymentSheetAppearanceKeys.CHECKMARK_INSET)?.let {
        rowStyleBuilder.checkmarkInsetDp(it)
      }

      rowParams.getFloatOrNull(PaymentSheetAppearanceKeys.ADDITIONAL_INSETS)?.let {
        rowStyleBuilder.additionalVerticalInsetsDp(it)
      }

      // TODO: The theme is so crazy long, why does each Color thing has the same redundant Theme...
      rowStyleBuilder.colorsLight(flatCheckmarkLightColorsBuilder.build())
      rowStyleBuilder.colorsDark(flatCheckmarkDarkColorsBuilder.build())
      embeddedBuilder.rowStyle(rowStyleBuilder.build())
    }

    "flatWithDisclosure" -> {
      val flatParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLAT)
      val disclosureParams = flatParams?.getMap(PaymentSheetAppearanceKeys.DISCLOSURE)
      val separatorInsetsParams =
        flatParams?.getMap(PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

      val flatDisclosureLightColorsBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors
          .Builder
          .light()
      val flatDisclosureDarkColorsBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors
          .Builder
          .dark()

      dynamicColorFromParams(
        context,
        flatParams,
        PaymentSheetAppearanceKeys.SEPARATOR_COLOR,
      )?.let {
        flatDisclosureLightColorsBuilder.separatorColor(it)
        flatDisclosureDarkColorsBuilder.separatorColor(it)
      }

      dynamicColorFromParams(context, disclosureParams, PaymentSheetAppearanceKeys.COLOR)?.let {
        flatDisclosureLightColorsBuilder.disclosureColor(it)
        flatDisclosureDarkColorsBuilder.disclosureColor(it)
      }

      val rowStyleBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure
          .Builder()

      flatParams.getFloatOrNull(PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS)?.let {
        rowStyleBuilder.separatorThicknessDp(it)
      }

      separatorInsetsParams.getFloatOrNull(PaymentSheetAppearanceKeys.LEFT)?.let {
        rowStyleBuilder.startSeparatorInsetDp(it)
      }

      separatorInsetsParams.getFloatOrNull(PaymentSheetAppearanceKeys.RIGHT)?.let {
        rowStyleBuilder.endSeparatorInsetDp(it)
      }

      flatParams.getBooleanOrNull(PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED)?.let {
        rowStyleBuilder.topSeparatorEnabled(it)
      }

      flatParams.getBooleanOrNull(PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED)?.let {
        rowStyleBuilder.bottomSeparatorEnabled(it)
      }

      rowParams.getFloatOrNull(PaymentSheetAppearanceKeys.ADDITIONAL_INSETS)?.let {
        rowStyleBuilder.additionalVerticalInsetsDp(it)
      }

      rowStyleBuilder.colorsLight(flatDisclosureLightColorsBuilder.build())
      rowStyleBuilder.colorsDark(flatDisclosureDarkColorsBuilder.build())

      embeddedBuilder.rowStyle(rowStyleBuilder.build())
    }

    "floatingButton" -> {
      val floatingParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLOATING)
      val rowStyleBuilder =
        PaymentSheet.Appearance.Embedded.RowStyle.FloatingButton
          .Builder()

      rowParams.getFloatOrNull(PaymentSheetAppearanceKeys.ADDITIONAL_INSETS)?.let {
        rowStyleBuilder.additionalInsetsDp(it)
      }

      floatingParams.getFloatOrNull(PaymentSheetAppearanceKeys.SPACING)?.let {
        rowStyleBuilder.spacingDp(it)
      }

      embeddedBuilder.rowStyle(rowStyleBuilder.build())
    }

    else -> {
      System.err.println("WARN: Unsupported embedded payment element row style received: $styleString. Falling back to default.")
    }
  }
  return embeddedBuilder.build()
}

@SuppressLint("RestrictedApi")
private fun buildFormInsets(insetParams: ReadableMap?): PaymentSheet.Insets {
  val defaults = StripeThemeDefaults.formInsets
  val left = insetParams.getFloatOr(PaymentSheetAppearanceKeys.LEFT, defaults.start)
  val top = insetParams.getFloatOr(PaymentSheetAppearanceKeys.TOP, defaults.top)
  val right = insetParams.getFloatOr(PaymentSheetAppearanceKeys.RIGHT, defaults.end)
  val bottom = insetParams.getFloatOr(PaymentSheetAppearanceKeys.BOTTOM, defaults.bottom)

  return PaymentSheet.Insets(
    startDp = left,
    topDp = top,
    endDp = right,
    bottomDp = bottom,
  )
}

/**
 * Parses a ThemedColor from [params] at [key]. Supports both:
 * - Single hex string: "#RRGGBB"
 * - Light/dark object: { "light": "#RRGGBB", "dark": "#RRGGBB" }
 * For light/dark objects, chooses the appropriate color based on current UI mode.
 * Returns null if no color is provided.
 */
private fun dynamicColorFromParams(
  context: Context,
  params: ReadableMap?,
  key: String,
): Int? {
  if (params == null) {
    return null
  }

  // First check if it's a nested map { "light": "#RRGGBB", "dark": "#RRGGBB" }
  if (params.hasKey(key) && params.getType(key) == ReadableType.Map) {
    val colorMap = params.getMap(key)
    val isDark =
      (
        context.resources.configuration.uiMode
          and Configuration.UI_MODE_NIGHT_MASK
      ) == Configuration.UI_MODE_NIGHT_YES

    // Pick the hex for current mode, or null
    val hex =
      if (isDark) {
        colorMap?.getString(PaymentSheetAppearanceKeys.DARK)
      } else {
        colorMap?.getString(PaymentSheetAppearanceKeys.LIGHT)
      }

    return colorFromHex(hex)
  }

  // Check if it's a single color string
  return colorFromHex(params.getString(key))
}

@Throws(PaymentSheetAppearanceException::class)
private fun getFontResId(
  map: ReadableMap?,
  key: String,
  context: Context,
): Int? {
  val fontErrorPrefix = "Encountered an error when setting a custom font:"
  if (map?.hasKey(key) != true) {
    return null
  }

  val fontFileName =
    map.getString(key)
      ?: throw PaymentSheetAppearanceException(
        "$fontErrorPrefix expected String for font.$key, but received null.",
      )
  if (Regex("[^a-z0-9]").containsMatchIn(fontFileName)) {
    throw PaymentSheetAppearanceException(
      "$fontErrorPrefix appearance.font.$key should only contain lowercase alphanumeric characters on Android, but received '$fontFileName'. This value must match the filename in android/app/src/main/res/font",
    )
  }

  @SuppressLint("DiscouragedApi")
  val id = context.resources.getIdentifier(fontFileName, "font", context.packageName)
  if (id == 0) {
    throw PaymentSheetAppearanceException("$fontErrorPrefix Failed to find font: $fontFileName")
  } else {
    return id
  }
}

private class PaymentSheetAppearanceKeys {
  companion object {
    const val COLORS = "colors"
    const val LIGHT = "light"
    const val DARK = "dark"
    const val PRIMARY = "primary"
    const val BACKGROUND = "background"
    const val COMPONENT_BACKGROUND = "componentBackground"
    const val COMPONENT_BORDER = "componentBorder"
    const val COMPONENT_DIVIDER = "componentDivider"
    const val COMPONENT_TEXT = "componentText"
    const val PRIMARY_TEXT = "primaryText"
    const val SECONDARY_TEXT = "secondaryText"
    const val PLACEHOLDER_TEXT = "placeholderText"
    const val ICON = "icon"
    const val ERROR = "error"

    const val FONT = "font"
    const val FAMILY = "family"
    const val SCALE = "scale"

    const val SHAPES = "shapes"
    const val BORDER_RADIUS = "borderRadius"
    const val BORDER_WIDTH = "borderWidth"
    const val HEIGHT = "height"

    const val PRIMARY_BUTTON = "primaryButton"
    const val TEXT = "text"
    const val BORDER = "border"
    const val SUCCESS_BACKGROUND = "successBackgroundColor"
    const val SUCCESS_TEXT = "successTextColor"

    const val EMBEDDED_PAYMENT_ELEMENT = "embeddedPaymentElement"
    const val ROW = "row"
    const val STYLE = "style"
    const val ADDITIONAL_INSETS = "additionalInsets"

    const val FLAT = "flat"
    const val SEPARATOR_THICKNESS = "separatorThickness"
    const val SEPARATOR_COLOR = "separatorColor"
    const val SEPARATOR_INSETS = "separatorInsets"
    const val TOP_SEPARATOR_ENABLED = "topSeparatorEnabled"
    const val BOTTOM_SEPARATOR_ENABLED = "bottomSeparatorEnabled"
    const val RADIO = "radio"
    const val SELECTED_COLOR = "selectedColor"
    const val UNSELECTED_COLOR = "unselectedColor"
    const val CHECKMARK = "checkmark"
    const val DISCLOSURE = "disclosure"
    const val COLOR = "color"
    const val CHECKMARK_INSET = "inset"

    const val FLOATING = "floating"
    const val SPACING = "spacing"

    // Keys for EdgeInsetsConfig
    const val LEFT = "left"
    const val RIGHT = "right"
    const val TOP = "top"
    const val BOTTOM = "bottom"

    const val FORM_INSETS = "formInsetValues"
  }
}
