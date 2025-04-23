import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi

/**
 * Serialize Stripe's PaymentOptionDisplayData into a WritableMap
 * that can be sent over the RN bridge.
 */
@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
fun EmbeddedPaymentElement.PaymentOptionDisplayData.toWritableMap(): WritableMap {
  val map = Arguments.createMap()

  map.putString("label", label)
  map.putString("paymentMethodType", paymentMethodType)

  val billingMap = Arguments.createMap()
  billingDetails?.let { bd ->
    bd.name?.let { billingMap.putString("name", it) }
    bd.email?.let { billingMap.putString("email", it) }
    bd.phone?.let { billingMap.putString("phone", it) }

    bd.address?.let { addr ->
      Arguments
        .createMap()
        .apply {
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
