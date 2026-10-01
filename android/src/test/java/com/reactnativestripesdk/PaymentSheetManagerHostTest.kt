package com.reactnativestripesdk

import android.app.Activity
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReadableMap
import com.google.common.truth.Truth.assertThat
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
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

  private fun runScenario(block: suspend Scenario.() -> Unit) = runTest {
    val firstHostController = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val secondHostController = Robolectric.buildActivity(FragmentActivity::class.java).setup()
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    val initPromise = FakePromise()
    val presentPromise = FakePromise()
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
  }

  private data class Scenario(
    val manager: PaymentSheetManager,
    val context: BridgeReactContext,
    val arguments: ReadableMap,
    val firstHostController: ActivityController<FragmentActivity>,
    val secondHost: FragmentActivity,
    val initPromise: FakePromise,
    val presentPromise: FakePromise,
  ) {
    val firstHost: FragmentActivity
      get() = firstHostController.get()

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
