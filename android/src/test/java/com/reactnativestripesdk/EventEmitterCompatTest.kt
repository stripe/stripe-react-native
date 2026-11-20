package com.reactnativestripesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.common.truth.Truth.assertThat
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class EventEmitterCompatTest {
  @Test
  fun emitCheckoutControllerDidUpdate_skipsGetJsModuleWhenReactInstanceInactive() {
    val context = mock(ReactApplicationContext::class.java)
    `when`(context.hasActiveReactInstance()).thenReturn(false)

    EventEmitterCompat(context).emitCheckoutControllerDidUpdate(null)

    verify(context, never())
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
  }

  @Test
  fun emitCheckoutControllerDidUpdate_dropsJsModuleTeardownIllegalStateException() {
    val context = mock(ReactApplicationContext::class.java)
    `when`(context.hasActiveReactInstance()).thenReturn(true)
    `when`(
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java),
    ).thenThrow(
      IllegalStateException("Tried to access a JS module after the React instance was destroyed."),
    )

    EventEmitterCompat(context).emitCheckoutControllerDidUpdate(null)

    verify(context)
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
  }

  @Test
  fun emitCheckoutControllerDidUpdate_rethrowsJsModuleIllegalStateExceptionWithoutBridgePrefix() {
    val context = mock(ReactApplicationContext::class.java)
    `when`(context.hasActiveReactInstance()).thenReturn(true)
    val wrongPrefix =
      IllegalStateException("Bridge not ready: cannot access JS module registry yet")
    `when`(
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java),
    ).thenThrow(wrongPrefix)

    val thrown =
      assertThrows(IllegalStateException::class.java) {
        EventEmitterCompat(context).emitCheckoutControllerDidUpdate(null)
      }
    assertThat(thrown).isSameInstanceAs(wrongPrefix)
  }

  @Test
  fun emitCheckoutControllerDidUpdate_rethrowsUnrelatedIllegalStateException() {
    val context = mock(ReactApplicationContext::class.java)
    `when`(context.hasActiveReactInstance()).thenReturn(true)
    val unrelated = IllegalStateException("ReactContext has been already initialized")
    `when`(
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java),
    ).thenThrow(unrelated)

    val thrown =
      assertThrows(IllegalStateException::class.java) {
        EventEmitterCompat(context).emitCheckoutControllerDidUpdate(null)
      }
    assertThat(thrown).isSameInstanceAs(unrelated)
  }
}
