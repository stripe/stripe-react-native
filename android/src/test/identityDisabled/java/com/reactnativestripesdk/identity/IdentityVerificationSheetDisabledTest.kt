package com.reactnativestripesdk.identity

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class IdentityVerificationSheetDisabledTest {
  @Test
  fun `disabled Identity returns setup guidance without native dependency or activity access`() {
    val context = mock(ReactApplicationContext::class.java)
    val manager = IdentityVerificationSheetManager.create(context)
    val promise = mock(Promise::class.java)

    manager.present(JavaOnlyMap(), promise)
    manager.invalidate()

    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    verify(promise).resolve(captor.capture())
    val result = captor.value
    assertEquals("FlowFailed", result.getString("status"))
    val error = result.getMap("error")!!
    assertEquals("FlowFailed", error.getString("code"))
    assertTrue(error.getString("message")!!.contains("StripeSdk_includeIdentity=true"))
    assertTrue(error.getString("message")!!.contains("minSdkVersion to 24"))
    verifyNoInteractions(context)
    assertThrows(ClassNotFoundException::class.java) {
      Class.forName("com.stripe.android.identity.IdentityVerificationSheet")
    }
  }
}
