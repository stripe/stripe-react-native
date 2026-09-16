package com.reactnativestripesdk

import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.contract.ApiTaskResult
import com.stripe.android.Stripe
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class GooglePayRequestHelperTest {
  @Test
  fun `native cancellation and errors settle the matching request`() {
    for ((status, expectedCode) in listOf(
      Status(CommonStatusCodes.CANCELED) to "Canceled",
      Status(CommonStatusCodes.ERROR, "Wallet error") to "Failed",
      Status(CommonStatusCodes.SUCCESS) to "Failed",
    )) {
      val promise = mock(Promise::class.java)
      GooglePayRequestHelper.handleGooglePaymentMethodResult(
        ApiTaskResult<PaymentData>(status),
        Stripe(ApplicationProvider.getApplicationContext(), "pk_test_example"),
        false,
        promise,
      )

      val result = ArgumentCaptor.forClass(Any::class.java)
      verify(promise).resolve(result.capture())
      val error = (result.value as WritableMap).getMap("error")!!
      assertEquals(expectedCode, error.getString("code"))
      if (status.statusCode == CommonStatusCodes.ERROR) {
        assertEquals("Wallet error", error.getString("message"))
      }
    }
  }
}
