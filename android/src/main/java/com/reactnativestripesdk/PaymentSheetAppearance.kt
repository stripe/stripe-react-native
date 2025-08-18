package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.stripe.android.paymentelement.AppearanceAPIAdditionsPreview
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.uicore.StripeThemeDefaults

@SuppressLint("RestrictedApi")
fun buildPaymentSheetAppearance(
  userParams: Bundle?,
  context: Context,
): PaymentSheet.Appearance {
  val colorParams = userParams?.getBundle(PaymentSheetAppearanceKeys.COLORS)
  val lightColorParams = colorParams?.getBundle(PaymentSheetAppearanceKeys.LIGHT) ?: colorParams
  val darkColorParams = colorParams?.getBundle(PaymentSheetAppearanceKeys.DARK) ?: colorParams
  val insetParams = userParams?.getBundle(PaymentSheetAppearanceKeys.FORM_INSETS)

  val embeddedAppearance =
    buildEmbeddedAppearance(
      userParams?.getBundle(PaymentSheetAppearanceKeys.EMBEDDED_PAYMENT_ELEMENT),
      lightColorParams,
      context,
    )

  embeddedAppearance?.let {
    return PaymentSheet.Appearance(
      typography = buildTypography(userParams?.getBundle(PaymentSheetAppearanceKeys.FONT), context),
      colorsLight = buildColors(lightColorParams, PaymentSheet.Colors.defaultLight),
      colorsDark = buildColors(darkColorParams, PaymentSheet.Colors.defaultDark),
      shapes = buildShapes(userParams?.getBundle(PaymentSheetAppearanceKeys.SHAPES)),
      primaryButton =
        buildPrimaryButton(
          userParams?.getBundle(PaymentSheetAppearanceKeys.PRIMARY_BUTTON),
          context,
        ),
      embeddedAppearance = embeddedAppearance,
      formInsetValues = buildFormInsets(insetParams),
    )
  }

  return PaymentSheet.Appearance(
    typography = buildTypography(userParams?.getBundle(PaymentSheetAppearanceKeys.FONT), context),
    colorsLight = buildColors(lightColorParams, PaymentSheet.Colors.defaultLight),
    colorsDark = buildColors(darkColorParams, PaymentSheet.Colors.defaultDark),
    shapes = buildShapes(userParams?.getBundle(PaymentSheetAppearanceKeys.SHAPES)),
    primaryButton =
      buildPrimaryButton(
        userParams?.getBundle(PaymentSheetAppearanceKeys.PRIMARY_BUTTON),
        context,
      ),
    formInsetValues = buildFormInsets(insetParams),
  )
}

@OptIn(AppearanceAPIAdditionsPreview::class)
private fun buildTypography(
  fontParams: Bundle?,
  context: Context,
): PaymentSheet.Typography {
  val scale = getDoubleOrNull(fontParams, PaymentSheetAppearanceKeys.SCALE)
  val resId =
    getFontResId(
      fontParams,
      PaymentSheetAppearanceKeys.FAMILY,
      PaymentSheet.Typography.default.fontResId,
      context,
    )
  return PaymentSheet.Typography.default.copy(
    sizeScaleFactor = scale?.toFloat() ?: PaymentSheet.Typography.default.sizeScaleFactor,
    fontResId = resId,
  )
}

@Throws(PaymentSheetAppearanceException::class)
private fun colorFromHexOrDefault(
  hexString: String?,
  default: Int,
): Int {
  return hexString?.trim()?.replace("#", "")?.let {
    if (it.length == 6 || it.length == 8) {
      return Color.parseColor("#$it")
    } else {
      throw PaymentSheetAppearanceException(
        "Failed to set Payment Sheet appearance. Expected hex string of length 6 or 8, but received: $it",
      )
    }
  }
    ?: run {
      return default
    }
}

private fun buildColors(
  colorParams: Bundle?,
  default: PaymentSheet.Colors,
): PaymentSheet.Colors {
  if (colorParams == null) {
    return default
  }

  return default.copy(
    primary =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.PRIMARY),
        default.primary,
      ),
    surface =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.BACKGROUND),
        default.surface,
      ),
    component =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.COMPONENT_BACKGROUND),
        default.component,
      ),
    componentBorder =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.COMPONENT_BORDER),
        default.componentBorder,
      ),
    componentDivider =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.COMPONENT_DIVIDER),
        default.componentDivider,
      ),
    onComponent =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.COMPONENT_TEXT),
        default.onComponent,
      ),
    onSurface =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.PRIMARY_TEXT),
        default.onSurface,
      ),
    subtitle =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.SECONDARY_TEXT),
        default.subtitle,
      ),
    placeholderText =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.PLACEHOLDER_TEXT),
        default.placeholderText,
      ),
    appBarIcon =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.ICON),
        default.appBarIcon,
      ),
    error =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.ERROR),
        default.error,
      ),
  )
}

