package com.reactnativestripesdk.checkout

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckoutServerUpdateCallbacksTest {
  @Test
  fun `completions are isolated and duplicate or unknown completions are ignored`() = runTest {
    val firstController = CheckoutServerUpdateCallbacks()
    val secondController = CheckoutServerUpdateCallbacks()
    val first = async { firstController.request("first") {} }
    val second = async { secondController.request("second") {} }
    runCurrent()
    firstController.complete("second", null)
    assertFalse(second.isCompleted)
    firstController.complete("first", null)
    firstController.complete("first", "late error")
    assertTrue(first.await().isSuccess)
    assertFalse(second.isCompleted)
    secondController.complete("second", null)
    assertTrue(second.await().isSuccess)
  }

  @Test
  fun `callback errors reach native`() = runTest {
    val callbacks = CheckoutServerUpdateCallbacks()
    val error = runCatching {
      callbacks.request("operation") { callbacks.complete("operation", "Server failed") }
    }.exceptionOrNull()
    assertEquals("Server failed", error?.message)
  }

  @Test
  fun `timeout and destruction release pending callbacks`() = runTest {
    val callbacks = CheckoutServerUpdateCallbacks()
    val timedOut = runCatching { withTimeout(20) { callbacks.request("timeout") {} } }
    assertTrue(timedOut.exceptionOrNull() is CancellationException)
    val destroyed = async { callbacks.request("destroyed") {} }
    runCurrent()
    destroyed.cancelAndJoin()
    callbacks.complete("timeout", null)
    callbacks.complete("destroyed", null)
    assertTrue(destroyed.isCancelled)
    assertTrue(callbacks.request("next") { callbacks.complete("next", null) }.isSuccess)
  }
}
