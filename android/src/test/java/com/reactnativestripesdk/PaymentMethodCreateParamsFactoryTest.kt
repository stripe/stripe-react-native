package com.reactnativestripesdk

import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.PaymentMethod
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PaymentMethodCreateParamsFactoryTest {
  @Test
  fun createPaymentMethodParams_cardToken_includesMetadata() {
    val factory =
      PaymentMethodCreateParamsFactory(
        paymentMethodData =
          readableMapOf(
            "token" to "tok_visa",
            "metadata" to readableMapOf("order_id" to "1234"),
          ),
        options = null,
        cardFieldView = null,
        cardFormView = null,
      )

    val params = factory.createPaymentMethodParams(PaymentMethod.Type.Card)

    @Suppress("UNCHECKED_CAST")
    val metadata = params.toParamMap()["metadata"] as? Map<String, String>

    assertEquals(mapOf("order_id" to "1234"), metadata)
  }

  @Test
  fun createParams_cardTokenConfirm_includesMetadata() {
    val factory =
      PaymentMethodCreateParamsFactory(
        paymentMethodData =
          readableMapOf(
            "token" to "tok_visa",
            "metadata" to readableMapOf("order_id" to "1234"),
          ),
        options = null,
        cardFieldView = null,
        cardFormView = null,
      )

    val confirmParams =
      factory.createParams(
        clientSecret = "pi_test_secret_test",
        paymentMethodType = PaymentMethod.Type.Card,
        isPaymentIntent = true,
      ) as ConfirmPaymentIntentParams

    val createParams = confirmParams.paymentMethodCreateParams
    assertNotNull(createParams)

    @Suppress("UNCHECKED_CAST")
    val metadata = createParams!!.toParamMap()["metadata"] as? Map<String, String>

    assertEquals(mapOf("order_id" to "1234"), metadata)
  }
}
