import androidx.compose.ui.text.AnnotatedString
import androidx.core.text.toHtml
import androidx.core.text.toSpannable
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.getBase64FromBitmap
import com.reactnativestripesdk.getBitmapFromDrawable
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
      } catch (e: Exception) {
        // If imageLoader fails or times out, return empty string
        ""
      }
    putString("image", imageBase64)
  }

fun AnnotatedString.toHtmlString(): String {
  val spanned = this.toSpannable()
  return spanned.toHtml()
}
