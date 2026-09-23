package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Answers
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController

@RunWith(RobolectricTestRunner::class)
@OptIn(ReactNativeSdkInternal::class)
@SuppressLint("RestrictedApi")
class PaymentSheetLifecycleTest {
  private val context = mock(ReactApplicationContext::class.java)
  private val activities = mutableListOf<ActivityController<FragmentActivity>>()
  private val sheetRegistrations = mutableListOf<SheetRegistration>()
  private val flowControllerHosts = mutableListOf<FragmentActivity>()
  private val flowControllers = mutableListOf<PaymentSheet.FlowController>()
  private val configurationCallbacks = mutableListOf<PaymentSheet.FlowController.ConfigCallback>()
  private val flowControllerCreationThreads = mutableListOf<Thread>()
  private val confirmationThreads = mutableListOf<Thread>()
  private var completeConfigurationImmediately = true
  private var currentActivity: Activity? = null
  private lateinit var manager: PaymentSheetManager

  @Before
  fun setUp() {
    currentActivity = createActivity().get()
    `when`(context.currentActivity).thenAnswer { currentActivity }
    val initialization = PromiseResult()
    manager =
      PaymentSheetManager(
        context = context,
        arguments = parameters(),
        initPromise = initialization.promise,
        paymentSheetFactory = { builder, activity, signal ->
          val previousKeys = registeredKeys(activity)
          builder.build(activity, signal).also {
            val key = (registeredKeys(activity) - previousKeys).single()
            sheetRegistrations.add(SheetRegistration(activity, key))
          }
        },
        flowControllerFactory = { _, activity ->
          flowControllerHosts.add(activity)
          flowControllerCreationThreads.add(Thread.currentThread())
          mock(PaymentSheet.FlowController::class.java) { invocation ->
            when (invocation.method.name) {
              "configureWithPaymentIntent" -> {
                val callback = invocation.getArgument<PaymentSheet.FlowController.ConfigCallback>(2)
                configurationCallbacks.add(callback)
                if (completeConfigurationImmediately) callback.onConfigured(true, null)
                null
              }
              "confirm" -> {
                confirmationThreads.add(Thread.currentThread())
                null
              }
              else -> Answers.RETURNS_DEFAULTS.answer(invocation)
            }
          }.also(flowControllers::add)
        },
      )
    manager.create()
    idleMainThread()
    initialization.assertSuccess()
  }

  @After
  fun tearDown() {
    manager.destroy()
    idleMainThread()
    activities.asReversed().forEach(::destroyActivity)
  }

  @Test
  fun reusesRegularAndCustomInstancesOnTheSameHost() {
    val originalRegistration = sheetRegistrations.single()

    configure().assertSuccess()
    configure(customFlow = true).assertSuccess()
    configure(customFlow = true).assertSuccess()
    configure().assertSuccess()

    assertEquals(1, sheetRegistrations.size)
    assertEquals(1, flowControllerHosts.size)
    assertTrue(registeredKeys(originalRegistration.activity).contains(originalRegistration.key))
  }

  @Test
  fun destroyedHostUnregistersTheLauncherAndRebuildsBothModes() {
    configure(customFlow = true).assertSuccess()
    val originalRegistration = sheetRegistrations.single()
    destroyActivity(activities.single())

    assertFalse(registeredKeys(originalRegistration.activity).contains(originalRegistration.key))

    val replacement = createActivity().get()
    currentActivity = replacement
    configure().assertSuccess()
    configure(customFlow = true).assertSuccess()

    assertEquals(2, sheetRegistrations.size)
    assertEquals(2, flowControllerHosts.size)
    assertSame(replacement, sheetRegistrations.last().activity)
    assertSame(replacement, flowControllerHosts.last())
  }

  @Test
  fun changingHostsInvalidatesBothModesWhenThePreviousActivityIsStillAlive() {
    configure(customFlow = true).assertSuccess()
    val originalRegistration = sheetRegistrations.single()
    val replacement = createActivity().get()
    currentActivity = replacement

    configure().assertSuccess()
    configure(customFlow = true).assertSuccess()
    configure().assertSuccess()

    assertFalse(originalRegistration.activity.isDestroyed)
    assertFalse(registeredKeys(originalRegistration.activity).contains(originalRegistration.key))
    assertEquals(2, sheetRegistrations.size)
    assertEquals(2, flowControllerHosts.size)
    assertSame(replacement, sheetRegistrations.last().activity)
    assertSame(replacement, flowControllerHosts.last())
  }

