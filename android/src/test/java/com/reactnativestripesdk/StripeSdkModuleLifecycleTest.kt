package com.reactnativestripesdk

import android.app.Activity
import android.os.Bundle
import android.os.Looper
import android.view.View
import androidx.activity.ComponentActivity
import com.facebook.react.ReactActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.google.common.truth.Truth.assertThat
import com.reactnativestripesdk.checkout.NativeCheckoutControllerInstance
import com.reactnativestripesdk.checkout.checkoutSession
import com.stripe.android.Stripe
import com.stripe.android.checkout.CheckoutController
import com.stripe.android.checkout.CheckoutPresenter
import com.stripe.android.elements.ShippingAddressElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.testing.FakeStripeActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
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
    dispatchActivityCreated(reactActivity(), Bundle())
    dispatchActivityCreated(stripeActivity)

    stripeActivity.finishCalls.awaitItem()
  }

  @Test
  fun reinitializingWithoutAnActivityKeepsASingleRegistration() = runScenario {
    val fixture = newModule(reactActivity())
    fixture.initialize()
    fixture.clearHost()

    fixture.initialize()
    val stripeActivity = stripeActivity()
    dispatchActivityCreated(reactActivity(), Bundle())
    dispatchActivityCreated(stripeActivity)

    stripeActivity.finishCalls.awaitItem()
  }

  @Test
  fun invalidatingWithoutAnActivityUnregistersTheCallback() = runScenario {
    val fixture = newModule(reactActivity())
    fixture.initialize()
    fixture.clearHost()

    fixture.module.invalidate()
    val stripeActivity = stripeActivity()
    dispatchActivityCreated(reactActivity(), Bundle())
    dispatchActivityCreated(stripeActivity)

    stripeActivity.finishCalls.expectNoEvents()
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
    dispatchActivityCreated(restoredHost, Bundle())
    replacement.context.onHostResume(restoredHost)
    replacement.initialize()

    val stripeActivity = stripeActivity()
    dispatchActivityCreated(stripeActivity)

    stripeActivity.finishCalls.expectNoEvents()
  }

  @Test
  fun firstHostCreationDoesNotFinishStripeActivities() = runScenario {
    newModule(reactActivity()).initialize()

    val stripeActivity = stripeActivity()
    dispatchActivityCreated(reactActivity())
    dispatchActivityCreated(stripeActivity)

    stripeActivity.finishCalls.expectNoEvents()
  }

  @OptIn(CheckoutSessionPreview::class)
  @Test
  fun configuredCheckoutRebindsOnActivityCreationBeforeReactResumes() = runScenario {
    val initialHostActivityController = componentActivity().setup()
    val initialHost = initialHostActivityController.get()
    val fixture = newModule()
    fixture.context.onHostResume(initialHost)
    fixture.initialize()

    val controller = mock(CheckoutController::class.java)
    val initialPresenter = mock(CheckoutPresenter::class.java)
    val initialShippingAddressElement = mock(ShippingAddressElement::class.java)
    val replacementPresenter = mock(CheckoutPresenter::class.java)
    val replacementShippingAddressElement = mock(ShippingAddressElement::class.java)
    `when`(controller.createPresenter(initialHost)).thenReturn(initialPresenter)
    `when`(initialPresenter.shippingAddressElement()).thenReturn(initialShippingAddressElement)

    val controllerId = "checkout-controller"
    startConfiguredCheckout(fixture, controllerId, controller)

    val initialPresentPromise = mock(Promise::class.java)
    fixture.module.presentCheckoutShippingAddressElement(controllerId, initialPresentPromise)
    shadowOf(Looper.getMainLooper()).idle()
    verify(initialShippingAddressElement).present()
    verify(initialPresentPromise).resolve(null)

    val savedState = Bundle()
    initialHostActivityController.pause().saveInstanceState(savedState).stop().destroy()
    fixture.clearHost()
    val replacementActivityController = componentActivity()
    val replacementHost = replacementActivityController.get()
    `when`(controller.createPresenter(replacementHost)).thenReturn(replacementPresenter)
    `when`(replacementPresenter.shippingAddressElement()).thenReturn(replacementShippingAddressElement)

    replacementActivityController.create(savedState)

    assertThat(fixture.context.currentActivity).isNull()
    verify(controller, times(1)).createPresenter(replacementHost)
    verify(replacementPresenter, times(1)).shippingAddressElement()
    verify(replacementPresenter, never()).paymentElement()
    verify(replacementShippingAddressElement, never()).present()

    replacementActivityController.start().resume()
    fixture.context.onHostResume(replacementHost)
    verify(controller, times(1)).createPresenter(replacementHost)
    verify(replacementPresenter, times(1)).shippingAddressElement()

    fixture.module.invalidate()
    verify(controller, times(1)).destroy()
    assertThat(fixture.module.checkoutControllers).isEmpty()

    replacementActivityController.pause().stop().destroy()
  }

  private fun runScenario(block: suspend Scenario.() -> Unit) = runTest {
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
    scenario.ensureAllEventsConsumed()
  }

  private class Scenario {
    private val application = RuntimeEnvironment.getApplication()
    private val fixtures = mutableListOf<ModuleFixture>()
    private val stripeActivities = mutableListOf<FakeStripeActivity>()

    fun newModule(host: ReactActivity? = null): ModuleFixture {
      val context = BridgeReactContext(application)
      return ModuleFixture(context, StripeSdkModule(context)).also {
        fixtures.add(it)
        host?.let(context::onHostResume)
      }
    }

    fun componentActivity() = Robolectric.buildActivity(ComponentActivity::class.java)

    @OptIn(CheckoutSessionPreview::class)
    fun startConfiguredCheckout(
      fixture: ModuleFixture,
      controllerId: String,
      controller: CheckoutController,
    ) {
      `when`(controller.session).thenReturn(MutableStateFlow<CheckoutController.Session?>(checkoutSession()))
      `when`(controller.isUpdating).thenReturn(MutableStateFlow(false))
      fixture.module.checkoutControllers[controllerId] = NativeCheckoutControllerInstance(
        controller = controller,
        eventEmitter = mock(EventEmitterCompat::class.java),
        scope = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined),
        initialSession = JavaOnlyMap(),
        context = fixture.context,
        isShippingAddressElementConfigured = true,
      )
      fixture.module.checkoutControllers.getValue(controllerId).start(controllerId)
    }

    fun reactActivity(): ReactActivity = Robolectric.buildActivity(FakeReactActivity::class.java).get()

    fun stripeActivity() = FakeStripeActivity().also { stripeActivities.add(it) }

    fun dispatchActivityCreated(activity: Activity, savedInstanceState: Bundle? = null) {
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

    fun ensureAllEventsConsumed() {
      stripeActivities.forEach { it.finishCalls.ensureAllEventsConsumed() }
    }
  }

  private class ModuleFixture(
    val context: BridgeReactContext,
    val module: StripeSdkModule,
  ) {
    suspend fun initialize() {
      val promise = FakePromise()
      module.initialise(
        JavaOnlyMap.of("publishableKey", "pk_test_lifecycle", "appInfo", JavaOnlyMap()),
        promise,
      )
      assertThat(promise.resolveCalls.awaitItem().value).isNull()
      promise.ensureAllEventsConsumed()
    }

    fun clearHost() {
      context.onHostPause()
      context.onHostDestroy()
      assertThat(context.currentActivity).isNull()
    }
  }

  private class FakeReactActivity : ReactActivity() {
    // These callback tests do not mount React content or initialize its UI.
    override fun <T : View> findViewById(id: Int): T? = null
  }
}
