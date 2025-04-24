import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.mapFromPaymentSheetBillingDetails
import com.stripe.android.paymentelement.EmbeddedPaymentElement
import com.stripe.android.paymentelement.ExperimentalEmbeddedPaymentElementApi

/**
 * Serialize Stripe's PaymentOptionDisplayData into a WritableMap
 * that can be sent over the RN bridge.
 */
@OptIn(ExperimentalEmbeddedPaymentElementApi::class)
fun EmbeddedPaymentElement.PaymentOptionDisplayData.toWritableMap(): WritableMap =
  Arguments.createMap().apply {
    putString("label", label)
    putString("paymentMethodType", paymentMethodType)
    putMap("billingDetails", mapFromPaymentSheetBillingDetails(billingDetails))
  }
