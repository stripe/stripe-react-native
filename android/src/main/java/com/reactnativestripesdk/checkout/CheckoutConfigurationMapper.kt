package com.reactnativestripesdk.checkout

import android.annotation.SuppressLint
import android.content.Context
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.reactnativestripesdk.getFontResId
import com.reactnativestripesdk.utils.PaymentSheetAppearanceException
import com.reactnativestripesdk.utils.forEachKey
import com.reactnativestripesdk.utils.getBooleanOr
import com.reactnativestripesdk.utils.getFloatOr
import com.reactnativestripesdk.utils.getFloatOrNull
import com.reactnativestripesdk.utils.getIntegerList
import com.reactnativestripesdk.utils.getStringList
import com.reactnativestripesdk.utils.mapToPreferredNetworks
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.elements.PaymentElement
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentelement.CheckoutSessionPreview

@OptIn(CheckoutSessionPreview::class)
internal data class MappedCheckoutConfiguration(
  val clientSecret: String,
  val returnURL: String,
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
    val clientSecret = params.requiredString("clientSecret")
    val returnURL = params.requiredString("returnURL")
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
      returnURL = returnURL,
      configuration = configuration,
      rowSelectionBehavior = mapRowSelectionBehavior(paymentElementParams, didSelectPaymentOption),
    )
  }

  private fun mapDefaults(params: ReadableMap): CheckoutController.Configuration.Defaults {
    val defaults = CheckoutController.Configuration.Defaults()
    params.getMap("billingDetails")?.let {
      defaults.billingDetails(mapContactDetails(it, "defaults.billingDetails.address"))
    }
    params.getMap("shippingDetails")?.let {
      defaults.shippingDetails(mapContactDetails(it, "defaults.shippingDetails.address"))
    }
    if (params.hasKey("email")) {
      defaults.email(params.getString("email"))
    }
    // TODO(porter): Uncomment when the reviewed native setter ships.
    // defaults.phone(params.getString("phone"))
    return defaults
  }

  private fun mapContactDetails(
    params: ReadableMap,
    addressPath: String,
  ): CheckoutController.Configuration.Defaults.ContactDetails =
    CheckoutController.Configuration.Defaults.ContactDetails().apply {
      name(params.getString("name"))
      params.getMap("address")?.let { address(mapAddress(it, addressPath)) }
    }

  private fun mapAddress(
    params: ReadableMap,
    path: String,
  ): CheckoutController.Address {
    val country = params.getString("country")?.takeIf(String::isNotEmpty)
      ?: throw IllegalArgumentException("Checkout configuration requires `$path.country`.")
    return CheckoutController.Address()
      .country(country)
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
    val appearance = mapAppearance(params?.getMap("appearance"), style, context)
    configuration.appearance(appearance)
    configuration.embeddedViewDisplaysMandateText(
      params.getBooleanOr("displaysMandateText", false),
    )

    if (params == null) {
      return configuration
    }

    // TODO(porter): Uncomment when the reviewed native setter ships.
    // configuration.savePaymentMethodOptInBehavior(
    //   mapSavePaymentMethodOptInBehavior(params.getString("savePaymentMethodOptInBehavior")),
    // )
    configuration.preferredNetworks(
      mapToPreferredNetworks(params.getIntegerList("preferredNetworks")),
    )
    configuration.billingDetailsCollectionConfiguration(
      mapBillingDetailsCollection(params.getMap("billingDetailsCollectionConfiguration")),
    )
    configuration.paymentMethodOrder(params.getStringList("paymentMethodOrder").orEmpty())
    configuration.opensCardScannerAutomatically(
      params.getBooleanOr("opensCardScannerAutomatically", false),
    )
    configuration.termsDisplay(mapTermsDisplay(params.getMap("termsDisplay")))
    configuration.paymentMethodLayout(
      mapPaymentMethodLayout(params.getString("paymentMethodLayout")),
    )
    params.getMap("googlePay")?.let {
      configuration.googlePayConfiguration(mapGooglePay(it))
    }
    params.getMap("link")?.let {
      configuration.linkConfiguration(mapLink(it))
    }

    return configuration
  }

  private fun mapBillingDetailsCollection(
    params: ReadableMap?,
  ): PaymentElement.Configuration.BillingDetailsCollectionConfiguration {
    val configuration = PaymentElement.Configuration.BillingDetailsCollectionConfiguration()
      .name(mapCollectionMode(params?.getString("name")))
      .address(mapAddressCollectionMode(params?.getString("address")))
    // TODO(porter): Uncomment when the reviewed native setters ship.
    // configuration.phone(mapCollectionMode(params?.getString("phone")))
    // configuration.attachDefaultsToPaymentMethod(
    //   params.getBooleanOr("attachDefaultsToPaymentMethod", false),
    // )
    return configuration
  }

  internal fun mapCollectionMode(
    value: String?,
  ): PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode =
    if (value == "always") {
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Always
    } else {
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.CollectionMode.Automatic
    }

  internal fun mapAddressCollectionMode(
    value: String?,
  ): PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode =
    if (value == "full") {
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Full
    } else {
      PaymentElement.Configuration.BillingDetailsCollectionConfiguration.AddressCollectionMode.Automatic
    }

  internal fun mapPaymentMethodLayout(
    value: String?,
  ): PaymentElement.Configuration.PaymentMethodLayout =
    when (value) {
      "Horizontal" -> PaymentElement.Configuration.PaymentMethodLayout.Horizontal
      "Vertical" -> PaymentElement.Configuration.PaymentMethodLayout.Vertical
      else -> PaymentElement.Configuration.PaymentMethodLayout.Automatic
    }

  internal fun mapTermsDisplay(
    params: ReadableMap?,
  ): Map<PaymentMethod.Type, PaymentElement.Configuration.TermsDisplay> {
    if (params == null) {
      return emptyMap()
    }
    return buildMap {
      params.forEachKey { code ->
        val paymentMethodType = PaymentMethod.Type.fromCode(code)
        val termsDisplay = when (params.getString(code)) {
          "automatic" -> PaymentElement.Configuration.TermsDisplay.AUTOMATIC
          "never" -> PaymentElement.Configuration.TermsDisplay.NEVER
          else -> null
        }
        if (paymentMethodType != null && termsDisplay != null) {
          put(paymentMethodType, termsDisplay)
        }
      }
    }
  }

  private fun mapGooglePay(
    params: ReadableMap,
  ): PaymentElement.Configuration.GooglePayConfiguration =
    PaymentElement.Configuration.GooglePayConfiguration().apply {
      params.getString("label")?.let(::label)
      buttonType(mapGooglePayButtonType(params.getString("buttonType")))
      additionalEnabledNetworks(params.getStringList("additionalEnabledNetworks").orEmpty())
      // TODO(porter): Uncomment when the reviewed native environment initializer ships.
      // environment(
      //   if (params.getBooleanOr("testEnv", false)) Environment.Test else Environment.Production,
      // )
    }

  internal fun mapGooglePayButtonType(
    value: String?,
  ): PaymentElement.Configuration.GooglePayConfiguration.ButtonType =
    when (value) {
      "buy" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Buy
      "book" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Book
      "checkout" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Checkout
      "donate" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Donate
      "order" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Order
      "subscribe" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Subscribe
      "plain" -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Plain
      else -> PaymentElement.Configuration.GooglePayConfiguration.ButtonType.Pay
    }

  private fun mapLink(
    params: ReadableMap,
  ): PaymentElement.Configuration.LinkConfiguration =
    PaymentElement.Configuration.LinkConfiguration().display(
      if (params.getString("display") == "never") {
        PaymentElement.Configuration.LinkConfiguration.Display.Never
      } else {
        PaymentElement.Configuration.LinkConfiguration.Display.Automatic
      },
    )

  private fun mapRowSelectionBehavior(
    paymentElementParams: ReadableMap?,
    didSelectPaymentOption: () -> Unit,
  ): PaymentElement.RowSelectionBehavior =
    if (paymentElementParams?.getMap("rowSelectionBehavior")?.getString("type") == "immediateAction") {
      PaymentElement.RowSelectionBehavior.immediateAction(didSelectPaymentOption)
    } else {
      PaymentElement.RowSelectionBehavior.default()
    }

  private fun mapAppearance(
    params: ReadableMap?,
    style: String?,
    context: Context,
  ): PaymentElement.Configuration.Appearance {
    val appearance = PaymentElement.Configuration.Appearance()
      .themeMode(mapThemeMode(style))
    val colors = params?.getMap("colors")
    appearance.colorsLight(mapColors(colors?.getMap("light") ?: colors, isLight = true))
    appearance.colorsDark(mapColors(colors?.getMap("dark") ?: colors, isLight = false))
    appearance.primaryButton(mapPrimaryButton(params?.getMap("primaryButton"), context))

    params?.getMap("formInsetValues")?.let { insetParams ->
      appearance.formInsetValues(
        PaymentElement.Configuration.Appearance.Insets(
          insetParams.getFloatOr("left", DEFAULT_FORM_LEFT_INSET),
          insetParams.getFloatOr("top", DEFAULT_FORM_TOP_INSET),
          insetParams.getFloatOr("right", DEFAULT_FORM_RIGHT_INSET),
          insetParams.getFloatOr("bottom", DEFAULT_FORM_BOTTOM_INSET),
        ),
      )
    }
    // TODO(porter): Map root font, shapes, and embedded appearance when their reviewed setters ship.
    return appearance
  }

  internal fun mapThemeMode(style: String?): PaymentElement.Configuration.Appearance.ThemeMode =
    when (style) {
      "alwaysLight" -> PaymentElement.Configuration.Appearance.ThemeMode.AlwaysLight
      "alwaysDark" -> PaymentElement.Configuration.Appearance.ThemeMode.AlwaysDark
      else -> PaymentElement.Configuration.Appearance.ThemeMode.Automatic
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
    params: ReadableMap?,
    context: Context,
  ): PaymentElement.Configuration.Appearance.PrimaryButton {
    val primaryButton = PaymentElement.Configuration.Appearance.PrimaryButton()
    val colors = params?.getMap("colors")
    primaryButton.colorsLight(mapPrimaryButtonColors(colors?.getMap("light") ?: colors, true))
    primaryButton.colorsDark(mapPrimaryButtonColors(colors?.getMap("dark") ?: colors, false))

    val shapes = params?.getMap("shapes")
    primaryButton.shape(
      PaymentElement.Configuration.Appearance.PrimaryButton.Shape()
        .cornerRadiusDp(shapes.getFloatOrNull("borderRadius"))
        .borderStrokeWidthDp(shapes.getFloatOrNull("borderWidth"))
        .heightDp(shapes.getFloatOrNull("height")),
    )
    primaryButton.typography(
      PaymentElement.Configuration.Appearance.PrimaryButton.Typography()
        .fontResId(getFontResId(params?.getMap("font"), "family", context)),
    )
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

  private fun ReadableMap.requiredString(key: String): String =
    getString(key)?.takeIf(String::isNotEmpty)
      ?: throw IllegalArgumentException("Checkout configuration requires `$key`.")

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

private const val DEFAULT_FORM_LEFT_INSET = 20f
private const val DEFAULT_FORM_TOP_INSET = 0f
private const val DEFAULT_FORM_RIGHT_INSET = 20f
private const val DEFAULT_FORM_BOTTOM_INSET = 40f
private const val HEX_COLOR_LENGTH_RGB = 6
private const val HEX_COLOR_LENGTH_ARGB = 8
