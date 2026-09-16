package com.reactnativestripesdk.checkout

import android.annotation.SuppressLint
import android.content.Context
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.reactnativestripesdk.getFontResId
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.forEachKey
import com.reactnativestripesdk.utils.getFloatOr
import com.reactnativestripesdk.utils.getFloatOrNull
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.elements.PaymentElement
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.uicore.StripeThemeDefaults

@OptIn(CheckoutSessionPreview::class)
internal data class MappedCheckoutConfiguration(
  val clientSecret: String,
  val configuration: CheckoutController.Configuration,
  val rowSelectionBehavior: PaymentElement.RowSelectionBehavior,
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

    return MappedCheckoutConfiguration(
      clientSecret = clientSecret,
      configuration = configuration,
      rowSelectionBehavior = mapRowSelectionBehavior(paymentElementParams, didSelectPaymentOption),
    )
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
    rejectUnsupportedFields(params, "defaults", "phone")
    return defaults
  }

  private fun mapContactDetails(
    params: ReadableMap,
  ): CheckoutController.Configuration.Defaults.ContactDetails =
    CheckoutController.Configuration.Defaults.ContactDetails().apply {
      name(params.getString("name"))
      params.getMap("address")?.let { address(mapAddress(it)) }
    }

  private fun mapAddress(
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

    rejectUnsupportedFields(params, "paymentElement", "savePaymentMethodOptInBehavior", "useAutocompleteEndpoints")
    params.getIntegerList("preferredNetworks")?.let {
      configuration.preferredNetworks(mapPreferredNetworks(it))
    }
    if (params.getMap("billingDetailsCollectionConfiguration") != null) {
      throw IllegalArgumentException(
        "Checkout billing collection is configured on the Checkout Session on Android. " +
          "Remove paymentElement.billingDetailsCollectionConfiguration.",
      )
    }
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
      // Native Checkout derives the Google Pay environment from the session and build type.
      rejectUnsupportedFields(params, "paymentElement.googlePay", "testEnv")
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
    params?.let { rejectUnsupportedFields(it, "paymentElement.appearance", "font", "shapes", "embeddedPaymentElement") }
    return appearance
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

  private fun rejectUnsupportedFields(params: ReadableMap, path: String, vararg fields: String) {
    for (field in fields) {
      require(!params.hasKey(field) || params.isNull(field)) {
        "The installed Stripe Android SDK does not support setting `$path.$field` for Checkout."
      }
    }
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
