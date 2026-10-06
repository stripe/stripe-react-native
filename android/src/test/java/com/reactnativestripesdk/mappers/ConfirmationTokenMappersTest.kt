package com.reactnativestripesdk.mappers

import android.annotation.SuppressLint
import com.reactnativestripesdk.utils.mapFromConfirmationToken
import com.stripe.android.model.parsers.ConfirmationTokenJsonParser
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@SuppressLint("RestrictedApi")
@RunWith(RobolectricTestRunner::class)
class ConfirmationTokenMappersTest {
  @Test
  fun mapFromConfirmationToken_SetupFutureUsage_MatchesFutureUsageType() {
    val expectedValues =
      mapOf(
        "off_session" to "OffSession",
        "on_session" to "OnSession",
        "none" to "None",
      )

    expectedValues.forEach { (apiValue, expected) ->
      val result = mapFromConfirmationToken(confirmationToken(setupFutureUsage = apiValue))
      assertEquals(expected, result.getString("setupFutureUsage"))
    }
  }

  @Test
  fun mapFromConfirmationToken_NoSetupFutureUsage_ReturnsNull() {
    val result = mapFromConfirmationToken(confirmationToken(setupFutureUsage = null))
    assertNull(result.getString("setupFutureUsage"))
  }

  private fun confirmationToken(setupFutureUsage: String?) =
    requireNotNull(
      ConfirmationTokenJsonParser().parse(
        JSONObject()
          .put("id", "ctoken_123")
          .put("created", 1_700_000_000L)
          .put("livemode", false)
          .apply { setupFutureUsage?.let { put("setup_future_usage", it) } },
      ),
    )
}
