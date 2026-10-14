package com.reactnativestripesdk.checkout

import android.annotation.SuppressLint
import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.reactnativestripesdk.getFontResId
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.forEachKey
import com.reactnativestripesdk.utils.getBooleanOrNull
import com.reactnativestripesdk.utils.getFloatOr
import com.reactnativestripesdk.utils.getFloatOrNull
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.isDarkTheme
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.elements.CurrencySelectorElement
import com.stripe.android.elements.PaymentElement
import com.stripe.android.elements.PaymentElement.Configuration.Appearance.Embedded.RowStyle
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.uicore.StripeThemeDefaults

@OptIn(CheckoutSessionPreview::class)
internal data class MappedCheckoutConfiguration(
  val clientSecret: String,
  val configuration: CheckoutController.Configuration,
  val rowSelectionBehavior: PaymentElement.RowSelectionBehavior,
  val themeMode: PaymentElement.Configuration.Appearance.ThemeMode,
)

@SuppressLint("RestrictedApi")
@OptIn(CheckoutSessionPreview::class)
internal object CheckoutConfigurationMapper {
  fun map(
    params: ReadableMap,
    context: Context,
    didSelectPaymentOption: () -> Unit,
  ): MappedCheckoutConfiguration {
    val clientSecret = params.getString("clientSecret").orEmpty()
    val paymentElementParams = params.getMap("paymentElement")

    val configuration = CheckoutController.Configuration()
    params.getString("merchantDisplayName")?.let(configuration::merchantDisplayName)
    params.getMap("defaults")?.let { configuration.defaults(mapDefaults(it)) }
    configuration.paymentElement(
      mapPaymentElement(
        params = paymentElementParams,
        style = params.getString("style"),
        context = context,
      ),
    )
    params.getMap("currencySelectorElement")?.let {
      configuration.currencySelectorElement(mapCurrencySelectorElement(it, params.getString("style"), context))
    }

    return MappedCheckoutConfiguration(
      clientSecret = clientSecret,
      themeMode = mapThemeMode(params.getString("style") ?: "automatic"),
      configuration = configuration,
      rowSelectionBehavior = mapRowSelectionBehavior(paymentElementParams, didSelectPaymentOption),
    )
  }

  private fun mapCurrencySelectorElement(
    params: ReadableMap,
    style: String?,
    context: Context,
  ): CurrencySelectorElement.Configuration {
    val configuration = CurrencySelectorElement.Configuration()
    val appearanceParams = params.getMap("appearance") ?: return configuration
    val appearance = CurrencySelectorElement.Configuration.Appearance()
    appearanceParams.getFloatOrNull("contentVerticalPadding")?.let(appearance::contentVerticalPaddingDp)
    mapCurrencySelectorShapes(appearanceParams, appearance)
    mapCurrencySelectorFont(appearanceParams, appearance, context)
    mapCurrencySelectorLabel(appearanceParams, appearance)
    mapCurrencySelectorColors(appearanceParams, appearance, style, context)
    return configuration.appearance(appearance)
  }

  private fun mapCurrencySelectorShapes(
    params: ReadableMap,
    appearance: CurrencySelectorElement.Configuration.Appearance,
  ) {
    params.getMap("shapes")?.let { shapes ->
      shapes.getFloatOrNull("cornerRadius")?.let(appearance::cornerRadiusDp)
      shapes.getFloatOrNull("borderWidth")?.let(appearance::borderWidthDp)
    }
  }

  private fun mapCurrencySelectorFont(
    params: ReadableMap,
    appearance: CurrencySelectorElement.Configuration.Appearance,
    context: Context,
  ) {
    params.getMap("font")?.let { font ->
      appearance.fontResId(getFontResId(font, "family", context))
      font.getFloatOrNull("scale")?.let(appearance::sizeScaleFactor)
    }
  }

