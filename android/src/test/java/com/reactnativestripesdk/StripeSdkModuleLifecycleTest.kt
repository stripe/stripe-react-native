package com.reactnativestripesdk

import android.app.Activity
import android.os.Bundle
import android.os.Looper
import com.facebook.react.ReactActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.google.common.truth.Truth.assertThat
import com.stripe.android.Stripe
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode
import org.robolectric.util.ReflectionHelpers
import org.robolectric.util.ReflectionHelpers.ClassParameter

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class StripeSdkModuleLifecycleTest {
  @Test
  fun initializingWithoutAnActivityRegistersTheRecreationCallback() = runScenario {
    val fixture = newModule()
    assertThat(fixture.context.currentActivity).isNull()
    fixture.initialize()

    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity).finish()
  }

  @Test
  fun reinitializingWithoutAnActivityKeepsASingleRegistration() = runScenario {
    val fixture = newModule(reactActivity())
    fixture.initialize()
    fixture.clearHost()

    fixture.initialize()
    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity).finish()
  }

  @Test
  fun invalidatingWithoutAnActivityUnregistersTheCallback() = runScenario {
    val fixture = newModule(reactActivity())
    fixture.initialize()
    fixture.clearHost()

    fixture.module.invalidate()
    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity, never()).finish()
  }

  @Test
  fun invalidatedModuleCannotFinishTheReplacementModulesStripeActivity() = runScenario {
    val originalHost = reactActivity()
    val original = newModule(originalHost)
    original.initialize()
    original.module.invalidate()
    original.clearHost()

    val replacement = newModule(originalHost)
    replacement.initialize()
    replacement.clearHost()
    val restoredHost = reactActivity()
    dispatchCreated(restoredHost, Bundle())
    replacement.context.onHostResume(restoredHost)
    replacement.initialize()

    val stripeActivity = stripeActivity()
    dispatchCreated(stripeActivity)

    verify(stripeActivity, never()).finish()
  }

  @Test
  fun activeModuleStillFinishesStripeActivitiesAfterHostRecreation() = runScenario {
    newModule(reactActivity()).initialize()

    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity).finish()
  }

  @Test
  fun firstHostCreationDoesNotFinishStripeActivities() = runScenario {
    newModule(reactActivity()).initialize()

    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity())
    dispatchCreated(stripeActivity)

    verify(stripeActivity, never()).finish()
  }

  private fun runScenario(block: Scenario.() -> Unit) {
    val scenario = Scenario()
    val advancedFraudSignalsEnabled = Stripe.advancedFraudSignalsEnabled
    try {
      Stripe.advancedFraudSignalsEnabled = false
      scenario.block()
    } finally {
      try {
        scenario.destroy()
      } finally {
        Stripe.advancedFraudSignalsEnabled = advancedFraudSignalsEnabled
      }
    }
  }

  private class Scenario {
    private val application = RuntimeEnvironment.getApplication()
    private val fixtures = mutableListOf<ModuleFixture>()

    fun newModule(host: ReactActivity? = null): ModuleFixture {
      val context = BridgeReactContext(application)
      return ModuleFixture(context, StripeSdkModule(context)).also {
        fixtures.add(it)
        host?.let(context::onHostResume)
      }
    }

    fun reactActivity() = mock(ReactActivity::class.java).apply {
      `when`(this.application).thenReturn(this@Scenario.application)
    }

    fun stripeActivity(): Activity = mock(
      Class.forName("com.stripe.android.paymentsheet.PaymentSheetActivity").asSubclass(Activity::class.java),
    )

    fun dispatchCreated(activity: Activity, savedInstanceState: Bundle? = null) {
      ReflectionHelpers.callInstanceMethod<Unit>(
        application,
        "dispatchActivityCreated",
        ClassParameter.from(Activity::class.java, activity),
        ClassParameter.from(Bundle::class.java, savedInstanceState),
      )
    }

    fun destroy() {
      fixtures.forEach { it.module.invalidate() }
      shadowOf(Looper.getMainLooper()).idle()
      fixtures.forEach {
        it.clearHost()
        it.context.destroy()
      }
    }
  }

  private class ModuleFixture(
    val context: BridgeReactContext,
    val module: StripeSdkModule,
  ) {
    fun initialize() {
      val promise = mock(Promise::class.java)
      module.initialise(
        JavaOnlyMap.of("publishableKey", "pk_test_lifecycle", "appInfo", JavaOnlyMap()),
        promise,
      )
      verify(promise).resolve(null)
    }

    fun clearHost() {
      context.onHostPause()
      context.onHostDestroy()
      assertThat(context.currentActivity).isNull()
    }
  }
}
