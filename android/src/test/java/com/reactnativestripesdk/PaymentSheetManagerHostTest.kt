package com.reactnativestripesdk

import android.app.Activity
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.google.common.truth.Truth.assertThat
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentSheetResult
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
@OptIn(ReactNativeSdkInternal::class)
class PaymentSheetManagerHostTest {
  @Test
  fun reinitializingAfterHostReplacementRegistersResultsOnTheNewHost() = runScenario {
    manager.present(presentPromise)
    shadowOf(Looper.getMainLooper()).idle()
    val originalLaunch = requireNotNull(shadowOf(firstHost).nextStartedActivityForResult)
    assertThat(originalLaunch.intent.component?.className).isEqualTo(PAYMENT_SHEET_ACTIVITY)
    assertThat(
      firstHost.activityResultRegistry.dispatchResult(originalLaunch.requestCode, Activity.RESULT_CANCELED, null),
    ).isTrue()
    assertPresentationResultReceived()

    context.onHostPause()
    context.onHostDestroy()
    firstHostController.pause().stop().destroy()
    context.onHostResume(secondHost)

    manager.configure(arguments, initPromise)
    assertInitializationSucceeded()
    manager.present(presentPromise)
    shadowOf(Looper.getMainLooper()).idle()

    val replacementLaunch = requireNotNull(shadowOf(secondHost).nextStartedActivityForResult)
    assertThat(replacementLaunch.intent.component?.className).isEqualTo(PAYMENT_SHEET_ACTIVITY)
    assertThat(
      secondHost.activityResultRegistry.dispatchResult(replacementLaunch.requestCode, Activity.RESULT_CANCELED, null),
    ).isTrue()
    assertPresentationResultReceived()
  }

  @Test
  fun reinitializingOnTheSameHostPreservesThePendingPresentationResult() = runScenario {
    manager.present(presentPromise)
    shadowOf(Looper.getMainLooper()).idle()
    val launch = requireNotNull(shadowOf(firstHost).nextStartedActivityForResult)
    assertThat(launch.intent.component?.className).isEqualTo(PAYMENT_SHEET_ACTIVITY)
    presentPromise.resolveCalls.expectNoEvents()

    manager.configure(arguments, initPromise)
    assertInitializationSucceeded()
    presentPromise.resolveCalls.expectNoEvents()

    assertThat(
      firstHost.activityResultRegistry.dispatchResult(launch.requestCode, Activity.RESULT_CANCELED, null),
    ).isTrue()
    assertPresentationResultReceived()
    assertThat(shadowOf(firstHost).nextStartedActivityForResult).isNull()
  }

  @Test
  fun reinitializingWithoutAHostReturnsARetryableError() = runScenario {
    context.onHostPause()
    context.onHostDestroy()

    manager.configure(arguments, initPromise)

    val result = initPromise.resolveCalls.awaitItem().value as ReadableMap
    assertThat(result.getMap("error")?.getString("code")).isEqualTo("Failed")
    assertThat(result.getMap("error")?.getString("message"))
      .isEqualTo("Activity doesn't exist yet. You can safely retry this method.")
    assertThat(shadowOf(firstHost).nextStartedActivityForResult).isNull()
  }

  @Test
  fun olderCompletionResolvesOnlyItsOriginalPromiseWhileNewHostIsPresenting() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeSecondHost()
    val secondRequest = present(secondHost, secondPromise)

    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    assertSuccess(presentPromise)
    secondPromise.resolveCalls.expectNoEvents()
    assertThat(HeadlessJsTaskContext.getInstance(context).hasActiveTasks()).isTrue()

