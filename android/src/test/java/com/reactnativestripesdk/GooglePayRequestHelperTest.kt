package com.reactnativestripesdk

import android.app.Activity
import androidx.fragment.app.FragmentActivity
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.common.api.Status
import com.google.android.gms.tasks.Task
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.PaymentDataRequest
import com.google.android.gms.wallet.PaymentsClient
import com.google.android.gms.wallet.Wallet
import com.google.android.gms.wallet.WalletConstants
import com.google.android.gms.wallet.contract.ApiTaskResult
import com.stripe.android.GooglePayJsonFactory
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class GooglePayRequestHelperTest {
  @Test
  fun canceledResultResolvesCanceledError() {
    assertError(Status.RESULT_CANCELED, "Canceled", "The payment has been canceled")
  }

  @Test
  fun failedResultPreservesStatusMessage() {
    assertError(Status(8, "Wallet unavailable"), "Failed", "Wallet unavailable")
  }

  @Test
  fun failedResultWithoutMessageStillResolves() {
    assertError(Status(8), "Failed", "Google Pay failed.")
  }

  @Test
  fun successWithoutPaymentDataResolvesError() {
    assertError(Status.RESULT_SUCCESS, "Failed", "Google Pay returned no payment data.")
  }

  @Test
  fun successfulTokenResultPreservesTokenAndShippingContact() {
    val token = JSONObject()
      .put("id", "tok_google_pay")
      .put("type", "card")
      .put("created", 1234567890)
      .put("card", JSONObject().put("object", "card").put("last4", "4242").put("brand", "Visa"))
    val json = JSONObject()
      .put(
          "paymentMethodData",
          JSONObject()
        .put("info", JSONObject())
        .put("tokenizationData", JSONObject().put("token", token.toString()))
      )
      .put("shippingAddress", JSONObject().put("name", "Jenny Rosen").put("countryCode", "US"))
    val promise = mock(Promise::class.java)

    GooglePayRequestHelper.handleGooglePaymentMethodResult(
      ApiTaskResult(PaymentData.fromJson(json.toString()), Status.RESULT_SUCCESS),
      Stripe(ApplicationProvider.getApplicationContext(), "pk_test_google_pay"),
      true,
      promise,
    )

    val result = ArgumentCaptor.forClass(WritableMap::class.java)
    verify(promise).resolve(result.capture())
    assertEquals("tok_google_pay", result.value.getMap("token")!!.getString("id"))
    assertEquals("4242", result.value.getMap("token")!!.getMap("card")!!.getString("last4"))
    org.junit.Assert.assertNotNull(result.value.getMap("shippingContact"))
  }

  private fun assertError(status: Status, code: String, message: String) {
    for (forToken in listOf(false, true)) {
      val promise = mock(Promise::class.java)
      GooglePayRequestHelper.handleGooglePaymentMethodResult(
        ApiTaskResult<PaymentData>(status),
        Stripe(ApplicationProvider.getApplicationContext(), "pk_test_google_pay"),
        forToken,
        promise,
      )
      val result = ArgumentCaptor.forClass(WritableMap::class.java)
      verify(promise).resolve(result.capture())
      val error = result.value.getMap("error")!!
      assertEquals(code, error.getString("code"))
      assertEquals(message, error.getString("message"))
    }
  }

  @Test
  fun createPaymentRequestLoadsTheBuiltRequestIntoWallet() {
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    PaymentConfiguration.init(activity, "pk_test_google_pay")
    val environments =
      listOf(
        true to WalletConstants.ENVIRONMENT_TEST,
        false to WalletConstants.ENVIRONMENT_PRODUCTION,
      )
    for ((testEnv, environment) in environments) {
      val params =
        JavaOnlyMap.of(
          "testEnv",
          testEnv,
          "merchantCountryCode",
          "US",
          "currencyCode",
          "USD",
          "merchantName",
          "Example",
          "amount",
          1250,
          "label",
          "Total",
        )
      val client = mock(PaymentsClient::class.java)

      @Suppress("UNCHECKED_CAST")
      val task = mock(Task::class.java) as Task<PaymentData>
      `when`(client.loadPaymentData(any(PaymentDataRequest::class.java))).thenReturn(task)
      val request = ArgumentCaptor.forClass(PaymentDataRequest::class.java)
      val options = ArgumentCaptor.forClass(Wallet.WalletOptions::class.java)

      mockStatic(Wallet::class.java).use { wallet ->
        wallet
          .`when`<PaymentsClient> {
            Wallet.getPaymentsClient(any(Activity::class.java), any(Wallet.WalletOptions::class.java))
          }.thenReturn(client)
        GooglePayRequestHelper.createPaymentRequest(activity, GooglePayJsonFactory(activity), params)
        wallet.verify {
          Wallet.getPaymentsClient(any(Activity::class.java), options.capture())
        }
      }

      assertEquals(environment, options.value.environment)
      verify(client).loadPaymentData(request.capture())
      val json = JSONObject(request.value.toJson())
      assertEquals("Example", json.getJSONObject("merchantInfo").getString("merchantName"))
      val transactionInfo = json.getJSONObject("transactionInfo")
      assertEquals("US", transactionInfo.getString("countryCode"))
      assertEquals("USD", transactionInfo.getString("currencyCode"))
      assertEquals("12.50", transactionInfo.getString("totalPrice"))
      assertEquals("Total", transactionInfo.getString("totalPriceLabel"))
      assertEquals("CARD", json.getJSONArray("allowedPaymentMethods").getJSONObject(0).getString("type"))
    }
  }
}
