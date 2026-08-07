package com.reactnativestripesdk

import android.annotation.SuppressLint
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.ConfirmSetupIntentParams
import com.stripe.android.model.PaymentMethod
import com.stripe.android.model.PaymentMethodOptionsParams
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@RunWith(RobolectricTestRunner::class)
class PaymentMethodCreateParamsFactoryTest {

  private val clientSecret = "pi_test_secret_fake"
  private val savedPaymentMethodId = "pm_test_fake"

  // ============================================
  // confirmPayment (PaymentIntent) + saved card
  // ============================================

  @Test
  fun createParams_userKey_paymentIntent_savedCard_setsMoto() {
    val factory = factoryWithSavedCard(publishableKey = "uk_test_abc123")

    val params = factory.createParams(clientSecret, PaymentMethod.Type.Card, isPaymentIntent = true)
    val confirmParams = params as ConfirmPaymentIntentParams
    val cardOptions = confirmParams.paymentMethodOptions as? PaymentMethodOptionsParams.Card

    assertNotNull("paymentMethodOptions should be set for uk_ key", cardOptions)
    assertEquals("moto should be true", true, cardOptions!!.toParamMap()["moto"])
    assertEquals(savedPaymentMethodId, confirmParams.paymentMethodId)
  }

  @Test
  fun createParams_publishableKey_paymentIntent_savedCard_doesNotSetMoto() {
    val factory = factoryWithSavedCard(publishableKey = "pk_test_abc123")

    val params = factory.createParams(clientSecret, PaymentMethod.Type.Card, isPaymentIntent = true)
    val confirmParams = params as ConfirmPaymentIntentParams

    // No options for pk_ key when no CVC
    assertNull("paymentMethodOptions should be null for pk_ key without CVC", confirmParams.paymentMethodOptions)
  }

  @Test
  fun createParams_userKey_paymentIntent_savedCard_withCvc_setsMotoAndPreservesCvc() {
    val factory = factoryWithSavedCard(publishableKey = "uk_test_abc123", cvc = "123")

    val params = factory.createParams(clientSecret, PaymentMethod.Type.Card, isPaymentIntent = true)
    val confirmParams = params as ConfirmPaymentIntentParams
    val cardOptions = confirmParams.paymentMethodOptions as? PaymentMethodOptionsParams.Card

    assertNotNull(cardOptions)
    val paramMap = cardOptions!!.toParamMap()
    assertEquals("moto should be true", true, paramMap["moto"])
    assertEquals("CVC should be preserved", "123", paramMap["cvc"])
  }

  @Test
  fun createParams_publishableKey_paymentIntent_savedCard_withCvc_setsOnlyCvc() {
    val factory = factoryWithSavedCard(publishableKey = "pk_test_abc123", cvc = "123")

    val params = factory.createParams(clientSecret, PaymentMethod.Type.Card, isPaymentIntent = true)
    val confirmParams = params as ConfirmPaymentIntentParams
    val cardOptions = confirmParams.paymentMethodOptions as? PaymentMethodOptionsParams.Card

    assertNotNull(cardOptions)
    val paramMap = cardOptions!!.toParamMap()
    assertNull("moto should not be set for pk_ key", paramMap["moto"])
    assertEquals("CVC should be set", "123", paramMap["cvc"])
  }

  // ============================================
  // confirmSetupIntent (SetupIntent) + saved card
  // ============================================

  @Test
  fun createParams_userKey_setupIntent_savedCard_setsMoto() {
    val factory = factoryWithSavedCard(publishableKey = "uk_test_abc123")

    val params = factory.createParams(clientSecret, PaymentMethod.Type.Card, isPaymentIntent = false)
    val confirmParams = params as ConfirmSetupIntentParams
    val cardOptions = confirmParams.paymentMethodOptions as? PaymentMethodOptionsParams.Card

    assertNotNull("paymentMethodOptions should be set for uk_ key", cardOptions)
    assertEquals("moto should be true", true, cardOptions!!.toParamMap()["moto"])
    assertEquals(savedPaymentMethodId, confirmParams.paymentMethodId)
  }

  @Test
  fun createParams_publishableKey_setupIntent_savedCard_doesNotSetMoto() {
    val factory = factoryWithSavedCard(publishableKey = "pk_test_abc123")

    val params = factory.createParams(clientSecret, PaymentMethod.Type.Card, isPaymentIntent = false)
    val confirmParams = params as ConfirmSetupIntentParams

    assertNull("paymentMethodOptions should be null for pk_ key without CVC", confirmParams.paymentMethodOptions)
  }

  // ============================================
  // Helpers
  // ============================================

  private fun factoryWithSavedCard(
    publishableKey: String,
    cvc: String? = null,
  ): PaymentMethodCreateParamsFactory {
    val pairs = mutableListOf<Pair<String, Any?>>("paymentMethodId" to savedPaymentMethodId)
    if (cvc != null) pairs.add("cvc" to cvc)
    return PaymentMethodCreateParamsFactory(
      paymentMethodData = readableMapOf(*pairs.toTypedArray()),
      options = readableMapOf(),
      cardFieldView = null,
      cardFormView = null,
      publishableKey = publishableKey,
    )
  }
}