  @Test
  fun oldHostDestructionDoesNotInvalidateTheReplacementHost() {
    configure(customFlow = true).assertSuccess()
    val original = activities.single()
    currentActivity = createActivity().get()
    configure().assertSuccess()
    configure(customFlow = true).assertSuccess()
    val replacementRegistration = sheetRegistrations.last()

    destroyActivity(original)
    configure().assertSuccess()
    configure(customFlow = true).assertSuccess()

    assertEquals(2, sheetRegistrations.size)
    assertEquals(2, flowControllerHosts.size)
    assertTrue(registeredKeys(replacementRegistration.activity).contains(replacementRegistration.key))
  }

  @Test
  fun temporaryActivityDetachmentAndPausePreserveTheCachedInstances() {
    configure(customFlow = true).assertSuccess()
    val original = activities.single()
    val originalRegistration = sheetRegistrations.single()
    original.pause()
    currentActivity = null

    configure().assertFailure()
    configure(customFlow = true).assertFailure()

    assertTrue(registeredKeys(originalRegistration.activity).contains(originalRegistration.key))
    currentActivity = original.get()
    original.resume()
    configure().assertSuccess()
    configure(customFlow = true).assertSuccess()

    assertEquals(1, sheetRegistrations.size)
    assertEquals(1, flowControllerHosts.size)
  }

  @Test
  fun presentationRejectsAHostChangeSinceInitializationWithoutStartingWork() {
    currentActivity = createActivity().get()
    val result = PromiseResult()

    manager.presentWithTimeout(1000, result.promise)
    idleMainThread()

    result.assertFailure()
    assertEquals(1, sheetRegistrations.size)
    assertNoPresentationWork()
  }

  @Test
  fun confirmationRejectsAHostChangeSinceInitialization() {
    configure(customFlow = true).assertSuccess()
    currentActivity = createActivity().get()

    confirm().assertFailure()

    verify(flowControllers.single(), never()).confirm()
    assertEquals(1, flowControllerHosts.size)
  }

  @Test
  fun finishingActivityCannotReplaceTheInitializedHost() {
    val originalRegistration = sheetRegistrations.single()
    val finishingActivity = createActivity().get()
    finishingActivity.finish()
    currentActivity = finishingActivity

    configure().assertFailure()
    configure(customFlow = true).assertFailure()

    assertEquals(1, sheetRegistrations.size)
    assertTrue(flowControllers.isEmpty())
    assertTrue(registeredKeys(originalRegistration.activity).contains(originalRegistration.key))
    currentActivity = originalRegistration.activity
    configure().assertSuccess()
    assertEquals(1, sheetRegistrations.size)
  }

  @Test
  fun destroyedActivityCannotBeReinitializedOrPresented() {
    destroyActivity(activities.single())

    configure().assertFailure()
    configure(customFlow = true).assertFailure()
    present().assertFailure()

    assertEquals(1, sheetRegistrations.size)
    assertTrue(flowControllers.isEmpty())
    assertNoPresentationWork()
  }

  @Test
  fun customFlowCannotPresentOrConfirmUntilConfigurationSucceeds() {
    completeConfigurationImmediately = false
    val initialization = configure(customFlow = true)

    assertTrue(initialization.values.isEmpty())
    present().assertFailure()
    confirm().assertFailure()
    verify(flowControllers.single(), never()).presentPaymentOptions()
    verify(flowControllers.single(), never()).confirm()
    assertNoPresentationWork()

    configurationCallbacks.single().onConfigured(true, null)
    idleMainThread()
    initialization.assertSuccess()
    val confirmation = confirm()

    verify(flowControllers.single()).confirm()
    assertTrue(confirmation.values.isEmpty())
  }

