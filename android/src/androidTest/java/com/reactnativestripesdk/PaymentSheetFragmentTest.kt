package com.reactnativestripesdk.paymentsheet

import android.os.Bundle
import androidx.core.os.bundleOf
import com.reactnativestripesdk.PaymentSheetFragment
import com.reactnativestripesdk.utils.PaymentSheetException
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert
import org.junit.Test

class PaymentSheetFragmentTest {
  @Test
  fun hasNoArgsConstructor() {
    // This is just a type check to make sure to keep a no args constructor
    // so that when the fragment is re-created it doesn't crash.
    PaymentSheetFragment()
  }

  @Test
  fun buildGooglePayConfig() {
    val config =
      PaymentSheetFragment.buildGooglePayConfig(
        bundleOf(
          "merchantCountryCode" to "US",
          "currencyCode" to "USD",
          "testEnv" to true,
          "buttonType" to 4,
        ),
      )
    Assert.assertEquals(
      config,
      PaymentSheet.GooglePayConfiguration(
        environment = PaymentSheet.GooglePayConfiguration.Environment.Test,
        countryCode = "US",
        currencyCode = "USD",
        buttonType = PaymentSheet.GooglePayConfiguration.ButtonType.Donate,
      ),
    )
  }

  @Test
  fun buildGooglePayConfig_returnsNull() {
    val config = PaymentSheetFragment.buildGooglePayConfig(null)
    Assert.assertNull(config)
  }

  @Test
  fun buildGooglePayConfig_returnsNullForEmptyBundle() {
    val config = PaymentSheetFragment.buildGooglePayConfig(Bundle.EMPTY)
    Assert.assertNull(config)
  }

  @Test(expected = PaymentSheetException::class)
  fun buildGooglePayConfig_throwsExceptionWhenCurrencyCodeMissing() {
    PaymentSheetFragment.buildGooglePayConfig(
      bundleOf(
        "merchantCountryCode" to "US",
        "testEnv" to true,
        // Missing currencyCode
      ),
    )
  }

  @Test(expected = PaymentSheetException::class)
  fun buildGooglePayConfig_throwsExceptionWhenCurrencyCodeEmpty() {
    PaymentSheetFragment.buildGooglePayConfig(
      bundleOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "",
        "testEnv" to true,
      ),
    )
  }
}
