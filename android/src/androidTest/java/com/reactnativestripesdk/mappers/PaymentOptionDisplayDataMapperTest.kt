package com.reactnativestripesdk.mappers

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.buildAnnotatedString
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.reactnativestripesdk.toHtmlString
import org.junit.Assert
import org.junit.Before
import org.junit.Test

class PaymentOptionDisplayDataMapperTest {
  private val reactApplicationContext =
    BridgeReactContext(
      ApplicationProvider.getApplicationContext(),
    )

  @Before
  fun setup() {
    SoLoader.init(reactApplicationContext, OpenSourceMergedSoMapping)
  }

  @Test
  fun toHtmlString_PlainText() {
    val annotatedString = AnnotatedString("Simple text")
    val result = annotatedString.toHtmlString()

    Assert.assertEquals("<p dir=\"ltr\">Simple text</p>\n", result)
  }

  @Test
  fun toHtmlString_PreservesLinks() {
    val annotatedString =
      buildAnnotatedString {
        append("By continuing, you agree to our ")
        pushLink(LinkAnnotation.Url("https://stripe.com/privacy"))
        append("Privacy Policy")
        pop()
        append(" and ")
        pushLink(LinkAnnotation.Url("https://stripe.com/terms"))
        append("Terms of Service")
        pop()
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertNotNull("Result should not be null", result)
    Assert.assertTrue(
      "Result should contain the text content",
      result.contains("By continuing, you agree"),
    )
    Assert.assertTrue(
      "Result should contain link text",
      result.contains("Privacy Policy"),
    )
    Assert.assertTrue(
      "Result should contain link text",
      result.contains("Terms of Service"),
    )
  }
}