private fun buildShapes(shapeParams: Bundle?): PaymentSheet.Shapes =
  PaymentSheet.Shapes.default.copy(
    cornerRadiusDp =
      getFloatOr(
        shapeParams,
        PaymentSheetAppearanceKeys.BORDER_RADIUS,
        PaymentSheet.Shapes.default.cornerRadiusDp,
      ),
    borderStrokeWidthDp =
      getFloatOr(
        shapeParams,
        PaymentSheetAppearanceKeys.BORDER_WIDTH,
        PaymentSheet.Shapes.default.borderStrokeWidthDp,
      ),
  )

private fun buildPrimaryButton(
  params: Bundle?,
  context: Context,
): PaymentSheet.PrimaryButton {
  if (params == null) {
    return PaymentSheet.PrimaryButton()
  }

  val fontParams = params.getBundle(PaymentSheetAppearanceKeys.FONT) ?: Bundle.EMPTY
  val shapeParams = params.getBundle(PaymentSheetAppearanceKeys.SHAPES) ?: Bundle.EMPTY
  val colorParams = params.getBundle(PaymentSheetAppearanceKeys.COLORS) ?: Bundle.EMPTY
  val lightColorParams = colorParams.getBundle(PaymentSheetAppearanceKeys.LIGHT) ?: colorParams
  val darkColorParams = colorParams.getBundle(PaymentSheetAppearanceKeys.DARK) ?: colorParams

  return PaymentSheet.PrimaryButton(
    colorsLight =
      buildPrimaryButtonColors(lightColorParams, PaymentSheet.PrimaryButtonColors.defaultLight, context),
    colorsDark =
      buildPrimaryButtonColors(darkColorParams, PaymentSheet.PrimaryButtonColors.defaultDark, context),
    shape =
      PaymentSheet.PrimaryButtonShape(
        cornerRadiusDp =
          getFloatOrNull(shapeParams, PaymentSheetAppearanceKeys.BORDER_RADIUS),
        borderStrokeWidthDp =
          getFloatOrNull(shapeParams, PaymentSheetAppearanceKeys.BORDER_WIDTH),
        heightDp = getFloatOrNull(shapeParams, PaymentSheetAppearanceKeys.HEIGHT),
      ),
    typography =
      PaymentSheet.PrimaryButtonTypography(
        fontResId =
          getFontResId(fontParams, PaymentSheetAppearanceKeys.FAMILY, null, context),
      ),
  )
}

@Throws(PaymentSheetAppearanceException::class)
private fun buildPrimaryButtonColors(
  colorParams: Bundle,
  default: PaymentSheet.PrimaryButtonColors,
  context: Context,
): PaymentSheet.PrimaryButtonColors =
  PaymentSheet.PrimaryButtonColors(
    background =
      colorParams
        .getString(PaymentSheetAppearanceKeys.BACKGROUND)
        ?.trim()
        ?.replace("#", "")
        ?.let {
          if (it.length == 6 || it.length == 8) {
            Color.parseColor("#$it")
          } else {
            throw PaymentSheetAppearanceException(
              "Failed to set Payment Sheet appearance. Expected hex string of length 6 or 8, but received: $it",
            )
          }
        } ?: run { null },
    onBackground =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.TEXT),
        default.onBackground,
      ),
    border =
      colorFromHexOrDefault(
        colorParams.getString(PaymentSheetAppearanceKeys.BORDER),
        default.border,
      ),
    successBackgroundColor =
      dynamicColorFromParams(
        context,
        colorParams,
        PaymentSheetAppearanceKeys.SUCCESS_BACKGROUND,
        default.successBackgroundColor,
      ),
    onSuccessBackgroundColor =
      dynamicColorFromParams(
        context,
        colorParams,
        PaymentSheetAppearanceKeys.SUCCESS_TEXT,
        default.onSuccessBackgroundColor,
      ),
  )