  private fun mapCurrencySelectorLabel(
    params: ReadableMap,
    appearance: CurrencySelectorElement.Configuration.Appearance,
  ) {
    params.getString("labelContent")?.let { value ->
      appearance.labelContent(
        when (value) {
          "automatic" -> CurrencySelectorElement.Configuration.Appearance.LabelContent.AUTOMATIC
          "currencyCode" -> CurrencySelectorElement.Configuration.Appearance.LabelContent.CURRENCY_CODE
          "amount" -> CurrencySelectorElement.Configuration.Appearance.LabelContent.AMOUNT
          else -> unsupportedValue("currencySelectorElement.appearance.labelContent", value)
        },
      )
    }
  }

  private fun mapCurrencySelectorColors(
    params: ReadableMap,
    appearance: CurrencySelectorElement.Configuration.Appearance,
    style: String?,
    context: Context,
  ) {
    params.getMap("colors")?.let { colors ->
      val isLight = when (style) {
        "alwaysLight" -> true
        "alwaysDark" -> false
        else -> !context.resources.configuration.isDarkTheme()
      }
      val palette = colors.getMap(if (isLight) "light" else "dark") ?: colors
      palette.color("border", isLight)?.let { appearance.borderColor(Color(it)) }
      palette.color("background", isLight)?.let { appearance.background(Color(it)) }
      palette.color("selectedBackground", isLight)?.let { appearance.selectedBackground(Color(it)) }
      palette.color("text", isLight)?.let { appearance.textColor(Color(it)) }
      palette.color("selectedText", isLight)?.let { appearance.selectedTextColor(Color(it)) }
      palette.color("textSecondary", isLight)?.let { appearance.textSecondaryColor(Color(it)) }
      palette.color("danger", isLight)?.let { appearance.dangerColor(Color(it)) }
    }
  }

  private fun mapDefaults(params: ReadableMap): CheckoutController.Configuration.Defaults {
    val defaults = CheckoutController.Configuration.Defaults()
    params.getMap("billingDetails")?.let {
      defaults.billingDetails(mapContactDetails(it))
    }
    params.getMap("shippingDetails")?.let {
      defaults.shippingDetails(mapContactDetails(it))
    }
    if (params.hasKey("email")) {
      defaults.email(params.getString("email"))
    }
    if (params.hasKey("phone")) {
      defaults.phone(params.getString("phone"))
    }
    return defaults
  }

  private fun mapContactDetails(
    params: ReadableMap,
  ): CheckoutController.Configuration.Defaults.ContactDetails =
    CheckoutController.Configuration.Defaults.ContactDetails().apply {
      name(params.getString("name"))
      params.getMap("address")?.let { address(mapAddress(it)) }
    }

  fun mapAddress(
    params: ReadableMap,
  ): CheckoutController.Address {
    return CheckoutController.Address()
      .country(params.getString("country").orEmpty())
      .line1(params.getString("line1"))
      .line2(params.getString("line2"))
      .city(params.getString("city"))
      .state(params.getString("state"))
      .postalCode(params.getString("postalCode"))
  }

  private fun mapPaymentElement(
    params: ReadableMap?,
    style: String?,
    context: Context,
  ): PaymentElement.Configuration {
    val configuration = PaymentElement.Configuration()
    if (params?.getMap("appearance") != null || style != null) {
      configuration.appearance(mapAppearance(params?.getMap("appearance"), style, context))
    }

    if (params == null) {
      return configuration
    }

    if (params.hasKey("displaysMandateText")) {
      configuration.embeddedViewDisplaysMandateText(params.getBoolean("displaysMandateText"))
    }

    params.getIntegerList("preferredNetworks")?.let {
      configuration.preferredNetworks(mapPreferredNetworks(it))
    }
    // Billing details collection is configured by the Checkout Session on Android.
    params.getStringList("paymentMethodOrder")?.let(configuration::paymentMethodOrder)
    if (params.hasKey("opensCardScannerAutomatically")) {
      configuration.opensCardScannerAutomatically(params.getBoolean("opensCardScannerAutomatically"))
    }
    params.getMap("termsDisplay")?.let { configuration.termsDisplay(mapTermsDisplay(it)) }
    params.getString("paymentMethodLayout")?.let {
      configuration.paymentMethodLayout(mapPaymentMethodLayout(it))
    }
    params.getMap("googlePay")?.let {
      configuration.googlePayConfiguration(mapGooglePay(it))
    }
    params.getMap("link")?.let {
      configuration.linkConfiguration(mapLink(it))
    }

    return configuration
  }

