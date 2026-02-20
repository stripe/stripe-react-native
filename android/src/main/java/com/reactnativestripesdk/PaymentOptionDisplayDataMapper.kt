package com.reactnativestripesdk

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.TextUnit
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.mapFromPaymentSheetBillingDetails
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

/**
 * Serialize Stripe's PaymentOptionDisplayData into a WritableMap
 * that can be sent over the RN bridge.
 */
suspend fun EmbeddedPaymentElement.PaymentOptionDisplayData.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("label", label)
    putString("paymentMethodType", paymentMethodType)
    putMap("billingDetails", mapFromPaymentSheetBillingDetails(billingDetails))

    val mandateTextHTML = mandateText?.toHtmlString()
    if (!mandateTextHTML.isNullOrEmpty()) {
      putString("mandateHTML", mandateTextHTML)
    } else {
      putNull("mandateHTML")
    }

    // Load image off the main thread with a timeout
    val imageBase64 =
      try {
        withContext(Dispatchers.Default) {
          val drawable =
            withTimeout(5_000L) {
              withContext(Dispatchers.IO) {
                imageLoader()
              }
            }
          getBitmapFromDrawable(drawable)?.let { bitmap ->
            getBase64FromBitmap(bitmap)
          } ?: ""
        }
      } catch (_: Exception) {
        // If imageLoader fails or times out, return empty string
        ""
      }
    putString("image", imageBase64)
  }

fun AnnotatedString.toHtmlString(): String {
  val htmlBuilder = StringBuilder()
  var currentIndex = 0

  val allAnnotations = mutableListOf<AnnotationInfo>()

  spanStyles.forEach { range ->
    allAnnotations.add(
      AnnotationInfo(
        start = range.start,
        end = range.end,
        type = AnnotationType.SPAN_STYLE,
        data = range.item,
      ),
    )
  }

  getStringAnnotations(0, length).forEach { range ->
    allAnnotations.add(
      AnnotationInfo(
        start = range.start,
        end = range.end,
        type = AnnotationType.STRING_ANNOTATION,
        data = range,
      ),
    )
  }

  getLinkAnnotations(0, length).forEach { range ->
    allAnnotations.add(
      AnnotationInfo(
        start = range.start,
        end = range.end,
        type = AnnotationType.LINK_ANNOTATION,
        data = range,
      ),
    )
  }

  allAnnotations.sortWith(compareBy({ it.start }, { -it.end }))

  val openTags = mutableListOf<TagInfo>()

  while (currentIndex < length) {
    openTags
      .filter { it.end == currentIndex }
      .reversed()
      .forEach { tagInfo ->
        htmlBuilder.append(tagInfo.closeTag)
        openTags.remove(tagInfo)
      }

    allAnnotations.filter { it.start == currentIndex }.forEach { annotation ->
      when (annotation.type) {
        AnnotationType.SPAN_STYLE -> {
          val spanStyle = annotation.data as SpanStyle
          val tags = getHtmlTagsForSpanStyle(spanStyle)
          tags.forEach { (openTag, closeTag) ->
            htmlBuilder.append(openTag)
            openTags.add(TagInfo(annotation.end, closeTag))
          }
        }
        AnnotationType.STRING_ANNOTATION -> {
          val stringAnnotation = annotation.data as AnnotatedString.Range<*>
          when (stringAnnotation.tag) {
            "URL", "LINK_TAG" -> {
              val url = stringAnnotation.item
              htmlBuilder.append("<a href=\"${escapeHtml(url as String)}\">")
              openTags.add(TagInfo(annotation.end, "</a>"))
            }
          }
        }
        AnnotationType.LINK_ANNOTATION -> {
          val linkAnnotation = annotation.data as AnnotatedString.Range<*>
          when (val linkItem = linkAnnotation.item) {
            is LinkAnnotation.Url -> {
              htmlBuilder.append("<a href=\"${escapeHtml(linkItem.url)}\">")
              openTags.add(TagInfo(annotation.end, "</a>"))
            }
          }
        }
      }
    }

    htmlBuilder.append(escapeHtml(text[currentIndex].toString()))
    currentIndex++
  }

  openTags.reversed().forEach { tagInfo ->
    htmlBuilder.append(tagInfo.closeTag)
  }

  return htmlBuilder.toString()
}

private fun getHtmlTagsForSpanStyle(spanStyle: SpanStyle): List<Pair<String, String>> {
  val tags = mutableListOf<Pair<String, String>>()

  if (spanStyle.fontWeight == FontWeight.Bold ||
    (spanStyle.fontWeight?.weight ?: 0) >= FontWeight.Bold.weight
  ) {
    tags.add("<b>" to "</b>")
  }

  if (spanStyle.fontStyle == FontStyle.Italic) {
    tags.add("<i>" to "</i>")
  }

  spanStyle.color.takeIf { it != Color.Unspecified }?.let { color ->
    val hexColor = String.format("#%06X", 0xFFFFFF and color.toArgb())
    tags.add("<font color=\"$hexColor\">" to "</font>")
  }

  spanStyle.fontSize.takeIf { it != TextUnit.Unspecified }?.let { fontSize ->
    val emSize = fontSize.value / 16f
    tags.add("<span style=\"font-size: ${emSize}em;\">" to "</span>")
  }

  spanStyle.textDecoration?.let { decoration ->
    if (decoration.contains(TextDecoration.Underline)) {
      tags.add("<u>" to "</u>")
    }
    if (decoration.contains(TextDecoration.LineThrough)) {
      tags.add("<s>" to "</s>")
    }
  }

  spanStyle.background.takeIf { it != Color.Unspecified }?.let { bgColor ->
    val hexBgColor = String.format("#%06X", 0xFFFFFF and bgColor.toArgb())
    tags.add("<span style=\"background-color: $hexBgColor;\">" to "</span>")
  }

  return tags
}

private fun escapeHtml(text: String): String =
  text
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace("\"", "&quot;")
    .replace("'", "&#39;")

private data class AnnotationInfo(
  val start: Int,
  val end: Int,
  val type: AnnotationType,
  val data: Any,
)

private enum class AnnotationType {
  SPAN_STYLE,
  STRING_ANNOTATION,
  LINK_ANNOTATION,
}

private data class TagInfo(
  val end: Int,
  val closeTag: String,
)
