package com.reactnativestripesdk.pushprovisioning

import android.os.Bundle
import androidx.core.os.bundleOf
import com.reactnativestripesdk.PaymentSheetFragment
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert
import org.junit.Test

class PaymentSheetFragmentTest {

  @Test
  fun buildGooglePayConfig() {
    val config = PaymentSheetFragment.buildGooglePayConfig(
      bundleOf(
        "merchantCountryCode" to "US",
        "currencyCode" to "USD",
        "testEnv" to true
      )
    )
    Assert.assertEquals(
      config,
      PaymentSheet.GooglePayConfiguration(
        environment = PaymentSheet.GooglePayConfiguration.Environment.Test,
        countryCode = "US",
        currencyCode = "USD"
      )
    )
  }

  @Test
  fun buildGooglePayConfig_returnsNull() {
    val config = PaymentSheetFragment.buildGooglePayConfig(
      null
    )
    Assert.assertNull(config)
  }

  @Test
  fun buildGooglePayConfig_defaultsToCorrectValues() {
    val config = PaymentSheetFragment.buildGooglePayConfig(
      Bundle.EMPTY
    )
    Assert.assertEquals(
      config,
      PaymentSheet.GooglePayConfiguration(
        environment = PaymentSheet.GooglePayConfiguration.Environment.Production,
        countryCode = "",
        currencyCode = ""
      )
    )
  }
}