  @Test
  fun failedCustomConfigurationCannotBePresentedOrConfirmed() {
    completeConfigurationImmediately = false
    val initialization = configure(customFlow = true)

    configurationCallbacks.single().onConfigured(false, IllegalStateException("Configuration failed"))
    idleMainThread()

    initialization.assertFailure()
    present().assertFailure()
    confirm().assertFailure()
    verify(flowControllers.single(), never()).presentPaymentOptions()
    verify(flowControllers.single(), never()).confirm()
    assertNoPresentationWork()
  }

  @Test
  fun regularModeCannotConfirmAPreviouslyCachedCustomController() {
    configure(customFlow = true).assertSuccess()
    configure().assertSuccess()

    confirm().assertFailure()

    verify(flowControllers.single(), never()).confirm()
  }

  @Test
  fun confirmationFromAWorkerThreadInvokesTheControllerOnTheMainThread() {
    configure(customFlow = true).assertSuccess()
    val result = PromiseResult()

    Thread { manager.confirmPayment(result.promise) }.apply {
      start()
      join()
    }
    idleMainThread()

    verify(flowControllers.single()).confirm()
    assertSame(Looper.getMainLooper().thread, confirmationThreads.single())
  }

  @Test
  fun configurationFromAWorkerThreadBuildsTheControllerOnTheMainThread() {
    val result = PromiseResult()

    Thread { manager.configure(parameters(customFlow = true), result.promise) }.apply {
      start()
      join()
    }
    idleMainThread()

    result.assertSuccess()
    assertSame(Looper.getMainLooper().thread, flowControllerCreationThreads.single())
  }

  @Test
  fun configurationWithoutAnActivityDoesNotDiscardTheReadyCustomFlow() {
    configure(customFlow = true).assertSuccess()
    val original = currentActivity
    currentActivity = null

    configure().assertFailure()
    currentActivity = original
    confirm()

    verify(flowControllers.single()).confirm()
    assertEquals(1, flowControllerHosts.size)
  }

  private fun present(): PromiseResult =
    PromiseResult().also {
      manager.present(it.promise)
      idleMainThread()
    }

  private fun confirm(): PromiseResult =
    PromiseResult().also {
      manager.confirmPayment(it.promise)
      idleMainThread()
    }

  private fun assertNoPresentationWork() {
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())
    activities.forEach {
      assertNull(shadowOf(it.get()).nextStartedActivityForResult)
    }
  }

  private fun configure(customFlow: Boolean = false): PromiseResult =
    PromiseResult().also {
      manager.configure(parameters(customFlow), it.promise)
      idleMainThread()
    }

  private fun parameters(customFlow: Boolean = false): ReadableMap =
    readableMapOf(
      "merchantDisplayName" to "Lifecycle test",
      "paymentIntentClientSecret" to "pi_lifecycle_secret_test",
      "customFlow" to customFlow,
    )

  private fun createActivity(): ActivityController<FragmentActivity> =
    Robolectric.buildActivity(FragmentActivity::class.java).setup().also(activities::add)

  private fun destroyActivity(controller: ActivityController<FragmentActivity>) {
    val activity = controller.get()
    if (activity.lifecycle.currentState == Lifecycle.State.DESTROYED) return
    if (activity.lifecycle.currentState == Lifecycle.State.RESUMED) controller.pause()
    if (activity.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) controller.stop()
    controller.destroy()
    idleMainThread()
  }

  private fun registeredKeys(activity: FragmentActivity): Set<String> {
    val state = Bundle()
    activity.activityResultRegistry.onSaveInstanceState(state)
    return state.getStringArrayList("KEY_COMPONENT_ACTIVITY_REGISTERED_KEYS").orEmpty().toSet()
  }

  private fun idleMainThread() {
    shadowOf(Looper.getMainLooper()).idle()
  }

  private data class SheetRegistration(
    val activity: FragmentActivity,
    val key: String,
  )

  private class PromiseResult {
    val promise: Promise = mock(Promise::class.java)
    val values = mutableListOf<ReadableMap>()

    init {
      doAnswer {
        values.add(it.getArgument(0))
        null
      }.`when`(promise).resolve(any())
    }

    fun assertSuccess() {
      assertEquals(1, values.size)
      assertFalse(values.single().hasKey("error"))
    }

    fun assertFailure() {
      assertEquals(1, values.size)
      assertEquals("Failed", values.single().getMap("error")?.getString("code"))
    }
  }
}