  private fun mapPreferredNetworks(values: List<Int>) =
    mapToPreferredNetworks(values).also { mapped ->
      if (mapped.size != values.size) {
        unsupportedValue("paymentElement.preferredNetworks", values)
      }
    }

  internal fun mapPaymentMethodLayout(
    value: String,
  ): PaymentElement.Configuration.PaymentMethodLayout =
    when (value) {
      "Horizontal" -> PaymentElement.Configuration.PaymentMethodLayout.Horizontal
      "Vertical" -> PaymentElement.Configuration.PaymentMethodLayout.Vertical
      "Automatic" -> PaymentElement.Configuration.PaymentMethodLayout.Automatic
      else -> unsupportedValue("paymentElement.paymentMethodLayout", value)
    }

  internal fun mapTermsDisplay(
    params: ReadableMap,
  ): Map<PaymentMethod.Type, PaymentElement.Configuration.TermsDisplay> {
    return buildMap {
      params.forEachKey { code ->
        val paymentMethodType = PaymentMethod.Type.fromCode(code)
          ?: unsupportedValue("paymentElement.termsDisplay", code)
        val termsDisplay = when (params.getString(code)) {
          "automatic" -> PaymentElement.Configuration.TermsDisplay.AUTOMATIC
          "never" -> PaymentElement.Configuration.TermsDisplay.NEVER
          else -> unsupportedValue("paymentElement.termsDisplay.$code", params.getString(code))
        }
        put(paymentMethodType, termsDisplay)
      }
    }
  }

  private fun mapGooglePay(
    params: ReadableMap,
  ): PaymentElement.Configuration.GooglePayConfiguration =
    PaymentElement.Configuration.GooglePayConfiguration().apply {
      params.getString("label")?.let(::label)
      params.getString("buttonType")?.let { buttonType(mapGooglePayButtonType(it)) }
      params.getStringList("additionalEnabledNetworks")?.let(::additionalEnabledNetworks)
    }

  internal fun mapGooglePayButtonType(
    value: String,
  ): PaymentElement.Configuration.GooglePayConfiguration.ButtonType =
    when (value) {
      "buy" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Buy
      "book" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Book
      "checkout" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Checkout
      "donate" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Donate
      "order" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Order
      "subscribe" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Subscribe
      "plain" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Plain
      "pay" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Pay
      else -> unsupportedValue("paymentElement.googlePay.buttonType", value)
    }

  private fun mapLink(
    params: ReadableMap,
  ): PaymentElement.Configuration.LinkConfiguration =
    PaymentElement.Configuration.LinkConfiguration().apply {
      params.getString("display")?.let {
        display(
          when (it) {
            "automatic" -> PaymentElement.Configuration.LinkConfiguration.Display.Automatic
            "never" -> PaymentElement.Configuration.LinkConfiguration.Display.Never
            else -> unsupportedValue("paymentElement.link.display", it)
          },
        )
      }
    }

  private fun mapRowSelectionBehavior(
    paymentElementParams: ReadableMap?,
    didSelectPaymentOption: () -> Unit,
  ): PaymentElement.RowSelectionBehavior {
    return when (val type = paymentElementParams?.getMap("rowSelectionBehavior")?.getString("type")) {
      null, "default" -> PaymentElement.RowSelectionBehavior.default()
      "immediateAction" -> PaymentElement.RowSelectionBehavior.immediateAction(didSelectPaymentOption)
      else -> unsupportedValue("paymentElement.rowSelectionBehavior.type", type)
    }
  }

