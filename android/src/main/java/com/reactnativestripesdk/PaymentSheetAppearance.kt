package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.getBooleanOr
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
      lightColorParams,
      context,
    )

  embeddedAppearance?.let {
    return PaymentSheet.Appearance(
      typography = buildTypography(userParams?.getMap(PaymentSheetAppearanceKeys.FONT), context),
      colorsLight = buildColors(lightColorParams, PaymentSheet.Colors.defaultLight),
      colorsDark = buildColors(darkColorParams, PaymentSheet.Colors.defaultDark),
      shapes = buildShapes(userParams?.getMap(PaymentSheetAppearanceKeys.SHAPES)),
      primaryButton =
        buildPrimaryButton(
          userParams?.getMap(PaymentSheetAppearanceKeys.PRIMARY_BUTTON),
          context,
        ),
      embeddedAppearance = embeddedAppearance,
      formInsetValues = buildFormInsets(insetParams),
    )
  }

  return PaymentSheet.Appearance(
    typography = buildTypography(userParams?.getMap(PaymentSheetAppearanceKeys.FONT), context),
    colorsLight = buildColors(lightColorParams, PaymentSheet.Colors.defaultLight),
    colorsDark = buildColors(darkColorParams, PaymentSheet.Colors.defaultDark),
    shapes = buildShapes(userParams?.getMap(PaymentSheetAppearanceKeys.SHAPES)),
    primaryButton =
      buildPrimaryButton(
        userParams?.getMap(PaymentSheetAppearanceKeys.PRIMARY_BUTTON),
        context,
      ),
    formInsetValues = buildFormInsets(insetParams),
  )
}

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
  colorParams: ReadableMap?,
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

private fun buildShapes(shapeParams: ReadableMap?): PaymentSheet.Shapes =
  PaymentSheet.Shapes.default.copy(
    cornerRadiusDp =
      shapeParams.getFloatOr(
        PaymentSheetAppearanceKeys.BORDER_RADIUS,
        PaymentSheet.Shapes.default.cornerRadiusDp,
      ),
    borderStrokeWidthDp =
      shapeParams.getFloatOr(
        PaymentSheetAppearanceKeys.BORDER_WIDTH,
        PaymentSheet.Shapes.default.borderStrokeWidthDp,
      ),
  )

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
      buildPrimaryButtonColors(lightColorParams, PaymentSheet.PrimaryButtonColors.defaultLight, context),
    colorsDark =
      buildPrimaryButtonColors(darkColorParams, PaymentSheet.PrimaryButtonColors.defaultDark, context),
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
          getFontResId(fontParams, PaymentSheetAppearanceKeys.FAMILY, null, context),
      ),
  )
}