@SuppressLint("RestrictedApi")
@Throws(PaymentSheetAppearanceException::class)
private fun buildEmbeddedAppearance(
  embeddedParams: Bundle?,
  defaultColorsBundle: Bundle?,
  context: Context,
): PaymentSheet.Appearance.Embedded? {
  if (embeddedParams == null) {
    return null
  }

  val rowParams =
    getBundleOrNull(embeddedParams, PaymentSheetAppearanceKeys.ROW)
      ?: return null

  val defaultColors = buildColors(defaultColorsBundle, PaymentSheet.Colors.defaultLight)

  // Default style
  val styleString = rowParams.getString(PaymentSheetAppearanceKeys.STYLE, "flatWithRadio")

  val defaultAdditionalInsetsDp = 6.0f
  val defaultSeparatorThicknessDp = 1.0f
  val defaultSpacingDp = 12.0f
  val defaultCheckmarkInsetDp = 0f

  val additionalInsets = getFloatOr(rowParams, PaymentSheetAppearanceKeys.ADDITIONAL_INSETS, defaultAdditionalInsetsDp)

  val rowStyle: PaymentSheet.Appearance.Embedded.RowStyle =
    when (styleString) {
      "flatWithRadio" -> {
        val flatParams = getBundleOrNull(rowParams, PaymentSheetAppearanceKeys.FLAT)
        val radioParams = getBundleOrNull(flatParams, PaymentSheetAppearanceKeys.RADIO)
        val separatorInsetsParams = getBundleOrNull(flatParams, PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

        // Default separator insets specific to FlatWithRadio
        val defaultSeparatorStartInsetDp = 30.0f
        val defaultSeparatorEndInsetDp = 0.0f

        // Parse dimensions as Floats
        val separatorThickness = getFloatOr(flatParams, PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS, defaultSeparatorThicknessDp)
        val startSeparatorInset = getFloatOr(separatorInsetsParams, PaymentSheetAppearanceKeys.LEFT, defaultSeparatorStartInsetDp)
        val endSeparatorInset = getFloatOr(separatorInsetsParams, PaymentSheetAppearanceKeys.RIGHT, defaultSeparatorEndInsetDp)

        // Parse booleans
        val topEnabled = getBooleanOr(flatParams, PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED, true)
        val bottomEnabled = getBooleanOr(flatParams, PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED, true)

        // Parse individual colors using default colors
        val parsedSeparatorColor =
          dynamicColorFromParams(
            context,
            flatParams,
            PaymentSheetAppearanceKeys.SEPARATOR_COLOR,
            defaultColors.componentBorder,
          )

        val parsedSelectedColor =
          dynamicColorFromParams(
            context,
            radioParams,
            PaymentSheetAppearanceKeys.SELECTED_COLOR,
            defaultColors.primary,
          )

        val parsedUnselectedColor =
          dynamicColorFromParams(
            context,
            radioParams,
            PaymentSheetAppearanceKeys.UNSELECTED_COLOR,
            defaultColors.componentBorder,
          )

        val flatRadioColors =
          PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio.Colors(
            separatorColor = parsedSeparatorColor,
            unselectedColor = parsedUnselectedColor,
            selectedColor = parsedSelectedColor,
          )

        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithRadio(
          separatorThicknessDp = separatorThickness,
          startSeparatorInsetDp = startSeparatorInset,
          endSeparatorInsetDp = endSeparatorInset,
          topSeparatorEnabled = topEnabled,
          bottomSeparatorEnabled = bottomEnabled,
          additionalVerticalInsetsDp = additionalInsets,
          horizontalInsetsDp = 0.0F, // We do not have an iOS equal for this API so it's not configurable in React Native
          colorsLight = flatRadioColors,
          colorsDark = flatRadioColors,
        )
      }
      "flatWithCheckmark" -> {
        val flatParams = getBundleOrNull(rowParams, PaymentSheetAppearanceKeys.FLAT)
        val checkmarkParams = getBundleOrNull(flatParams, PaymentSheetAppearanceKeys.CHECKMARK)
        val separatorInsetsParams = getBundleOrNull(flatParams, PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

        // Default separator insets specific to FlatWithCheckmark and FlatWithDisclosure
        val defaultSeparatorStartInsetDp = 0.0f
        val defaultSeparatorEndInsetDp = 0.0f

        // Parse dimensions as Floats
        val separatorThickness = getFloatOr(flatParams, PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS, defaultSeparatorThicknessDp)
        val startSeparatorInset = getFloatOr(separatorInsetsParams, PaymentSheetAppearanceKeys.LEFT, defaultSeparatorStartInsetDp)
        val endSeparatorInset = getFloatOr(separatorInsetsParams, PaymentSheetAppearanceKeys.RIGHT, defaultSeparatorEndInsetDp)
        val checkmarkInset = getFloatOr(checkmarkParams, PaymentSheetAppearanceKeys.CHECKMARK_INSET, defaultCheckmarkInsetDp)

        // Parse booleans
        val topEnabled = getBooleanOr(flatParams, PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED, true)
        val bottomEnabled = getBooleanOr(flatParams, PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED, true)

        // Parse individual colors using root defaults
        val parsedSeparatorColor =
          dynamicColorFromParams(
            context,
            flatParams,
            PaymentSheetAppearanceKeys.SEPARATOR_COLOR,
            defaultColors.componentBorder,
          )

        val parsedCheckmarkColor =
          dynamicColorFromParams(
            context,
            checkmarkParams,
            PaymentSheetAppearanceKeys.COLOR,
            defaultColors.primary,
          )

        // Create the required Colors object
        val flatCheckmarkColors =
          PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark.Colors(
            separatorColor = parsedSeparatorColor,
            checkmarkColor = parsedCheckmarkColor,
          )

        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithCheckmark(
          separatorThicknessDp = separatorThickness,
          startSeparatorInsetDp = startSeparatorInset,
          endSeparatorInsetDp = endSeparatorInset,
          topSeparatorEnabled = topEnabled,
          bottomSeparatorEnabled = bottomEnabled,
          checkmarkInsetDp = checkmarkInset,
          additionalVerticalInsetsDp = additionalInsets,
          horizontalInsetsDp = 0.0F, // We do not have an iOS equal for this API so it's not configurable in React Native
          colorsLight = flatCheckmarkColors,
          colorsDark = flatCheckmarkColors,
        )
      }
      "flatWithDisclosure" -> {
        val flatParams = getBundleOrNull(rowParams, PaymentSheetAppearanceKeys.FLAT)
        val disclosureParams = getBundleOrNull(flatParams, PaymentSheetAppearanceKeys.DISCLOSURE)
        val separatorInsetsParams = getBundleOrNull(flatParams, PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

        // Default separator insets specific to FlatWithCheckmark and FlatWithDisclosure
        val defaultSeparatorStartInsetDp = 0.0f
        val defaultSeparatorEndInsetDp = 0.0f

        // Parse dimensions as Floats
        val separatorThickness = getFloatOr(flatParams, PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS, defaultSeparatorThicknessDp)
        val startSeparatorInset = getFloatOr(separatorInsetsParams, PaymentSheetAppearanceKeys.LEFT, defaultSeparatorStartInsetDp)
        val endSeparatorInset = getFloatOr(separatorInsetsParams, PaymentSheetAppearanceKeys.RIGHT, defaultSeparatorEndInsetDp)

        // Parse booleans
        val topEnabled = getBooleanOr(flatParams, PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED, true)
        val bottomEnabled = getBooleanOr(flatParams, PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED, true)

        val parsedSeparatorColor =
          dynamicColorFromParams(
            context,
            flatParams,
            PaymentSheetAppearanceKeys.SEPARATOR_COLOR,
            Color.GRAY,
          )

        val parsedDisclosureColor =
          dynamicColorFromParams(
            context,
            disclosureParams,
            PaymentSheetAppearanceKeys.COLOR,
            defaultColors.componentBorder, // Default to component border color like other elements
          )

        // Create the required Colors object
        val flatDisclosureColors =
          PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure.Colors(
            separatorColor = parsedSeparatorColor,
            disclosureColor = parsedDisclosureColor,
          )

        PaymentSheet.Appearance.Embedded.RowStyle.FlatWithDisclosure
          .Builder()
          .separatorThicknessDp(separatorThickness)
          .startSeparatorInsetDp(startSeparatorInset)
          .endSeparatorInsetDp(endSeparatorInset)
          .topSeparatorEnabled(topEnabled)
          .bottomSeparatorEnabled(bottomEnabled)
          .additionalVerticalInsetsDp(additionalInsets)
          .horizontalInsetsDp(0.0F) // We do not have an iOS equal for this API so it's not configurable in React Native
          .colorsLight(flatDisclosureColors)
          .colorsDark(flatDisclosureColors)
          .build()
      }
      "floatingButton" -> {
        val floatingParams = getBundleOrNull(rowParams, PaymentSheetAppearanceKeys.FLOATING)
        PaymentSheet.Appearance.Embedded.RowStyle.FloatingButton(
          additionalInsetsDp = additionalInsets,
          spacingDp = getFloatOr(floatingParams, PaymentSheetAppearanceKeys.SPACING, defaultSpacingDp),
        )
      }
      else -> {
        System.err.println("WARN: Unsupported embedded payment element row style received: $styleString. Falling back to default.")
        return null
      }
    }

  return PaymentSheet.Appearance.Embedded(style = rowStyle)
}

@SuppressLint("RestrictedApi")
private fun buildFormInsets(insetParams: Bundle?): PaymentSheet.Insets {
  val defaults = StripeThemeDefaults.formInsets
  val left = getFloatOr(insetParams, PaymentSheetAppearanceKeys.LEFT, defaults.start)
  val top = getFloatOr(insetParams, PaymentSheetAppearanceKeys.TOP, defaults.top)
  val right = getFloatOr(insetParams, PaymentSheetAppearanceKeys.RIGHT, defaults.end)
  val bottom = getFloatOr(insetParams, PaymentSheetAppearanceKeys.BOTTOM, defaults.bottom)

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
 * Falls back to [defaultColor] if no color is provided.
 */
private fun dynamicColorFromParams(
  context: Context,
  params: Bundle?,
  key: String,
  defaultColor: Int,
): Int {
  if (params == null) {
    return defaultColor
  }

  // First check if it's a nested Bundle { "light": "#RRGGBB", "dark": "#RRGGBB" }
  val colorBundle = params.getBundle(key)
  if (colorBundle != null) {
    val isDark =
      (
        context.resources.configuration.uiMode
          and Configuration.UI_MODE_NIGHT_MASK
      ) == Configuration.UI_MODE_NIGHT_YES

    // Pick the hex for current mode, or null
    val hex =
      if (isDark) {
        colorBundle.getString(PaymentSheetAppearanceKeys.DARK)
      } else {
        colorBundle.getString(PaymentSheetAppearanceKeys.LIGHT)
      }

    return colorFromHexOrDefault(hex, defaultColor)
  }

  // Check if it's a single color string
  params.getString(key)?.let { colorString ->
    return colorFromHexOrDefault(colorString, defaultColor)
  }

  // no override → just use default
  return defaultColor
}

private fun getDoubleOrNull(
  bundle: Bundle?,
  key: String,
): Double? {
  if (bundle?.containsKey(key) == true) {
    val valueOfUnknownType = bundle.get(key)
    if (valueOfUnknownType is Double) {
      return valueOfUnknownType
    } else if (valueOfUnknownType is Int) {
      return valueOfUnknownType.toDouble()
    } else if (valueOfUnknownType is Float) {
      return valueOfUnknownType.toDouble()
    }
  }

  return null
}

private fun getFloatOr(
  bundle: Bundle?,
  key: String,
  defaultValue: Float,
): Float {
  if (bundle?.containsKey(key) == true) {
    val valueOfUnknownType = bundle.get(key)
    if (valueOfUnknownType is Float) {
      return valueOfUnknownType
    } else if (valueOfUnknownType is Int) {
      return valueOfUnknownType.toFloat()
    } else if (valueOfUnknownType is Double) {
      return valueOfUnknownType.toFloat()
    }
  }

  return defaultValue
}

private fun getBundleOrNull(
  bundle: Bundle?,
  key: String,
): Bundle? = bundle?.getBundle(key)

private fun getBooleanOr(
  bundle: Bundle?,
  key: String,
  defaultValue: Boolean,
): Boolean =
  if (bundle?.containsKey(key) == true) {
    bundle.getBoolean(key)
  } else {
    defaultValue
  }

private fun getFloatOrNull(
  bundle: Bundle?,
  key: String,
): Float? {
  if (bundle?.containsKey(key) == true) {
    val valueOfUnknownType = bundle.get(key)
    if (valueOfUnknownType is Float) {
      return valueOfUnknownType
    } else if (valueOfUnknownType is Int) {
      return valueOfUnknownType.toFloat()
    } else if (valueOfUnknownType is Double) {
      return valueOfUnknownType.toFloat()
    }
  }

  return null
}

@Throws(PaymentSheetAppearanceException::class)
private fun getFontResId(
  bundle: Bundle?,
  key: String,
  defaultValue: Int?,
  context: Context,
): Int? {
  val fontErrorPrefix = "Encountered an error when setting a custom font:"
  if (bundle?.containsKey(key) != true) {
    return defaultValue
  }

  val fontFileName =
    bundle.getString(key)
      ?: throw PaymentSheetAppearanceException(
        "$fontErrorPrefix expected String for font.$key, but received null.",
      )
  if (Regex("[^a-z0-9]").containsMatchIn(fontFileName)) {
    throw PaymentSheetAppearanceException(
      "$fontErrorPrefix appearance.font.$key should only contain lowercase alphanumeric characters on Android, but received '$fontFileName'. This value must match the filename in android/app/src/main/res/font",
    )
  }

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
