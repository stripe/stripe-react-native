package com.reactnativestripesdk

import android.graphics.Color
import android.os.Bundle
import com.stripe.android.paymentsheet.PaymentSheet

fun PaymentSheetFragment.buildPaymentSheetAppearance(userParams: Bundle?): PaymentSheet.Appearance {
  val colorParams = userParams?.getBundle("colors")
  val lightColorParams = colorParams?.getBundle("light") ?: colorParams
  val darkColorParams = colorParams?.getBundle("dark") ?: colorParams

  return PaymentSheet.Appearance(
    typography = buildTypography(userParams?.getBundle("font")),
    colorsLight = buildColors(lightColorParams, PaymentSheet.Colors.defaultLight),
    colorsDark = buildColors(darkColorParams, PaymentSheet.Colors.defaultDark),
    shapes = buildShapes(userParams?.getBundle("shapes")),
    primaryButton = buildPrimaryButton(userParams?.getBundle("primaryButton"))
  )
}

private fun PaymentSheetFragment.buildTypography(fontParams: Bundle?): PaymentSheet.Typography {
  return PaymentSheet.Typography.default.copy(
    sizeScaleFactor = getFloatOr(fontParams, "scale", PaymentSheet.Typography.default.sizeScaleFactor),
    fontResId = getFontResId(fontParams, "family", PaymentSheet.Typography.default.fontResId)
  )
}

private fun colorFromHexOrDefault(hexString: String?, default: Int): Int {
  return hexString?.trim()?.let {
    Color.parseColor(
      if (!it.contains("#")) "#$it"
      else it
    )
  } ?: run {
    default
  }
}

private fun buildColors(colorParams: Bundle?, default: PaymentSheet.Colors): PaymentSheet.Colors {
  if (colorParams == null) {
    return default
  }

  return default.copy(
    primary = colorFromHexOrDefault(colorParams.getString("primary"), default.primary),
    surface = colorFromHexOrDefault(colorParams.getString("background"), default.surface),
    component = colorFromHexOrDefault(colorParams.getString("componentBackground"), default.component),
    componentBorder = colorFromHexOrDefault(colorParams.getString("componentBorder"), default.componentBorder),
    componentDivider = colorFromHexOrDefault(colorParams.getString("componentDivider"), default.componentDivider),
    onComponent = colorFromHexOrDefault(colorParams.getString("componentText"), default.onComponent),
    onSurface = colorFromHexOrDefault(colorParams.getString("text"), default.onSurface),
    subtitle = colorFromHexOrDefault(colorParams.getString("textSecondary"), default.subtitle),
    placeholderText = colorFromHexOrDefault(colorParams.getString("componentPlaceholderText"), default.placeholderText),
    appBarIcon = colorFromHexOrDefault(colorParams.getString("icon"), default.appBarIcon),
    error = colorFromHexOrDefault(colorParams.getString("error"), default.error),
  )
}

private fun buildShapes(shapeParams: Bundle?): PaymentSheet.Shapes {
  return PaymentSheet.Shapes.default.copy(
    cornerRadiusDp = getFloatOr(shapeParams, "borderRadius", PaymentSheet.Shapes.default.cornerRadiusDp),
    borderStrokeWidthDp = getFloatOr(shapeParams, "borderWidth", PaymentSheet.Shapes.default.borderStrokeWidthDp)
  )
}

private fun PaymentSheetFragment.buildPrimaryButton(params: Bundle?): PaymentSheet.PrimaryButton {
  if (params == null) {
    return PaymentSheet.PrimaryButton()
  }

  val fontParams = params.getBundle("font") ?: Bundle.EMPTY
  val shapeParams = params.getBundle("shapes") ?: Bundle.EMPTY
  val colorParams = params.getBundle("colors") ?: Bundle.EMPTY
  val lightColorParams = colorParams.getBundle("light") ?: colorParams
  val darkColorParams = colorParams.getBundle("dark") ?: colorParams

  return PaymentSheet.PrimaryButton(
    colorsLight = buildPrimaryButtonColors(lightColorParams, PaymentSheet.PrimaryButtonColors.defaultLight),
    colorsDark = buildPrimaryButtonColors(darkColorParams, PaymentSheet.PrimaryButtonColors.defaultDark),
    shape = PaymentSheet.PrimaryButtonShape(
      cornerRadiusDp = getFloatOrNull(shapeParams, "borderRadius"),
      borderStrokeWidthDp = getFloatOrNull(shapeParams, "borderWidth"),
    ),
    typography = PaymentSheet.PrimaryButtonTypography(
      fontResId = getFontResId(fontParams, "family", null)
    )
  )
}

private fun buildPrimaryButtonColors(colorParams: Bundle, default: PaymentSheet.PrimaryButtonColors): PaymentSheet.PrimaryButtonColors {
  return PaymentSheet.PrimaryButtonColors(
    background = colorParams.getString("background")?.trim()?.let {
      Color.parseColor(
        if (!it.contains("#")) "#$it"
        else it
      )
    } ?: run {
      null
    },
    onBackground = colorFromHexOrDefault(colorParams.getString("text"), default.onBackground),
    border = colorFromHexOrDefault(colorParams.getString("componentBorder"), default.border),
  )
}

private fun getFloatOr(bundle: Bundle?, key: String, defaultValue: Float): Float {
  return if (bundle?.containsKey(key) == true) {
    bundle.getFloat(key, bundle.getInt(key).toFloat())
  } else {
    defaultValue
  }
}

private fun getFloatOrNull(bundle: Bundle?, key: String): Float? {
  return if (bundle?.containsKey(key) == true) {
    bundle.getFloat(key, bundle.getInt(key).toFloat())
  } else {
    null
  }
}

@Throws(PaymentSheetAppearanceException::class)
private fun PaymentSheetFragment.getFontResId(bundle: Bundle?, key: String, defaultValue: Int?): Int? {
  val fontErrorPrefix = "Encountered an error when setting a custom font:"
  if (bundle?.containsKey(key) != true) {
    return defaultValue
  }

  val fontFileName = bundle.getString(key)
          ?: throw PaymentSheetAppearanceException("$fontErrorPrefix expected String for font.$key, but received null.")
  if (Regex("[^a-z0-9]").containsMatchIn(fontFileName)) {
    throw PaymentSheetAppearanceException(
      "$fontErrorPrefix appearance.font.$key should only contain lowercase alphanumeric characters on Android, but received '$fontFileName'. This value must match the filename in android/app/src/main/res/font"
    )
  }

  val id = resources.getIdentifier(fontFileName, "font", context?.packageName)
  if (id == 0) {
    throw PaymentSheetAppearanceException("$fontErrorPrefix Failed to find font: $fontFileName")
  } else {
    return id
  }
}