  private fun mapAppearance(
    params: ReadableMap?,
    style: String?,
    context: Context,
  ): PaymentElement.Configuration.Appearance {
    val appearance = PaymentElement.Configuration.Appearance()
    style?.let { appearance.themeMode(mapThemeMode(it)) }
    val colors = params?.getMap("colors")
    if (colors != null) {
      appearance.colorsLight(mapColors(colors.getMap("light") ?: colors, isLight = true))
      appearance.colorsDark(mapColors(colors.getMap("dark") ?: colors, isLight = false))
    }
    params?.getMap("primaryButton")?.let { appearance.primaryButton(mapPrimaryButton(it, context)) }
    params?.getMap("font")?.let { font ->
      val typography = PaymentElement.Configuration.Appearance.Typography()
      getFontResId(font, "family", context)?.let(typography::fontResId)
      font.getFloatOrNull("scale")?.let(typography::sizeScaleFactor)
      appearance.typography(typography)
    }
    params?.getMap("shapes")?.let { shapes ->
      val mapped = PaymentElement.Configuration.Appearance.Shapes()
      shapes.getFloatOrNull("borderRadius")?.let(mapped::cornerRadiusDp)
      shapes.getFloatOrNull("borderWidth")?.let(mapped::borderStrokeWidthDp)
      appearance.shapes(mapped)
    }
    params?.getMap("embeddedPaymentElement")?.let {
      appearance.embeddedAppearance(mapEmbeddedAppearance(it))
    }

    params?.getMap("formInsetValues")?.let { insets ->
      val defaults = StripeThemeDefaults.formInsets
      appearance.formInsetValues(
        PaymentElement.Configuration.Appearance.Insets(
          startDp = insets.getFloatOr("left", defaults.start),
          topDp = insets.getFloatOr("top", defaults.top),
          endDp = insets.getFloatOr("right", defaults.end),
          bottomDp = insets.getFloatOr("bottom", defaults.bottom),
        ),
      )
    }
    return appearance
  }

  private fun mapEmbeddedAppearance(
    params: ReadableMap,
  ): PaymentElement.Configuration.Appearance.Embedded {
    val embedded = PaymentElement.Configuration.Appearance.Embedded()
    params.getMap("row")?.let { row ->
      embedded.rowStyle(mapEmbeddedRowStyle(row))
    }
    return embedded
  }

  private fun mapEmbeddedRowStyle(params: ReadableMap): RowStyle =
    when (val style = params.getString("style") ?: "flatWithRadio") {
      "flatWithRadio" -> mapFlatWithRadio(params)
      "flatWithCheckmark" -> mapFlatWithCheckmark(params)
      "flatWithDisclosure" -> mapFlatWithDisclosure(params)
      "floatingButton" -> RowStyle.FloatingButton().apply {
        params.getFloatOrNull("additionalInsets")?.let(::additionalInsetsDp)
        params.getMap("floating")?.getFloatOrNull("spacing")?.let(::spacingDp)
      }
      else -> unsupportedValue("paymentElement.appearance.embeddedPaymentElement.row.style", style)
    }

  private fun mapFlatWithRadio(params: ReadableMap): RowStyle.FlatWithRadio {
    val flat = params.getMap("flat")
    val radio = flat?.getMap("radio")
    return RowStyle.FlatWithRadio().apply {
      flat.getFloatOrNull("separatorThickness")?.let(::separatorThicknessDp)
      flat?.getMap("separatorInsets")?.getFloatOrNull("left")?.let(::startSeparatorInsetDp)
      flat?.getMap("separatorInsets")?.getFloatOrNull("right")?.let(::endSeparatorInsetDp)
      flat.getBooleanOrNull("topSeparatorEnabled")?.let(::topSeparatorEnabled)
      flat.getBooleanOrNull("bottomSeparatorEnabled")?.let(::bottomSeparatorEnabled)
      params.getFloatOrNull("additionalInsets")?.let(::additionalVerticalInsetsDp)
      colorsLight(mapRadioColors(flat, radio, true))
      colorsDark(mapRadioColors(flat, radio, false))
    }
  }

