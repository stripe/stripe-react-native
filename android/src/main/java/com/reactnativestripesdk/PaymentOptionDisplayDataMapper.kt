import android.graphics.Bitmap
import android.util.Base64
import androidx.compose.ui.graphics.asAndroidBitmap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi
import java.io.ByteArrayOutputStream

/**
 * Serialize Stripe's PaymentOptionDisplayData into a WritableMap
 * that can be sent over the RN bridge.
 */
@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
fun EmbeddedPaymentElement.PaymentOptionDisplayData.toWritableMap(): WritableMap {
  val map = Arguments.createMap()

//  val imageBase64 = image
//    // if it's a Compose ImageBitmap, convert to Android Bitmap
//    ?.asAndroidBitmap()
//    ?.let { bmp: Bitmap ->
//      ByteArrayOutputStream().use {
//        bmp.compress(Bitmap.CompressFormat.PNG, 100, it)
//        Base64.encodeToString(it.toByteArray(), Base64.NO_WRAP)
//      }
//    } ?: ""
//  map.putString("image", imageBase64)

  // create a 1×1 black bitmap
  val bmp = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).apply {
    // fill it with solid black
    eraseColor(android.graphics.Color.BLACK)
  }

// encode to Base64 PNG
  val imageBase64 = ByteArrayOutputStream().use { stream ->
    bmp.compress(Bitmap.CompressFormat.PNG, 100, stream)
    Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
  }
  
  map.putString("image", imageBase64)


  map.putString("label", label)
  map.putString("paymentMethodType", paymentMethodType)

  val billingMap = Arguments.createMap()
  billingDetails?.let { bd ->
    bd.name?.let  { billingMap.putString("name", it) }
    bd.email?.let { billingMap.putString("email", it) }
    bd.phone?.let { billingMap.putString("phone", it) }

    bd.address?.let { addr ->
      Arguments.createMap().apply {
        putString("city", addr.city)
        putString("country", addr.country)
        putString("line1", addr.line1)
        putString("line2", addr.line2)
        putString("postalCode", addr.postalCode)
        putString("state", addr.state)
      }.also { billingMap.putMap("address", it) }
    }
  }
  map.putMap("billingDetails", billingMap)

  return map
}
