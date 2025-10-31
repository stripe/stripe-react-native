package com.reactnativestripesdk

import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.Assert
import org.junit.Before
import org.junit.Test

class PaymentSheetManagerTest {
  @Before
  fun setup() {
    SoLoader.init(ApplicationProvider.getApplicationContext(), OpenSourceMergedSoMapping)
  }

  @Test
  fun buildGooglePayConfig() {
    val config =
      PaymentSheetManager.buildGooglePayConfig(
        readableMapOf(
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
    val config = PaymentSheetManager.buildGooglePayConfig(null)
    Assert.assertNull(config)
  }

  @Test
  fun buildGooglePayConfig_returnsNullForEmptyBundle() {
    val config = PaymentSheetManager.buildGooglePayConfig(Arguments.createMap())
    Assert.assertNull(config)
  }
}
