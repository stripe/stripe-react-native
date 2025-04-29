package com.reactnativestripesdk.mappers

import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.reactnativestripesdk.utils.createCanAddCardResult
import org.junit.Assert
import org.junit.Before
import org.junit.Test

class MappersTest {
  private val reactApplicationContext =
    BridgeReactContext(
      ApplicationProvider.getApplicationContext(),
    )

  @Before
  fun setup() {
    SoLoader.init(reactApplicationContext, OpenSourceMergedSoMapping)
  }

  @Test
  fun createCanAddCardResult_NoStatus() {
    val result =
      createCanAddCardResult(
        true,
        null,
        null,
      )
    Assert.assertNotNull(result.getMap("details"))
    Assert.assertNull(result.getMap("details")?.getString("status"))
    Assert.assertNull(result.getMap("details")?.getMap("token"))
    Assert.assertTrue(result.getBoolean("canAddCard"))
  }

  @Test
  fun createCanAddCardResult_WithToken() {
    val result =
      createCanAddCardResult(
        true,
        "CARD_ALREADY_EXISTS",
        WritableNativeMap().also { it.putString("key", "value") },
      )
    Assert.assertTrue(result.getBoolean("canAddCard"))
    val details = result.getMap("details")
    Assert.assertEquals(details?.getString("status"), "CARD_ALREADY_EXISTS")
    Assert.assertEquals(details?.getMap("token")?.getString("key"), "value")
  }

  @Test
  fun createCanAddCardResult_UnsupportedDevice() {
    val result =
      createCanAddCardResult(
        false,
        "UNSUPPORTED_DEVICE",
        null,
      )
    Assert.assertFalse(result.getBoolean("canAddCard"))
    val details = result.getMap("details")
    Assert.assertEquals(details?.getString("status"), "UNSUPPORTED_DEVICE")
    Assert.assertNull(details?.getMap("token"))
  }

  @Test
  fun createCanAddCardResult_MissingConfiguration() {
    val result =
      createCanAddCardResult(
        false,
        "MISSING_CONFIGURATION",
        null,
      )
    Assert.assertFalse(result.getBoolean("canAddCard"))
    val details = result.getMap("details")
    Assert.assertEquals(details?.getString("status"), "MISSING_CONFIGURATION")
    Assert.assertNull(details?.getMap("token"))
  }
}