  private fun mapRadioColors(
    flat: ReadableMap?,
    radio: ReadableMap?,
    isLight: Boolean,
  ): RowStyle.FlatWithRadio.Colors {
    val colors = if (isLight) RowStyle.FlatWithRadio.Colors.light() else RowStyle.FlatWithRadio.Colors.dark()
    flat.color("separatorColor", isLight)?.let(colors::separatorColor)
    radio.color("selectedColor", isLight)?.let(colors::selectedColor)
    radio.color("unselectedColor", isLight)?.let(colors::unselectedColor)
    return colors
  }

  private fun mapFlatWithCheckmark(params: ReadableMap): RowStyle.FlatWithCheckmark {
    val flat = params.getMap("flat")
    val checkmark = flat?.getMap("checkmark")
    return RowStyle.FlatWithCheckmark().apply {
      flat.getFloatOrNull("separatorThickness")?.let(::separatorThicknessDp)
      flat?.getMap("separatorInsets")?.getFloatOrNull("left")?.let(::startSeparatorInsetDp)
      flat?.getMap("separatorInsets")?.getFloatOrNull("right")?.let(::endSeparatorInsetDp)
      flat.getBooleanOrNull("topSeparatorEnabled")?.let(::topSeparatorEnabled)
      flat.getBooleanOrNull("bottomSeparatorEnabled")?.let(::bottomSeparatorEnabled)
      params.getFloatOrNull("additionalInsets")?.let(::additionalVerticalInsetsDp)
      colorsLight(mapCheckmarkColors(flat, checkmark, true))
      colorsDark(mapCheckmarkColors(flat, checkmark, false))
    }
  }

  private fun mapCheckmarkColors(
    flat: ReadableMap?,
    checkmark: ReadableMap?,
    isLight: Boolean,
  ): RowStyle.FlatWithCheckmark.Colors {
    val colors = if (isLight) RowStyle.FlatWithCheckmark.Colors.light() else RowStyle.FlatWithCheckmark.Colors.dark()
    flat.color("separatorColor", isLight)?.let(colors::separatorColor)
    checkmark.color("color", isLight)?.let(colors::checkmarkColor)
    return colors
  }

  private fun mapFlatWithDisclosure(params: ReadableMap): RowStyle.FlatWithDisclosure {
    val flat = params.getMap("flat")
    val disclosure = flat?.getMap("disclosure")
    return RowStyle.FlatWithDisclosure().apply {
      flat.getFloatOrNull("separatorThickness")?.let(::separatorThicknessDp)
      flat?.getMap("separatorInsets")?.getFloatOrNull("left")?.let(::startSeparatorInsetDp)
      flat?.getMap("separatorInsets")?.getFloatOrNull("right")?.let(::endSeparatorInsetDp)
      flat.getBooleanOrNull("topSeparatorEnabled")?.let(::topSeparatorEnabled)
      flat.getBooleanOrNull("bottomSeparatorEnabled")?.let(::bottomSeparatorEnabled)
      params.getFloatOrNull("additionalInsets")?.let(::additionalVerticalInsetsDp)
      colorsLight(mapDisclosureColors(flat, disclosure, true))
      colorsDark(mapDisclosureColors(flat, disclosure, false))
    }
  }

  private fun mapDisclosureColors(
    flat: ReadableMap?,
    disclosure: ReadableMap?,
    isLight: Boolean,
  ): RowStyle.FlatWithDisclosure.Colors {
    val colors = if (isLight) RowStyle.FlatWithDisclosure.Colors.light() else RowStyle.FlatWithDisclosure.Colors.dark()
    flat.color("separatorColor", isLight)?.let(colors::separatorColor)
    disclosure.color("color", isLight)?.let(colors::disclosureColor)
    return colors
  }

  internal fun mapThemeMode(style: String): PaymentElement.Configuration.Appearance.ThemeMode =
    when (style) {
      "alwaysLight" -> PaymentElement.Configuration.Appearance.ThemeMode.AlwaysLight
      "alwaysDark" -> PaymentElement.Configuration.Appearance.ThemeMode.AlwaysDark
      "automatic" -> PaymentElement.Configuration.Appearance.ThemeMode.Automatic
      else -> unsupportedValue("style", style)
    }