@Throws(PaymentSheetAppearanceException::class)
private fun buildPrimaryButtonColors(
  colorParams: ReadableMap,
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
  embeddedParams: ReadableMap?,
  defaultColorsMap: ReadableMap?,
  context: Context,
): PaymentSheet.Appearance.Embedded? {
  if (embeddedParams == null) {
    return null
  }

  val rowParams =
    embeddedParams.getMap(PaymentSheetAppearanceKeys.ROW)
      ?: return null

  val defaultColors = buildColors(defaultColorsMap, PaymentSheet.Colors.defaultLight)

  // Default style
  val styleString = rowParams.getString(PaymentSheetAppearanceKeys.STYLE) ?: "flatWithRadio"

  val defaultAdditionalInsetsDp = 6.0f
  val defaultSeparatorThicknessDp = 1.0f
  val defaultSpacingDp = 12.0f
  val defaultCheckmarkInsetDp = 0f

  val additionalInsets = rowParams.getFloatOr(PaymentSheetAppearanceKeys.ADDITIONAL_INSETS, defaultAdditionalInsetsDp)

  val rowStyle: PaymentSheet.Appearance.Embedded.RowStyle =
    when (styleString) {
      "flatWithRadio" -> {
        val flatParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLAT)
        val radioParams = flatParams?.getMap(PaymentSheetAppearanceKeys.RADIO)
        val separatorInsetsParams = flatParams?.getMap(PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

        // Default separator insets specific to FlatWithRadio
        val defaultSeparatorStartInsetDp = 30.0f
        val defaultSeparatorEndInsetDp = 0.0f

        // Parse dimensions as Floats
        val separatorThickness = flatParams.getFloatOr(PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS, defaultSeparatorThicknessDp)
        val startSeparatorInset = separatorInsetsParams.getFloatOr(PaymentSheetAppearanceKeys.LEFT, defaultSeparatorStartInsetDp)
        val endSeparatorInset = separatorInsetsParams.getFloatOr(PaymentSheetAppearanceKeys.RIGHT, defaultSeparatorEndInsetDp)

        // Parse booleans
        val topEnabled = flatParams.getBooleanOr(PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED, true)
        val bottomEnabled = flatParams.getBooleanOr(PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED, true)

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
        val flatParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLAT)
        val checkmarkParams = flatParams?.getMap(PaymentSheetAppearanceKeys.CHECKMARK)
        val separatorInsetsParams = flatParams?.getMap(PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

        // Default separator insets specific to FlatWithCheckmark and FlatWithDisclosure
        val defaultSeparatorStartInsetDp = 0.0f
        val defaultSeparatorEndInsetDp = 0.0f

        // Parse dimensions as Floats
        val separatorThickness = flatParams.getFloatOr(PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS, defaultSeparatorThicknessDp)
        val startSeparatorInset = separatorInsetsParams.getFloatOr(PaymentSheetAppearanceKeys.LEFT, defaultSeparatorStartInsetDp)
        val endSeparatorInset = separatorInsetsParams.getFloatOr(PaymentSheetAppearanceKeys.RIGHT, defaultSeparatorEndInsetDp)
        val checkmarkInset = checkmarkParams.getFloatOr(PaymentSheetAppearanceKeys.CHECKMARK_INSET, defaultCheckmarkInsetDp)

        // Parse booleans
        val topEnabled = flatParams.getBooleanOr(PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED, true)
        val bottomEnabled = flatParams.getBooleanOr(PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED, true)

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
        val flatParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLAT)
        val disclosureParams = flatParams?.getMap(PaymentSheetAppearanceKeys.DISCLOSURE)
        val separatorInsetsParams = flatParams?.getMap(PaymentSheetAppearanceKeys.SEPARATOR_INSETS)

        // Default separator insets specific to FlatWithCheckmark and FlatWithDisclosure
        val defaultSeparatorStartInsetDp = 0.0f
        val defaultSeparatorEndInsetDp = 0.0f

        // Parse dimensions as Floats
        val separatorThickness = flatParams.getFloatOr(PaymentSheetAppearanceKeys.SEPARATOR_THICKNESS, defaultSeparatorThicknessDp)
        val startSeparatorInset = separatorInsetsParams.getFloatOr(PaymentSheetAppearanceKeys.LEFT, defaultSeparatorStartInsetDp)
        val endSeparatorInset = separatorInsetsParams.getFloatOr(PaymentSheetAppearanceKeys.RIGHT, defaultSeparatorEndInsetDp)

        // Parse booleans
        val topEnabled = flatParams.getBooleanOr(PaymentSheetAppearanceKeys.TOP_SEPARATOR_ENABLED, true)
        val bottomEnabled = flatParams.getBooleanOr(PaymentSheetAppearanceKeys.BOTTOM_SEPARATOR_ENABLED, true)

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
        val floatingParams = rowParams.getMap(PaymentSheetAppearanceKeys.FLOATING)
        PaymentSheet.Appearance.Embedded.RowStyle.FloatingButton(
          additionalInsetsDp = additionalInsets,
          spacingDp = floatingParams.getFloatOr(PaymentSheetAppearanceKeys.SPACING, defaultSpacingDp),
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
 * Falls back to [defaultColor] if no color is provided.
 */
private fun dynamicColorFromParams(
  context: Context,
  params: ReadableMap?,
  key: String,
  defaultColor: Int,
): Int {
  if (params == null) {
    return defaultColor
  }

  // First check if it's a nested map { "light": "#RRGGBB", "dark": "#RRGGBB" }
  val colorMap = params.getMap(key)
  if (colorMap != null) {
    val isDark =
      (
        context.resources.configuration.uiMode
          and Configuration.UI_MODE_NIGHT_MASK
      ) == Configuration.UI_MODE_NIGHT_YES

    // Pick the hex for current mode, or null
    val hex =
      if (isDark) {
        colorMap.getString(PaymentSheetAppearanceKeys.DARK)
      } else {
        colorMap.getString(PaymentSheetAppearanceKeys.LIGHT)
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

@Throws(PaymentSheetAppearanceException::class)
private fun getFontResId(
  map: ReadableMap?,
  key: String,
  defaultValue: Int?,
  context: Context,
): Int? {
  val fontErrorPrefix = "Encountered an error when setting a custom font:"
  if (map?.hasKey(key) != true) {
    return defaultValue
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
