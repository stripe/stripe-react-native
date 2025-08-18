import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.getBase64FromBitmap
import com.reactnativestripesdk.getBitmapFromDrawable
import com.reactnativestripesdk.utils.mapFromPaymentSheetBillingDetails
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import kotlinx.coroutines.withTimeout

/**
 * Serialize Stripe's PaymentOptionDisplayData into a WritableMap
 * that can be sent over the RN bridge.
 */
fun EmbeddedPaymentElement.PaymentOptionDisplayData.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("label", label)
    putString("paymentMethodType", paymentMethodType)
    putMap("billingDetails", mapFromPaymentSheetBillingDetails(billingDetails))

    // Direct access to imageLoader and call it synchronously with timeout
    val imageBase64 =
      try {
        // Load synchronously with 5 second timeout
        val drawable =
          kotlinx.coroutines.runBlocking {
            withTimeout(5000L) {
              imageLoader()
            }
          }

        getBitmapFromDrawable(drawable)?.let { bitmap ->
          getBase64FromBitmap(bitmap)
        } ?: ""
      } catch (e: Exception) {
        // If imageLoader fails or times out, return empty string
        ""
      }
    putString("image", imageBase64)
  }
