package com.reactnativestripesdk

import android.graphics.Color
import android.os.Bundle
import com.stripe.android.paymentsheet.PaymentSheet

fun PaymentSheetFragment.buildPaymentSheetAppearance(userParams: Bundle?): PaymentSheet.Appearance {
  return PaymentSheet.Appearance(
    typography = buildTypography(userParams?.getBundle("font")),
    colorsLight = buildColors(userParams?.getBundle("colors")),
    shapes = buildShapes(userParams?.getBundle("shapes")),
    primaryButton = buildPrimaryButton(userParams?.getBundle("primaryButton"))
  )
}

private fun PaymentSheetFragment.buildTypography(fontParams: Bundle?): PaymentSheet.Typography {
  return PaymentSheet.Typography.default.copy(
    sizeScaleFactor = getFloatOr(fontParams, "scale", PaymentSheet.Typography.default.sizeScaleFactor),
    fontResId = getFontResId(fontParams, "name", PaymentSheet.Typography.default.fontResId)
  )
}

private fun colorFromHexOrDefault(hexString: String?, default: Int): Int {
  return hexString?.let {
    Color.parseColor(it.replace("#", ""))
  } ?: run {
    default
  }
}

private fun buildColors(colorParams: Bundle?): PaymentSheet.Colors {
  if (colorParams == null) {
    return PaymentSheet.Colors.defaultLight
  }

  return PaymentSheet.Colors.defaultLight.copy(
    primary = colorFromHexOrDefault(colorParams.getString("primary"), PaymentSheet.Colors.defaultLight.primary),
    surface = colorFromHexOrDefault(colorParams.getString("background"), PaymentSheet.Colors.defaultLight.surface),
    component = colorFromHexOrDefault(colorParams.getString("componentBackground"), PaymentSheet.Colors.defaultLight.component),
    componentBorder = colorFromHexOrDefault(colorParams.getString("componentBorder"), PaymentSheet.Colors.defaultLight.componentBorder),
    componentDivider = colorFromHexOrDefault(colorParams.getString("componentDivider"), PaymentSheet.Colors.defaultLight.componentDivider),
    onComponent = colorFromHexOrDefault(colorParams.getString("componentText"), PaymentSheet.Colors.defaultLight.onComponent),
    onSurface = colorFromHexOrDefault(colorParams.getString("text"), PaymentSheet.Colors.defaultLight.onSurface),
    subtitle = colorFromHexOrDefault(colorParams.getString("textSecondary"), PaymentSheet.Colors.defaultLight.subtitle),
    placeholderText = colorFromHexOrDefault(colorParams.getString("componentPlaceholderText"), PaymentSheet.Colors.defaultLight.placeholderText),
    appBarIcon = colorFromHexOrDefault(colorParams.getString("icon"), PaymentSheet.Colors.defaultLight.appBarIcon),
    error = colorFromHexOrDefault(colorParams.getString("danger"), PaymentSheet.Colors.defaultLight.error),
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
  val colorParams = params.getBundle("colors") ?: Bundle.EMPTY
  val shapeParams = params.getBundle("shapes") ?: Bundle.EMPTY

  return PaymentSheet.PrimaryButton(
    colorsLight = PaymentSheet.PrimaryButtonColors(
      background = colorParams.getString("background")?.let {
        Color.parseColor(it.replace("#", ""))
      } ?: run {
        null
      },
      onBackground = colorFromHexOrDefault(colorParams.getString("text"), PaymentSheet.PrimaryButtonColors.defaultLight.onBackground),
      border = colorFromHexOrDefault(colorParams.getString("componentBorder"), PaymentSheet.PrimaryButtonColors.defaultLight.border),
    ),
    shape = PaymentSheet.PrimaryButtonShape(
      cornerRadiusDp = getFloatOrNull(shapeParams, "borderRadius"),
      borderStrokeWidthDp = getFloatOrNull(shapeParams, "borderWidth"),
    ),
    typography = PaymentSheet.PrimaryButtonTypography(
      fontResId = getFontResId(fontParams, "name", null)
    )
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
