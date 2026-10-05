package com.reactnativestripesdk

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Looper
import com.facebook.react.ReactActivity
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.google.common.truth.Truth.assertThat
import com.stripe.android.Stripe
import org.junit.After
import org.junit.Before
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
  private val application = RuntimeEnvironment.getApplication<Application>()
  private val contexts = mutableListOf<BridgeReactContext>()
  private val modules = mutableListOf<StripeSdkModule>()
  private val advancedFraudSignalsEnabled = Stripe.advancedFraudSignalsEnabled

  @Before
  fun setUp() {
    Stripe.advancedFraudSignalsEnabled = false
  }

  @After
  fun tearDown() {
    modules.forEach { it.invalidate() }
    shadowOf(Looper.getMainLooper()).idle()
    contexts.forEach {
      it.onHostPause()
      it.onHostDestroy()
      it.destroy()
    }
    Stripe.advancedFraudSignalsEnabled = advancedFraudSignalsEnabled
  }

  @Test
  fun initializingWithoutAnActivityRegistersTheRecreationCallback() {
    val context = context()
    assertThat(context.currentActivity).isNull()
    initialize(module(context))

    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity).finish()
  }

  @Test
  fun reinitializingWithoutAnActivityKeepsASingleRegistration() {
    val context = context()
    context.onHostResume(reactActivity())
    val module = module(context)
    initialize(module)
    context.onHostPause()
    context.onHostDestroy()
    assertThat(context.currentActivity).isNull()

    initialize(module)
    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity).finish()
  }

  @Test
  fun invalidatingWithoutAnActivityUnregistersTheCallback() {
    val context = context()
    context.onHostResume(reactActivity())
    val module = module(context)
    initialize(module)
    context.onHostPause()
    context.onHostDestroy()
    assertThat(context.currentActivity).isNull()

    module.invalidate()
    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity, never()).finish()
  }

  @Test
  fun invalidatedModuleCannotFinishTheReplacementModulesStripeActivity() {
    val originalHost = reactActivity()
    val originalContext = context()
    originalContext.onHostResume(originalHost)
    val originalModule = module(originalContext)
    initialize(originalModule)
    originalModule.invalidate()
    originalContext.onHostPause()
    originalContext.onHostDestroy()

    val replacementContext = context()
    replacementContext.onHostResume(originalHost)
    val replacementModule = module(replacementContext)
    initialize(replacementModule)
    replacementContext.onHostPause()
    replacementContext.onHostDestroy()
    val restoredHost = reactActivity()
    dispatchCreated(restoredHost, Bundle())
    replacementContext.onHostResume(restoredHost)
    initialize(replacementModule)

    val stripeActivity = stripeActivity()
    dispatchCreated(stripeActivity)

    verify(stripeActivity, never()).finish()
  }

  @Test
  fun activeModuleStillFinishesStripeActivitiesAfterHostRecreation() {
    val context = context()
    context.onHostResume(reactActivity())
    initialize(module(context))

    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity(), Bundle())
    dispatchCreated(stripeActivity)

    verify(stripeActivity).finish()
  }

  @Test
  fun firstHostCreationDoesNotFinishStripeActivities() {
    val context = context()
    context.onHostResume(reactActivity())
    initialize(module(context))

    val stripeActivity = stripeActivity()
    dispatchCreated(reactActivity())
    dispatchCreated(stripeActivity)

    verify(stripeActivity, never()).finish()
  }

  private fun context() = BridgeReactContext(application).also { contexts.add(it) }

  private fun module(context: BridgeReactContext) = StripeSdkModule(context).also { modules.add(it) }

  private fun initialize(module: StripeSdkModule) {
    val promise = mock(Promise::class.java)
    module.initialise(
      JavaOnlyMap.of("publishableKey", "pk_test_lifecycle", "appInfo", JavaOnlyMap()),
      promise,
    )
    verify(promise).resolve(null)
  }

  private fun reactActivity() = mock(ReactActivity::class.java).apply {
    `when`(this.application).thenReturn(this@StripeSdkModuleLifecycleTest.application)
  }

  private fun stripeActivity(): Activity = mock(
    Class.forName("com.stripe.android.paymentsheet.PaymentSheetActivity").asSubclass(Activity::class.java),
  )

  private fun dispatchCreated(activity: Activity, savedInstanceState: Bundle? = null) {
    ReflectionHelpers.callInstanceMethod<Unit>(
      application,
      "dispatchActivityCreated",
      ClassParameter.from(Activity::class.java, activity),
      ClassParameter.from(Bundle::class.java, savedInstanceState),
    )
  }
}
