package com.reactnativestripesdk.checkout

import android.content.Context
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.compose.material.Colors
import androidx.compose.material.MaterialTheme
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.test.core.app.ApplicationProvider
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.elements.CurrencySelectorElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@OptIn(CheckoutSessionPreview::class)
@RunWith(RobolectricTestRunner::class)
class CheckoutCurrencySelectorThemeTest {
  private val context = ApplicationProvider.getApplicationContext<Context>()

  @Test
  @Config(qualifiers = "notnight")
  fun `forced dark supplies light default text without custom appearance`() {
    val colors = renderedColors(configuration("alwaysDark"))
    assertFalse(colors.isLight)
    assertEquals(Color.White, colors.onSurface)
  }

  @Test
  @Config(qualifiers = "night")
  fun `forced light supplies light default background on a dark device`() {
    val colors = renderedColors(configuration("alwaysLight"))
    assertTrue(colors.isLight)
    assertEquals(Color.White, colors.surface)
    assertEquals(Color.Black, colors.onSurface)
  }

  @Test
  @Config(qualifiers = "notnight")
  fun `partial dark palette keeps a contrasting default text color`() {
    val mapped = CheckoutConfigurationMapper.map(
      readableMapOf(
        "clientSecret" to "cs_test_secret_123",
        "style" to "alwaysDark",
        "currencySelectorElement" to readableMapOf(
          "appearance" to readableMapOf(
            "colors" to readableMapOf(
              "light" to readableMapOf("background" to "#FFFFFF"),
              "dark" to readableMapOf("background" to "#000000"),
            ),
          ),
        ),
      ),
      context,
    ) {}
    val selector = mapped.configuration.readField<CurrencySelectorElement.Configuration>(
      "currencySelectorElementConfiguration",
    )
    val appearance = selector.readField<CurrencySelectorElement.Configuration.Appearance>("appearance")
    val colors = renderedColors(mapped)
    assertEquals(Color.Black, appearance.readField<Color>("background"))
    assertEquals(Color.White, appearance.readField<Color?>("textColor") ?: colors.onSurface)
  }

  @Test
  @Config(qualifiers = "night")
  fun `automatic uses dark default colors on a dark device`() {
    assertFalse(renderedColors(configuration("automatic")).isLight)
  }

  @Test
  @Config(qualifiers = "notnight")
  fun `automatic uses light default colors on a light device`() {
    assertTrue(renderedColors(configuration("automatic")).isLight)
  }

  private fun configuration(style: String) = CheckoutConfigurationMapper.map(
    readableMapOf(
      "clientSecret" to "cs_test_secret_123",
      "style" to style,
      "currencySelectorElement" to readableMapOf(),
    ),
    context,
  ) {}

  private fun renderedColors(mapped: MappedCheckoutConfiguration): Colors {
    val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    val view = ComposeView(activity.get())
    var colors: Colors? = null
    try {
      view.setContent {
        CheckoutCurrencySelectorTheme(mapped.themeMode) {
          val currentColors = MaterialTheme.colors
          SideEffect { colors = currentColors }
        }
      }
      activity.get().setContentView(view)
      shadowOf(Looper.getMainLooper()).idle()
      return checkNotNull(colors) { "The Currency Selector theme must compose." }
    } finally {
      view.disposeComposition()
      activity.pause().stop().destroy()
    }
  }

  private inline fun <reified T> Any.readField(name: String): T = javaClass.getDeclaredField(name).let {
    it.isAccessible = true
    it.get(this) as T
  }
}
