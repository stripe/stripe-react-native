package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CancellationException
import org.junit.Assert.assertEquals
import org.junit.Test

class CheckoutErrorMapperTest {
  @Test
  fun `maps reviewed controller state errors`() {
    assertEquals(
      CheckoutBridgeErrorCode.SessionNotOpen,
      CheckoutErrorMapper.code(IllegalStateException("Cannot mutate checkout session before it is configured.")),
    )
    assertEquals(
      CheckoutBridgeErrorCode.SheetCurrentlyPresented,
      CheckoutErrorMapper.code(
        IllegalStateException("Cannot mutate checkout session while a payment flow is presented."),
      ),
    )
    assertEquals(
      CheckoutBridgeErrorCode.Canceled,
      CheckoutErrorMapper.code(CancellationException("Canceled")),
    )
  }

  @Test
  fun `maps unknown errors to failed`() {
    assertEquals(
      CheckoutBridgeErrorCode.Failed,
      CheckoutErrorMapper.code(IllegalArgumentException("Unexpected")),
    )
  }
}
