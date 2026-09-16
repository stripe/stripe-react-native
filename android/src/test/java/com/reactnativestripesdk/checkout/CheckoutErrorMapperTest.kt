package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Test

class CheckoutErrorMapperTest {
  @Test
  fun `maps native exceptions by type without inferring state from messages`() = runTest {
    assertEquals(
      CheckoutBridgeErrorCode.Failed,
      CheckoutErrorMapper.code(IllegalStateException("Cannot mutate while a payment flow is presented.")),
    )
    assertEquals(CheckoutBridgeErrorCode.Canceled, CheckoutErrorMapper.code(CancellationException("Canceled")))
    val timeout = runCatching { withTimeout(1) { awaitCancellation() } }.exceptionOrNull()!!
    assertEquals(CheckoutBridgeErrorCode.Timeout, CheckoutErrorMapper.code(timeout))
  }
}
