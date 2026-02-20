package com.reactnativestripesdk.mappers

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.sp
import com.reactnativestripesdk.toHtmlString
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PaymentOptionDisplayDataMapperTest {
  @Test
  fun toHtmlString_PlainText() {
    val annotatedString = AnnotatedString("Simple text")
    val result = annotatedString.toHtmlString()

    Assert.assertEquals("Simple text", result)
  }

  @Test
  fun toHtmlString_EmptyString() {
    val annotatedString = AnnotatedString("")
    val result = annotatedString.toHtmlString()

    Assert.assertEquals("", result)
  }

  @Test
  fun toHtmlString_PreservesLinks() {
    val annotatedString =
      buildAnnotatedString {
        append("By continuing, you agree to our ")
        pushStringAnnotation("URL", "https://stripe.com/privacy")
        append("Privacy Policy")
        pop()
        append(" and ")
        pushStringAnnotation("URL", "https://stripe.com/terms")
        append("Terms of Service")
        pop()
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "By continuing, you agree to our <a href=\"https://stripe.com/privacy\">Privacy Policy</a> and <a href=\"https://stripe.com/terms\">Terms of Service</a>.",
      result,
    )
  }

  @Test
  fun toHtmlString_BoldText() {
    val annotatedString =
      buildAnnotatedString {
        append("Normal text ")
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
          append("bold text")
        }
        append(" normal again")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Normal text <b>bold text</b> normal again",
      result,
    )
  }

  @Test
  fun toHtmlString_BoldTextWithCustomWeight() {
    val annotatedString =
      buildAnnotatedString {
        append("Normal ")
        withStyle(SpanStyle(fontWeight = FontWeight.W700)) {
          append("bold")
        }
        append(" text")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Normal <b>bold</b> text",
      result,
    )
  }

  @Test
  fun toHtmlString_ItalicText() {
    val annotatedString =
      buildAnnotatedString {
        append("Normal text ")
        withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
          append("italic text")
        }
        append(" normal again")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Normal text <i>italic text</i> normal again",
      result,
    )
  }

  @Test
  fun toHtmlString_ColoredText() {
    val annotatedString =
      buildAnnotatedString {
        append("Normal text ")
        withStyle(SpanStyle(color = Color.Red)) {
          append("red text")
        }
        append(" normal again")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Normal text <font color=\"#FF0000\">red text</font> normal again",
      result,
    )
  }

  @Test
  fun toHtmlString_FontSizeText() {
    val annotatedString =
      buildAnnotatedString {
        append("Normal text ")
        withStyle(SpanStyle(fontSize = 24.sp)) {
          append("large text")
        }
        append(" normal again")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Normal text <span style=\"font-size: 1.5em;\">large text</span> normal again",
      result,
    )
  }

  @Test
  fun toHtmlString_CombinedFormatting() {
    val annotatedString =
      buildAnnotatedString {
        append("Start ")
        withStyle(
          SpanStyle(
            fontWeight = FontWeight.Bold,
            fontStyle = FontStyle.Italic,
            color = Color.Blue,
          ),
        ) {
          append("bold italic blue")
        }
        append(" end")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Start <b><i><font color=\"#0000FF\">bold italic blue</font></i></b> end",
      result,
    )
  }

  @Test
  fun toHtmlString_LinksWithFormatting() {
    val annotatedString =
      buildAnnotatedString {
        append("Visit our ")
        pushStringAnnotation("URL", "https://stripe.com/privacy")
        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Color.Blue)) {
          append("Privacy Policy")
        }
        pop()
        append(" for details")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Visit our <b><font color=\"#0000FF\"><a href=\"https://stripe.com/privacy\">Privacy Policy</a></font></b> for details",
      result,
    )
  }

  @Test
  fun toHtmlString_HtmlEscaping() {
    val annotatedString = AnnotatedString("Text with <tags> & \"quotes\" and 'apostrophes'")
    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Text with &lt;tags&gt; &amp; &quot;quotes&quot; and &#39;apostrophes&#39;",
      result,
    )
  }

  @Test
  fun toHtmlString_HtmlEscapingInLinks() {
    val annotatedString =
      buildAnnotatedString {
        pushStringAnnotation("URL", "https://example.com/search?q=test&foo=bar")
        append("Link with & in URL")
        pop()
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "<a href=\"https://example.com/search?q=test&amp;foo=bar\">Link with &amp; in URL</a>",
      result,
    )
  }

  @Test
  fun toHtmlString_NestedAnnotations() {
    val annotatedString =
      buildAnnotatedString {
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
          append("Bold text with ")
          withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
            append("nested italic")
          }
          append(" continues")
        }
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "<b>Bold text with <i>nested italic</i> continues</b>",
      result,
    )
  }

  @Test
  fun toHtmlString_OverlappingAnnotations() {
    val annotatedString =
      buildAnnotatedString {
        append("Start ")
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
          append("bold ")
          withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
            append("and italic")
          }
        }
        withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
          append(" continues italic")
        }
        append(" end")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Start <b>bold <i>and italic</i></b><i> continues italic</i> end",
      result,
    )
  }

  @Test
  fun toHtmlString_MultipleLinksWithFormatting() {
    val annotatedString =
      buildAnnotatedString {
        append("Check ")
        pushLink(LinkAnnotation.Url("https://stripe.com"))
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
          append("Stripe")
        }
        pop()
        append(" and ")
        pushLink(LinkAnnotation.Url("https://github.com"))
        withStyle(SpanStyle(fontStyle = FontStyle.Italic, color = Color.Green)) {
          append("GitHub")
        }
        pop()
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Check <b><a href=\"https://stripe.com\">Stripe</a></b> and <i><font color=\"#00FF00\"><a href=\"https://github.com\">GitHub</a></font></i>",
      result,
    )
  }

  @Test
  fun toHtmlString_SpecialCharactersInFormattedText() {
    val annotatedString =
      buildAnnotatedString {
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
          append("<b>Already bold</b> & \"quoted\"")
        }
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "<b>&lt;b&gt;Already bold&lt;/b&gt; &amp; &quot;quoted&quot;</b>",
      result,
    )
  }

  @Test
  fun toHtmlString_UnderlineTextDecoration() {
    val annotatedString =
      buildAnnotatedString {
        append("This text is ")
        withStyle(SpanStyle(textDecoration = TextDecoration.Underline)) {
          append("underlined")
        }
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "This text is <u>underlined</u>.",
      result,
    )
  }

  @Test
  fun toHtmlString_StrikethroughTextDecoration() {
    val annotatedString =
      buildAnnotatedString {
        append("This text is ")
        withStyle(SpanStyle(textDecoration = TextDecoration.LineThrough)) {
          append("crossed out")
        }
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "This text is <s>crossed out</s>.",
      result,
    )
  }

  @Test
  fun toHtmlString_CombinedTextDecorations() {
    val annotatedString =
      buildAnnotatedString {
        append("This text is ")
        withStyle(
          SpanStyle(
            textDecoration =
              TextDecoration.combine(
                listOf(TextDecoration.Underline, TextDecoration.LineThrough),
              ),
          ),
        ) {
          append("both underlined and crossed")
        }
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "This text is <u><s>both underlined and crossed</s></u>.",
      result,
    )
  }

  @Test
  fun toHtmlString_BackgroundColor() {
    val annotatedString =
      buildAnnotatedString {
        append("This text has ")
        withStyle(SpanStyle(background = Color.Yellow)) {
          append("yellow background")
        }
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "This text has <span style=\"background-color: #FFFF00;\">yellow background</span>.",
      result,
    )
  }

  @Test
  fun toHtmlString_LinkTagAnnotation() {
    val annotatedString =
      buildAnnotatedString {
        append("Visit ")
        pushStringAnnotation("LINK_TAG", "https://stripe.com")
        append("Stripe")
        pop()
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "Visit <a href=\"https://stripe.com\">Stripe</a>.",
      result,
    )
  }

  @Test
  fun toHtmlString_ComplexMandateText() {
    val annotatedString =
      buildAnnotatedString {
        append("By continuing, you agree to ")
        pushStringAnnotation("URL", "https://stripe.com/terms")
        withStyle(
          SpanStyle(
            fontWeight = FontWeight.Bold,
            textDecoration = TextDecoration.Underline,
            color = Color.Blue,
          ),
        ) {
          append("Terms")
        }
        pop()
        append(" and ")
        pushStringAnnotation("URL", "https://stripe.com/privacy")
        withStyle(SpanStyle(fontStyle = FontStyle.Italic, color = Color.Red)) {
          append("Privacy")
        }
        pop()
        append(". Important details are ")
        withStyle(SpanStyle(background = Color.Yellow)) {
          append("highlighted")
        }
        append(".")
      }

    val result = annotatedString.toHtmlString()

    Assert.assertEquals(
      "By continuing, you agree to <b><font color=\"#0000FF\"><u><a href=\"https://stripe.com/terms\">Terms</a></u></font></b> and <i><font color=\"#FF0000\"><a href=\"https://stripe.com/privacy\">Privacy</a></font></i>. Important details are <span style=\"background-color: #FFFF00;\">highlighted</span>.",
      result,
    )
  }
}
