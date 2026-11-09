package com.reactnativestripesdk

import android.os.Looper
import android.view.ContextThemeWrapper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.modules.i18nmanager.I18nUtil
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.stripe.android.databinding.StripeCardInputWidgetBinding
import com.stripe.android.view.CardInputWidget
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows
@RunWith(RobolectricTestRunner::class)
class CardFieldViewTest {
  @Before
  fun setUp() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(RuntimeEnvironment.getApplication())
    I18nUtil.instance.allowRTL(RuntimeEnvironment.getApplication(), false)
  }

  @Test
  fun requestClearFromJS_callsCardInputWidgetClearAndClearsPostalCode() {
    val (view, bridgeContext) = cardFieldView()
    try {
      val widgetField = CardFieldView::class.java.getDeclaredField("mCardWidget")
      widgetField.isAccessible = true
      val cardWidget = widgetField.get(view) as CardInputWidget
      val spiedWidget = spy(cardWidget)
      widgetField.set(view, spiedWidget)

      val binding = StripeCardInputWidgetBinding.bind(view.getChildAt(0))
      view.setPostalCodeEnabled(true)
      binding.postalCodeEditText.setText("94103")

      view.requestClearFromJS()
      Shadows.shadowOf(Looper.getMainLooper()).idle()

      verify(spiedWidget).clear()
      assertEquals("", binding.postalCodeEditText.text.toString())
    } finally {
      bridgeContext.destroy()
    }
  }

  private fun cardFieldView(): Pair<CardFieldView, BridgeReactContext> {
    val app = RuntimeEnvironment.getApplication()
    val bridgeContext = BridgeReactContext(app)
    val themed =
      ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    val themedContext = ThemedReactContext(bridgeContext, themed, null, -1)
    return CardFieldView(themedContext) to bridgeContext
  }
}
