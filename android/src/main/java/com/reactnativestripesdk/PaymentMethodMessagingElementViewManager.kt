package com.reactnativestripesdk

import android.content.Context
import androidx.core.graphics.toColorInt
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementViewManagerDelegate
import com.facebook.react.viewmanagers.PaymentMethodMessagingElementViewManagerInterface
import com.reactnativestripesdk.utils.PaymentMethodMessagingElementAppearanceException
import com.reactnativestripesdk.utils.asMapOrNull
import com.reactnativestripesdk.utils.getDoubleOrNull
import com.reactnativestripesdk.utils.getStringList
import com.stripe.android.model.PaymentMethod
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElement
import com.stripe.android.paymentmethodmessaging.element.PaymentMethodMessagingElementPreview

@OptIn(PaymentMethodMessagingElementPreview::class)
@ReactModule(name = PaymentMethodMessagingElementViewManager.NAME)
class PaymentMethodMessagingElementViewManager :
  ViewGroupManager<PaymentMethodMessagingElementView>(),
  PaymentMethodMessagingElementViewManagerInterface<PaymentMethodMessagingElementView> {
  companion object {
    const val NAME = "PaymentMethodMessagingElementView"
  }

  private val delegate = PaymentMethodMessagingElementViewManagerDelegate(this)

  override fun getName() = NAME

  override fun getDelegate() = delegate

  override fun createViewInstance(ctx: ThemedReactContext): PaymentMethodMessagingElementView = PaymentMethodMessagingElementView(ctx)

  override fun onDropViewInstance(view: PaymentMethodMessagingElementView) {
    super.onDropViewInstance(view)

    view.handleOnDropViewInstance()
  }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "appearance")
  override fun setAppearance(
    view: PaymentMethodMessagingElementView?,
    value: Dynamic?,
  ) {
    val readableMap = value?.asMapOrNull() ?: return
    view?.let {
      val appearance = parseAppearance(readableMap, view.context)
      view.appearance(appearance)
    }
  }

  @ReactProp(name = "configuration")
  override fun setConfiguration(
    view: PaymentMethodMessagingElementView,
    cfg: Dynamic,
  ) {
    val readableMap = cfg.asMapOrNull() ?: return

    val elementConfig = parseElementConfiguration(readableMap)
    view.latestElementConfig = elementConfig
    view.configure(elementConfig)
    view.post {
      view.requestLayout()
      view.invalidate()
    }
  }

  private fun parseElementConfiguration(map: ReadableMap): PaymentMethodMessagingElement.Configuration {
    val amount = map.getDouble("amount").toLong()
    val currency = map.getString("currency")
    val locale = map.getString("locale")
    val countryCode = map.getString("countryCode")
    val stringPaymentMethodTypes = map.getStringList("paymentMethodTypes")
    val paymentMethodTypes =
      stringPaymentMethodTypes?.mapNotNull {
        PaymentMethod.Type.fromCode(it)
      }

    val config = PaymentMethodMessagingElement.Configuration()
    config.amount(amount)
    currency?.let { config.currency(it) }
    locale?.let { config.locale(it) }
    countryCode?.let { config.countryCode(it) }
    paymentMethodTypes?.let { config.paymentMethodTypes(it) }

    return config
  }

  private fun parseAppearance(
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
    val fontMap = map.getMap("font")
    val fontFamily =
      getFontResId(
        fontMap,
        "family",
        context,
      )
    val scaleFactor = fontMap.getDoubleOrNull("scale") ?: 1.0
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
}
