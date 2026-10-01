package com.reactnativestripesdk

import android.app.Activity
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import app.cash.turbine.Turbine
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.ReadableMap
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.LooperMode
import java.time.Duration

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class PaymentSheetOperationTest {
  @Test
  fun completedResultWinsEvenWhenTheTimeoutAlreadyFired() = runScenario {
    startTimeout()
    val sheet = createSheet()
    expireTimeout()
    assertThat(sheet.isFinishing).isTrue()

    operation.complete(PaymentSheetTestResults.completed())
    val result = promise.resolveCalls.awaitItem().value as ReadableMap
    assertThat(result.hasKey("error")).isFalse()
  }

  @Test
  fun timeoutDoesNotRetargetToASubsequentlyCreatedSheet() = runScenario {
    startTimeout()
    val originalSheet = createSheet()
    val newerSheet = createSheet()
    expireTimeout()
    assertThat(originalSheet.isFinishing).isTrue()
    assertThat(newerSheet.isFinishing).isFalse()

    operation.complete(PaymentSheetTestResults.canceled())
    val result = promise.resolveCalls.awaitItem().value as ReadableMap
    assertThat(result.getMap("error")?.getString("code")).isEqualTo("Timeout")
  }

  @Test
  fun receivedResultCancelsTimeoutBeforeItCanFinishTheSheet() = runScenario {
    startTimeout()
    val sheet = createSheet()
    operation.complete(PaymentSheetTestResults.completed())
    promise.resolveCalls.awaitItem()
    expireTimeout()
    assertThat(sheet.isFinishing).isFalse()
  }

  @Test
  fun disposingCancelsTimeoutAndIgnoresLateCompletion() = runScenario {
    startTimeout()
    val sheet = createSheet()
    operation.dispose()
    operation.complete(PaymentSheetTestResults.completed())
    expireTimeout()
    assertThat(sheet.isFinishing).isFalse()
    promise.resolveCalls.expectNoEvents()
  }

  @Test
  fun resultIsDeliveredOnlyOnce() = runScenario {
    operation.complete(PaymentSheetTestResults.completed())
    operation.complete(PaymentSheetTestResults.canceled())
    val result = promise.resolveCalls.awaitItem().value as ReadableMap
    assertThat(result.hasKey("error")).isFalse()
    promise.resolveCalls.expectNoEvents()
  }

  @Test
  fun disposingCancelsPendingResultConversion() = runScenario {
    val conversion = Job()
    operation.processingJob = conversion
    operation.dispose()
    assertThat(conversion.isCancelled).isTrue()
    promise.resolveCalls.expectNoEvents()
  }

  private fun runScenario(block: suspend Scenario.() -> Unit) = runTest {
    val host = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    context.onHostResume(host.get())
    val promise = FakePromise()
    val finished = Turbine<PaymentSheetOperation>()
    val operation = PaymentSheetOperation(context, promise) { finished.add(it) }
    val scenario = Scenario(host.get(), operation, promise)
    try {
      scenario.block()
    } finally {
      operation.dispose()
      scenario.sheets.forEach { it.pause().stop().destroy() }
      context.onHostPause()
      context.onHostDestroy()
      context.destroy()
      host.pause().stop().destroy()
    }
    assertThat(finished.awaitItem()).isSameInstanceAs(operation)
    finished.ensureAllEventsConsumed()
    promise.ensureAllEventsConsumed()
  }

  private class Scenario(
    val host: FragmentActivity,
    val operation: PaymentSheetOperation,
    val promise: FakePromise,
  ) {
    val sheets = mutableListOf<ActivityController<Activity>>()

    fun startTimeout() {
      operation.start(host, 100, Activity::class.java.name)
    }

    fun createSheet(): Activity =
      Robolectric.buildActivity(Activity::class.java).setup().also { sheets.add(it) }.get()

    fun expireTimeout() {
      shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(100))
    }
  }
}