    dispatch(secondHost, secondRequest, PaymentSheetTestResults.canceled())
    assertError(secondPromise, "Canceled")
    assertThat(HeadlessJsTaskContext.getInstance(context).hasActiveTasks()).isFalse()
  }

  @Test
  fun newerResultCanArriveBeforeTheRetainedOlderResult() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeSecondHost()
    val secondRequest = present(secondHost, secondPromise)

    dispatch(secondHost, secondRequest, PaymentSheetTestResults.completed())
    assertSuccess(secondPromise)
    presentPromise.resolveCalls.expectNoEvents()
    dispatch(firstHost, firstRequest, PaymentSheetTestResults.failed(IllegalStateException("original failure")))
    val result = assertError(presentPromise, "Failed")
    assertThat(result.getMap("error")?.getString("message")).isEqualTo("original failure")
  }

  @Test
  fun destroyingOlderHostReportsUnknownOutcomeWithoutUnregisteringNewHost() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeSecondHost()
    val secondRequest = present(secondHost, secondPromise)

    firstHostController.pause().stop().destroy()
    val result = assertError(presentPromise, "Failed")
    assertThat(result.getMap("error")?.getString("message")).contains("The payment may have completed")
    secondPromise.resolveCalls.expectNoEvents()

    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    presentPromise.resolveCalls.expectNoEvents()
    dispatch(secondHost, secondRequest, PaymentSheetTestResults.completed())
    assertSuccess(secondPromise)
  }

  @Test
  fun stoppingHostDoesNotDisposeItsPendingResult() = runScenario {
    val request = present(firstHost, presentPromise)
    firstHostController.pause().stop()
    dispatch(firstHost, request, PaymentSheetTestResults.completed())
    assertSuccess(presentPromise)
    firstHostController.start().resume()
  }

  @Test
  fun returningToBusyOriginalHostDoesNotReplaceItsPromise() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeSecondHost()
    val secondRequest = present(secondHost, secondPromise)
    context.onHostResume(firstHost)
    manager.configure(arguments, initPromise)
    assertInitializationSucceeded()
    manager.present(extraPromise)
    shadowOf(Looper.getMainLooper()).idle()
    assertError(extraPromise, "Failed")
    assertThat(shadowOf(firstHost).nextStartedActivityForResult).isNull()

    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    assertSuccess(presentPromise)
    dispatch(secondHost, secondRequest, PaymentSheetTestResults.canceled())
    assertError(secondPromise, "Canceled")
  }

  @Test
  fun sameHostCanPresentAgainAfterItsNativeResultArrives() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    assertSuccess(presentPromise)
    val secondRequest = present(firstHost, secondPromise)
    dispatch(firstHost, secondRequest, PaymentSheetTestResults.canceled())
    assertError(secondPromise, "Canceled")
  }

  @Test
  fun receivedCompletionSurvivesHostDestructionWhileWaitingForAnotherHost() = runScenario {
    val request = present(firstHost, presentPromise)
    context.onHostPause()
    context.onHostDestroy()
    dispatch(firstHost, request, PaymentSheetTestResults.completed())
    presentPromise.resolveCalls.expectNoEvents()

    firstHostController.pause().stop().destroy()
    context.onHostDestroy()
    presentPromise.resolveCalls.expectNoEvents()
    context.onHostResume(secondHost)
    shadowOf(Looper.getMainLooper()).idle()
    assertSuccess(presentPromise)
  }

  @Test
  fun disposingManagerCancelsReceivedResultsWaitingForAnotherHost() = runScenario {
    val request = present(firstHost, presentPromise)
    context.onHostPause()
    context.onHostDestroy()
    dispatch(firstHost, request, PaymentSheetTestResults.completed())
    presentPromise.resolveCalls.expectNoEvents()

    manager.destroy()
    shadowOf(Looper.getMainLooper()).idle()
    context.onHostResume(secondHost)
    shadowOf(Looper.getMainLooper()).idle()
    presentPromise.resolveCalls.expectNoEvents()
  }

  @Test
  fun disposingManagerReleasesBothPresentationsAndIgnoresLateResults() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeSecondHost()
    val secondRequest = present(secondHost, secondPromise)
    assertThat(HeadlessJsTaskContext.getInstance(context).hasActiveTasks()).isTrue()

    manager.destroy()
    shadowOf(Looper.getMainLooper()).idle()
    assertThat(HeadlessJsTaskContext.getInstance(context).hasActiveTasks()).isFalse()
    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    dispatch(secondHost, secondRequest, PaymentSheetTestResults.completed())
    presentPromise.resolveCalls.expectNoEvents()
    secondPromise.resolveCalls.expectNoEvents()
  }

  @Test
  fun initializingWithAnAlreadyDestroyedHostReturnsAnError() = runScenario {
    firstHostController.pause().stop().destroy()
    manager.configure(arguments, initPromise)
    assertError(initPromise, "Failed")
  }

  @Test
  fun customFlowPresentationFailureDoesNotConsumeTheOlderHostsPromise() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeUnconfiguredCustomFlowOnSecondHost()
    manager.present(secondPromise)
    shadowOf(Looper.getMainLooper()).idle()
    assertError(secondPromise, "Failed")
    presentPromise.resolveCalls.expectNoEvents()

    manager.present(extraPromise)
    shadowOf(Looper.getMainLooper()).idle()
    val retry = assertError(extraPromise, "Failed")
    assertThat(retry.getMap("error")?.getString("message")).doesNotContain("already presenting")
    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    assertSuccess(presentPromise)
  }

  @Test
  fun customFlowConfirmationFailureDoesNotConsumeTheOlderHostsPromise() = runScenario {
    val firstRequest = present(firstHost, presentPromise)
    initializeUnconfiguredCustomFlowOnSecondHost()
    manager.confirmPayment(secondPromise)
    shadowOf(Looper.getMainLooper()).idle()
    assertError(secondPromise, "Failed")
    presentPromise.resolveCalls.expectNoEvents()

    dispatch(firstHost, firstRequest, PaymentSheetTestResults.completed())
    assertSuccess(presentPromise)
  }

  private fun runScenario(block: suspend Scenario.() -> Unit) = runTest {
    val firstHostController = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val secondHostController = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val initPromise = FakePromise()
    val presentPromise = FakePromise()
    val secondPromise = FakePromise()
    val extraPromise = FakePromise()
    val arguments = JavaOnlyMap.of(
      "merchantDisplayName", "Host replacement test",
      "paymentIntentClientSecret", "pi_test_secret_test",
    )
    val manager = PaymentSheetManager(context, arguments, initPromise)
    val advancedFraudSignalsEnabled = Stripe.advancedFraudSignalsEnabled

    try {
      Stripe.advancedFraudSignalsEnabled = false
      PaymentConfiguration.init(context, "pk_test_host_replacement")
      context.onHostResume(firstHostController.get())
      manager.create()
      shadowOf(Looper.getMainLooper()).idle()

      Scenario(
        manager = manager,
        context = context,
        arguments = arguments,
        firstHostController = firstHostController,
        secondHost = secondHostController.get(),
        initPromise = initPromise,
        presentPromise = presentPromise,
        secondPromise = secondPromise,
        extraPromise = extraPromise,
      ).apply {
        assertInitializationSucceeded()
        block()
      }
    } finally {
      manager.destroy()
      shadowOf(Looper.getMainLooper()).idle()
      context.onHostPause()
      context.onHostDestroy()
      context.destroy()
      if (!firstHostController.get().isDestroyed) {
        firstHostController.pause().stop().destroy()
      }
      secondHostController.pause().stop().destroy()
      Stripe.advancedFraudSignalsEnabled = advancedFraudSignalsEnabled
    }

    initPromise.ensureAllEventsConsumed()
    presentPromise.ensureAllEventsConsumed()
    secondPromise.ensureAllEventsConsumed()
    extraPromise.ensureAllEventsConsumed()
  }

  private data class Scenario(
    val manager: PaymentSheetManager,
    val context: BridgeReactContext,
    val arguments: ReadableMap,
    val firstHostController: ActivityController<FragmentActivity>,
    val secondHost: FragmentActivity,
    val initPromise: FakePromise,
    val presentPromise: FakePromise,
    val secondPromise: FakePromise,
    val extraPromise: FakePromise,
  ) {
    val firstHost: FragmentActivity
      get() = firstHostController.get()

    fun present(host: FragmentActivity, promise: FakePromise): Int {
      manager.present(promise)
      shadowOf(Looper.getMainLooper()).idle()
      val launch = requireNotNull(shadowOf(host).nextStartedActivityForResult)
      assertThat(launch.intent.component?.className).isEqualTo(PAYMENT_SHEET_ACTIVITY)
      promise.resolveCalls.expectNoEvents()
      return launch.requestCode
    }

    fun dispatch(host: FragmentActivity, request: Int, result: PaymentSheetResult) {
      host.activityResultRegistry.dispatchResult(request, result)
      shadowOf(Looper.getMainLooper()).idle()
    }

    suspend fun initializeUnconfiguredCustomFlowOnSecondHost() {
      context.onHostResume(secondHost)
      manager.configure(JavaOnlyMap.of("merchantDisplayName", "Custom flow", "customFlow", true), initPromise)
      assertError(initPromise, "Failed")
    }

    suspend fun initializeSecondHost() {
      context.onHostResume(secondHost)
      manager.configure(arguments, initPromise)
      assertInitializationSucceeded()
    }

    suspend fun assertSuccess(promise: FakePromise) {
      val result = promise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.hasKey("error")).isFalse()
    }

    suspend fun assertError(promise: FakePromise, code: String): ReadableMap {
      val result = promise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.getMap("error")?.getString("code")).isEqualTo(code)
      return result
    }

    suspend fun assertInitializationSucceeded() {
      val result = initPromise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.hasKey("error")).isFalse()
    }

    suspend fun assertPresentationResultReceived() {
      // A null result Intent produces a parse error. Receiving that error proves the real
      // Activity-result registration still delivers its result to the presentation promise.
      val result = presentPromise.resolveCalls.awaitItem().value as ReadableMap
      assertThat(result.getMap("error")?.getString("code")).isEqualTo("Failed")
      assertThat(result.getMap("error")?.getString("message"))
        .isEqualTo("Failed to retrieve a PaymentSheetResult.")
    }
  }

  private companion object {
    const val PAYMENT_SHEET_ACTIVITY = "com.stripe.android.paymentsheet.PaymentSheetActivity"
  }
}
