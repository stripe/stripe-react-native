package com.reactnativestripesdk

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class IntentCreationCallbackRegistryTest {
  @Test
  fun `responses for different owners can complete out of order`() = runScenario {
    val first = awaitResult()
    val firstId = awaitEmission()
    val second = awaitResult(otherOwner)
    val secondId = awaitEmission()

    registry.complete(secondId, result("pi_second_secret"))

    assertThat(second.await().getString("clientSecret")).isEqualTo("pi_second_secret")
    assertThat(first.isCompleted).isFalse()

    registry.complete(firstId, result("pi_first_secret"))

    assertThat(first.await().getString("clientSecret")).isEqualTo("pi_first_secret")
    assertThat(owner.children.any()).isFalse()
    assertThat(otherOwner.children.any()).isFalse()
  }

  @Test
  fun `overlapping requests from one owner have distinct identifiers`() = runScenario {
    val first = awaitResult()
    val firstId = awaitEmission()
    val second = awaitResult()
    val secondId = awaitEmission()

    assertThat(firstId).isNotEmpty()
    assertThat(secondId).isNotEqualTo(firstId)

    registry.complete(secondId, result("pi_second_secret"))

    assertThat(second.await().getString("clientSecret")).isEqualTo("pi_second_secret")
    assertThat(first.isCompleted).isFalse()

    registry.complete(firstId, result("pi_first_secret"))

    assertThat(first.await().getString("clientSecret")).isEqualTo("pi_first_secret")
  }

  @Test
  fun `a response without an identifier leaves the pending request untouched`() = runScenario {
    val pending = awaitResult()
    awaitEmission()

    registry.complete(null, result("pi_unrelated_secret"))
    runCurrent()

    assertThat(pending.isCompleted).isFalse()
  }

  @Test
  fun `a response with an unknown identifier leaves the pending request untouched`() = runScenario {
    val pending = awaitResult()
    val requestId = awaitEmission()
    assertThat(requestId).isNotEqualTo("unknown")

    registry.complete("unknown", result("pi_unrelated_secret"))
    runCurrent()

    assertThat(pending.isCompleted).isFalse()
  }

  @Test
  fun `a duplicate response cannot complete another request`() = runScenario {
    val first = awaitResult()
    val firstId = awaitEmission()
    registry.complete(firstId, result("pi_first_secret"))
    assertThat(first.await().getString("clientSecret")).isEqualTo("pi_first_secret")
    val second = awaitResult()
    val secondId = awaitEmission()

    registry.complete(firstId, result("pi_duplicate_secret"))
    runCurrent()

    assertThat(second.isCompleted).isFalse()

    registry.complete(secondId, result("pi_second_secret"))

    assertThat(second.await().getString("clientSecret")).isEqualTo("pi_second_secret")
  }

  @Test
  fun `canceling an owner rejects its late response without canceling another owner`() = runScenario {
    val first = awaitResult()
    val firstId = awaitEmission()
    val second = awaitResult(otherOwner)
    val secondId = awaitEmission()

    owner.cancel()
    assertCanceled { first.await() }
    registry.complete(firstId, result("pi_old_secret"))
    runCurrent()

    assertThat(second.isCompleted).isFalse()
    assertThat(owner.children.any()).isFalse()
    assertThat(otherOwner.isActive).isTrue()

    registry.complete(secondId, result("pi_current_secret"))

    assertThat(second.await().getString("clientSecret")).isEqualTo("pi_current_secret")
  }

  @Test
  fun `a canceled owner cannot emit a new request`() = runScenario {
    owner.cancel()

    assertCanceled { registry.awaitResult(owner, emitter) }

    emitter.emitCalls.expectNoEvents()
    assertThat(owner.children.any()).isFalse()
  }

  @Test
  fun `caller cancellation removes its request and leaves the owner usable`() = runScenario {
    val canceled = awaitResult()
    val canceledId = awaitEmission()
    assertThat(owner.children.any()).isTrue()

    canceled.cancelAndJoin()

    assertThat(owner.isActive).isTrue()
    assertThat(owner.children.any()).isFalse()

    val next = awaitResult()
    val nextId = awaitEmission()
    registry.complete(canceledId, result("pi_canceled_secret"))
    runCurrent()

    assertThat(next.isCompleted).isFalse()

    registry.complete(nextId, result("pi_next_secret"))

    assertThat(next.await().getString("clientSecret")).isEqualTo("pi_next_secret")
  }

  @Test
  fun `disposal cancels pending requests for every owner`() = runScenario {
    val first = awaitResult()
    awaitEmission()
    val second = awaitResult(otherOwner)
    awaitEmission()
    assertThat(first.isCompleted).isFalse()
    assertThat(second.isCompleted).isFalse()

    registry.dispose()

    assertCanceled { first.await() }
    assertCanceled { second.await() }
    assertThat(owner.isActive).isTrue()
    assertThat(otherOwner.isActive).isTrue()
    assertThat(owner.children.any()).isFalse()
    assertThat(otherOwner.children.any()).isFalse()
  }

  @Test
  fun `a disposed registry rejects future requests without emitting`() = runScenario {
    registry.dispose()

    assertCanceled { registry.awaitResult(owner, emitter) }

    emitter.emitCalls.expectNoEvents()
    assertThat(owner.children.any()).isFalse()
  }

  @Test
  fun `a throwing emitter removes its request and preserves the failure`() {
    val failure = IllegalStateException("Cannot emit")
    runScenario(onEmit = { _, _, _ -> throw failure }) {
      val caught = runCatching { registry.awaitResult(owner, emitter) }.exceptionOrNull()
      val requestId = awaitEmission()

      assertThat(caught).isSameInstanceAs(failure)
      assertThat(owner.isActive).isTrue()
      assertThat(owner.children.any()).isFalse()

      registry.complete(requestId, result("pi_late_secret"))

      assertThat(owner.children.any()).isFalse()
    }
  }

  @Test
  fun `a response can arrive synchronously while emitting`() =
    runScenario(onEmit = { registry, _, requestId -> registry.complete(requestId, result("pi_immediate_secret")) }) {
      val result = registry.awaitResult(owner, emitter)
      val requestId = awaitEmission()

      assertThat(requestId).isNotEmpty()
      assertThat(result.getString("clientSecret")).isEqualTo("pi_immediate_secret")
      assertThat(owner.children.any()).isFalse()
    }

  @Test
  fun `owner cancellation during emission does not leave a pending request`() =
    runScenario(onEmit = { _, owner, _ -> owner.cancel() }) {
      assertCanceled { registry.awaitResult(owner, emitter) }
      val requestId = awaitEmission()

      registry.complete(requestId, result("pi_late_secret"))

      assertThat(owner.children.any()).isFalse()
    }

  private fun result(clientSecret: String): ReadableMap = JavaOnlyMap.of("clientSecret", clientSecret)

  private suspend fun assertCanceled(block: suspend () -> Unit) {
    val failure = runCatching { block() }.exceptionOrNull()
    assertThat(failure).isInstanceOf(CancellationException::class.java)
  }

  private fun runScenario(
    onEmit: (IntentCreationCallbackRegistry, Job, String) -> Unit = { _, _, _ -> },
    block: suspend Scenario.() -> Unit,
  ) = runTest {
    val registry = IntentCreationCallbackRegistry()
    val owner = Job()
    val otherOwner = Job()
    val emitter = FakeIntentCreationCallbackEmitter { requestId -> onEmit(registry, owner, requestId) }
    try {
      Scenario(registry, owner, otherOwner, emitter, this).block()
    } finally {
      registry.dispose()
      owner.cancel()
      otherOwner.cancel()
      testScheduler.runCurrent()
      emitter.ensureAllEventsConsumed()
    }
  }

  private class Scenario(
    val registry: IntentCreationCallbackRegistry,
    val owner: Job,
    val otherOwner: Job,
    val emitter: FakeIntentCreationCallbackEmitter,
    private val testScope: TestScope,
  ) {
    fun awaitResult(requestOwner: Job = owner): Deferred<ReadableMap> =
      testScope.async { registry.awaitResult(requestOwner, emitter) }

    suspend fun awaitEmission(): String {
      runCurrent()
      return emitter.emitCalls.awaitItem().requestId
    }

    fun runCurrent() {
      testScope.testScheduler.runCurrent()
    }
  }
}