  private fun mapColors(
    params: ReadableMap?,
    isLight: Boolean,
  ): PaymentElement.Configuration.Appearance.Colors {
    val colors = if (isLight) {
      PaymentElement.Configuration.Appearance.Colors.light()
    } else {
      PaymentElement.Configuration.Appearance.Colors.dark()
    }
    params.color("primary", isLight)?.let(colors::primary)
    params.color("background", isLight)?.let(colors::surface)
    params.color("componentBackground", isLight)?.let(colors::component)
    params.color("componentBorder", isLight)?.let(colors::componentBorder)
    params.color("componentDivider", isLight)?.let(colors::componentDivider)
    params.color("componentText", isLight)?.let(colors::onComponent)
    params.color("secondaryText", isLight)?.let(colors::subtitle)
    params.color("placeholderText", isLight)?.let(colors::placeholderText)
    params.color("primaryText", isLight)?.let(colors::onSurface)
    params.color("icon", isLight)?.let(colors::appBarIcon)
    params.color("error", isLight)?.let(colors::error)
    return colors
  }

  private fun mapPrimaryButton(
    params: ReadableMap,
    context: Context,
  ): PaymentElement.Configuration.Appearance.PrimaryButton {
    val primaryButton = PaymentElement.Configuration.Appearance.PrimaryButton()
    val colors = params.getMap("colors")
    if (colors != null) {
      primaryButton.colorsLight(mapPrimaryButtonColors(colors.getMap("light") ?: colors, true))
      primaryButton.colorsDark(mapPrimaryButtonColors(colors.getMap("dark") ?: colors, false))
    }

    params.getMap("shapes")?.let { shapes ->
      primaryButton.shape(
        PaymentElement.Configuration.Appearance.PrimaryButton.Shape()
          .cornerRadiusDp(shapes.getFloatOrNull("borderRadius"))
          .borderStrokeWidthDp(shapes.getFloatOrNull("borderWidth"))
          .heightDp(shapes.getFloatOrNull("height")),
      )
    }
    params.getMap("font")?.let { font ->
      primaryButton.typography(
        PaymentElement.Configuration.Appearance.PrimaryButton.Typography()
          .fontResId(getFontResId(font, "family", context)),
      )
    }
    return primaryButton
  }

  private fun mapPrimaryButtonColors(
    params: ReadableMap?,
    isLight: Boolean,
  ): PaymentElement.Configuration.Appearance.PrimaryButton.Colors {
    val colors = if (isLight) {
      PaymentElement.Configuration.Appearance.PrimaryButton.Colors.light()
    } else {
      PaymentElement.Configuration.Appearance.PrimaryButton.Colors.dark()
    }
    params.color("background", isLight)?.let(colors::background)
    params.color("text", isLight)?.let(colors::onBackground)
    params.color("border", isLight)?.let(colors::border)
    params.color("successBackgroundColor", isLight)?.let(colors::successBackgroundColor)
    params.color("successTextColor", isLight)?.let(colors::onSuccessBackgroundColor)
    return colors
  }

  private fun ReadableMap?.color(key: String, isLight: Boolean): Int? {
    if (this == null || !hasKey(key)) {
      return null
    }
    val value = when (getType(key)) {
      ReadableType.String -> getString(key)
      ReadableType.Map -> getMap(key)?.getString(if (isLight) "light" else "dark")
      else -> null
    }
    return value?.trim()?.removePrefix("#")?.let {
      if (it.length != HEX_COLOR_LENGTH_RGB && it.length != HEX_COLOR_LENGTH_ARGB) {
        throw PaymentSheetAppearanceException(
          "Failed to set Checkout appearance. Expected a 6- or 8-character hex color, but received: $it",
        )
      }
      "#$it".toColorInt()
    }
  }
}

private fun unsupportedValue(path: String, value: Any?): Nothing =
  throw IllegalArgumentException("Unsupported Checkout configuration value `$value` for `$path`.")

private const val HEX_COLOR_LENGTH_RGB = 6
private const val HEX_COLOR_LENGTH_ARGB = 8
