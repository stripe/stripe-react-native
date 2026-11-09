package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Test

class CheckoutErrorMapperTest {
  @Test
  fun `timeout is distinct from cancellation`() = runBlocking {
    val error = runCatching {
      withTimeout(1) { delay(Long.MAX_VALUE) }
    }.exceptionOrNull()!!

    assertEquals("Timeout", checkoutErrorCode(error))
    assertEquals("Canceled", checkoutErrorCode(CancellationException()))
    assertEquals("Failed", checkoutErrorCode(IllegalStateException("Unexpected failure")))
  }
}
