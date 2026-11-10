package com.reactnativestripesdk

import android.view.ContextThemeWrapper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.google.android.material.shape.MaterialShapeDrawable
import com.reactnativestripesdk.utils.readableMapOf
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
class AuBECSDebitFormViewTest {
  @Before
  fun setUp() {
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(RuntimeEnvironment.getApplication())
  }

  @Test
  @Config(qualifiers = "mdpi")
  fun setFormStyle_borderWidth_matchesDpAtMdpi() {
    val expectedStroke = PixelUtil.toPixelFromDIP(4.0).toFloat()
    assertBorderStrokeWidth(expectedStroke)
  }

  @Test
  @Config(qualifiers = "xhdpi")
  fun setFormStyle_borderWidth_matchesDpAtXhdpi() {
    val expectedStroke = PixelUtil.toPixelFromDIP(4.0).toFloat()
    assertBorderStrokeWidth(expectedStroke)
  }

  private fun assertBorderStrokeWidth(expectedStroke: Float) {
    val (view, bridgeContext) = auBecsDebitFormView()
    try {
      view.setCompanyName("Stripe")
      view.setFormStyle(
        readableMapOf(
          "borderWidth" to 4,
          "borderRadius" to 8,
        ),
      )
      val widgetBackground = view.getChildAt(0).background as MaterialShapeDrawable
      assertEquals(expectedStroke, widgetBackground.strokeWidth, 0.01f)
    } finally {
      bridgeContext.destroy()
    }
  }

  private fun auBecsDebitFormView(): Pair<AuBECSDebitFormView, BridgeReactContext> {
    val app = RuntimeEnvironment.getApplication()
    val bridgeContext = BridgeReactContext(app)
    val themed =
      ContextThemeWrapper(app, com.google.android.material.R.style.Theme_MaterialComponents_Light)
    val themedContext = ThemedReactContext(bridgeContext, themed, null, -1)
    return AuBECSDebitFormView(themedContext) to bridgeContext
  }
}
