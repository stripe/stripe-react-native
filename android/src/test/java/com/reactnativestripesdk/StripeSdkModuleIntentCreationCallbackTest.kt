package com.reactnativestripesdk

import android.os.Looper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class StripeSdkModuleIntentCreationCallbackTest {
  @Test
  fun intentCreationResponseResolvesOnlyItsRequestAndAcknowledgesTheResponse() = runScenario {
    assertRoutesOnlyMatchingRequest(module::intentCreationCallback)
  }

  @Test
  fun confirmationTokenResponseResolvesOnlyItsRequestAndAcknowledgesTheResponse() = runScenario {
    assertRoutesOnlyMatchingRequest(module::confirmationTokenCreationCallback)
  }

  @Test
  fun responseWithoutRequestIdIsAcknowledgedWithoutCompletingPendingRequest() = runScenario {
    val pending = awaitResponse()
    val requestId = emitter.emitCalls.awaitItem().requestId

    module.intentCreationCallback(JavaOnlyMap.of("clientSecret", "pi_old_secret"), firstPromise)

    assertThat(firstPromise.resolveCalls.awaitItem().value).isNull()
    assertThat(pending.isCompleted).isFalse()

    module.intentCreationCallback(
      JavaOnlyMap.of("requestId", requestId, "clientSecret", "pi_current_secret"),
      secondPromise,
    )
    assertThat(pending.await().getString("clientSecret")).isEqualTo("pi_current_secret")
    assertThat(secondPromise.resolveCalls.awaitItem().value).isNull()
  }

  @Test
  fun unknownRequestIdIsAcknowledgedWithoutCompletingPendingRequest() = runScenario {
    val pending = awaitResponse()
    val requestId = emitter.emitCalls.awaitItem().requestId

    module.confirmationTokenCreationCallback(JavaOnlyMap.of("requestId", "unknown"), firstPromise)

    assertThat(firstPromise.resolveCalls.awaitItem().value).isNull()
    assertThat(pending.isCompleted).isFalse()

    module.confirmationTokenCreationCallback(
      JavaOnlyMap.of("requestId", requestId, "clientSecret", "pi_current_secret"),
      secondPromise,
    )
    assertThat(pending.await().getString("clientSecret")).isEqualTo("pi_current_secret")
    assertThat(secondPromise.resolveCalls.awaitItem().value).isNull()
  }

  @Test
  fun invalidationCancelsAllPendingRequests() = runScenario {
    val firstOwner = Job()
    val secondOwner = Job()
    val first = awaitResponse(firstOwner)
    val firstId = emitter.emitCalls.awaitItem().requestId
    val second = awaitResponse(secondOwner)
    val secondId = emitter.emitCalls.awaitItem().requestId
    assertThat(firstId).isNotEqualTo(secondId)
    assertThat(firstOwner.children.any()).isTrue()
    assertThat(secondOwner.children.any()).isTrue()

    module.invalidate()
    shadowOf(Looper.getMainLooper()).idle()

    assertCanceled { first.await() }
    assertCanceled { second.await() }
    assertThat(firstOwner.children.any()).isFalse()
    assertThat(secondOwner.children.any()).isFalse()
  }

  @Test
  fun lateResponseAfterInvalidationIsAcknowledged() = runScenario {
    val pending = awaitResponse()
    val requestId = emitter.emitCalls.awaitItem().requestId
    module.invalidate()
    shadowOf(Looper.getMainLooper()).idle()
    assertCanceled { pending.await() }

    module.intentCreationCallback(JavaOnlyMap.of("requestId", requestId), firstPromise)

    assertThat(firstPromise.resolveCalls.awaitItem().value).isNull()
  }

  @Test
  fun invalidatedModuleRejectsFutureRequestsWithoutEmitting() = runScenario {
    module.invalidate()
    shadowOf(Looper.getMainLooper()).idle()
    val owner = Job()

    assertCanceled {
      module.intentCreationCallbacks.awaitResult(owner, emitter)
    }

    emitter.emitCalls.expectNoEvents()
    assertThat(owner.children.any()).isFalse()
  }

  private suspend fun Scenario.assertRoutesOnlyMatchingRequest(callback: (ReadableMap, Promise) -> Unit) {
    val first = awaitResponse()
    val firstId = emitter.emitCalls.awaitItem().requestId
    val second = awaitResponse()
    val secondId = emitter.emitCalls.awaitItem().requestId
    assertThat(firstId).isNotEqualTo(secondId)

    callback(
      JavaOnlyMap.of("requestId", secondId, "clientSecret", "pi_second_secret"),
      secondPromise,
    )

    val secondResult = second.await()
    assertThat(secondResult.getString("requestId")).isEqualTo(secondId)
    assertThat(secondResult.getString("clientSecret")).isEqualTo("pi_second_secret")
    assertThat(first.isCompleted).isFalse()
    assertThat(secondPromise.resolveCalls.awaitItem().value).isNull()
    firstPromise.resolveCalls.expectNoEvents()

    callback(
      JavaOnlyMap.of("requestId", firstId, "clientSecret", "pi_first_secret"),
      firstPromise,
    )

    val firstResult = first.await()
    assertThat(firstResult.getString("requestId")).isEqualTo(firstId)
    assertThat(firstResult.getString("clientSecret")).isEqualTo("pi_first_secret")
    assertThat(firstPromise.resolveCalls.awaitItem().value).isNull()
  }

  private suspend fun assertCanceled(block: suspend () -> Unit) {
    val failure = runCatching { block() }.exceptionOrNull()
    assertThat(failure).isInstanceOf(CancellationException::class.java)
  }

  private fun runScenario(block: suspend Scenario.() -> Unit) = runTest {
    val emitter = FakeIntentCreationCallbackEmitter()
    val firstPromise = FakePromise()
    val secondPromise = FakePromise()
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val module = StripeSdkModule(context)

    Scenario(
      module = module,
      emitter = emitter,
      firstPromise = firstPromise,
      secondPromise = secondPromise,
      scope = this,
    ).apply { block() }

    emitter.ensureAllEventsConsumed()
    firstPromise.ensureAllEventsConsumed()
    secondPromise.ensureAllEventsConsumed()
  }

  private data class Scenario(
    val module: StripeSdkModule,
    val emitter: FakeIntentCreationCallbackEmitter,
    val firstPromise: FakePromise,
    val secondPromise: FakePromise,
    val scope: CoroutineScope,
  ) {
    fun awaitResponse(owner: Job = Job()): Deferred<ReadableMap> =
      scope.async(start = CoroutineStart.UNDISPATCHED) {
        module.intentCreationCallbacks.awaitResult(owner, emitter)
      }
  }
}
