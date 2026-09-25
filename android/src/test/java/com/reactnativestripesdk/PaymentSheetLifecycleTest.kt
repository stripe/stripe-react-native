package com.reactnativestripesdk

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.modules.appregistry.AppRegistry
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
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
import org.robolectric.annotation.Config
import java.time.Duration

@RunWith(RobolectricTestRunner::class)
@Config(application = PaymentSheetLifecycleTest.TrackingApplication::class)
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
  private val activeReactListeners = mutableListOf<LifecycleEventListener>()
  private var completeConfigurationImmediately = true
  private var currentActivity: Activity? = null
  private lateinit var manager: PaymentSheetManager

  @Before
  fun setUp() {
    currentActivity = createActivity().get()
    `when`(context.currentActivity).thenAnswer { currentActivity }
    `when`(context.hasActiveReactInstance()).thenReturn(true)
    `when`(context.getJSModule(AppRegistry::class.java)).thenReturn(mock(AppRegistry::class.java))
    doAnswer {
      activeReactListeners.add(it.getArgument(0))
      null
    }.`when`(context).addLifecycleEventListener(any())
    doAnswer {
      activeReactListeners.remove(it.getArgument<LifecycleEventListener>(0))
      null
    }.`when`(context).removeLifecycleEventListener(any())
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
            sheetRegistrations.add(
              SheetRegistration(activity, key, registeredRequests(activity).getValue(key), signal::unregister),
            )
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

  @Test
  fun destroyingTheHostSettlesPendingConfigurationBeforeItsCallbackArrives() {
    completeConfigurationImmediately = false
    val initialization = configure(customFlow = true)

    destroyActivity(activities.single())
    initialization.assertFailure()

    configurationCallbacks.single().onConfigured(true, null)
    idleMainThread()

    initialization.assertFailure()
    verify(flowControllers.single(), never()).confirm()
  }

  @Test
  fun oldConfigurationCallbacksCannotCompleteOrDisableTheReplacementConfiguration() {
    completeConfigurationImmediately = false
    val originalInitialization = configure(customFlow = true)
    val originalCallback = configurationCallbacks.single()
    currentActivity = createActivity().get()
    val replacementInitialization = configure(customFlow = true)

    originalInitialization.assertFailure()
    originalCallback.onConfigured(true, null)
    idleMainThread()

    originalInitialization.assertFailure()
    assertTrue(replacementInitialization.values.toString(), replacementInitialization.values.isEmpty())
    confirm().assertFailure()
    configurationCallbacks.last().onConfigured(true, null)
    idleMainThread()
    replacementInitialization.assertSuccess()

    originalCallback.onConfigured(false, IllegalStateException("Old host failed"))
    idleMainThread()
    confirm()

    originalInitialization.assertFailure()
    replacementInitialization.assertSuccess()
    verify(flowControllers.first(), never()).confirm()
    verify(flowControllers.last()).confirm()
  }

  @Test
  fun duplicateConfigurationCallbackCannotChangeReadinessOrCompleteANewerRequest() {
    completeConfigurationImmediately = false
    val initialization = configure(customFlow = true)
    val originalCallback = configurationCallbacks.single()
    originalCallback.onConfigured(true, null)
    idleMainThread()
    initialization.assertSuccess()

    val reconfiguration = configure(customFlow = true)
    originalCallback.onConfigured(true, null)
    idleMainThread()

    initialization.assertSuccess()
    assertTrue(reconfiguration.values.isEmpty())
    confirm().assertFailure()

    configurationCallbacks.last().onConfigured(true, null)
    idleMainThread()
    configurationCallbacks.last().onConfigured(false, IllegalStateException("Duplicate callback"))
    idleMainThread()
    reconfiguration.assertSuccess()
    confirm()

    verify(flowControllers.single()).confirm()
  }

  @Test
  fun overlappingConfigurationPreservesTheOriginalPendingRequest() {
    completeConfigurationImmediately = false
    val original = configure(customFlow = true)

    configure().assertFailure()
    configure(customFlow = true).assertFailure()

    assertEquals(1, configurationCallbacks.size)
    assertTrue(original.values.isEmpty())
    configurationCallbacks.single().onConfigured(true, null)
    idleMainThread()
    original.assertSuccess()
    confirm()
    verify(flowControllers.single()).confirm()
  }

  @Test
  fun pendingConfirmationKeepsItsPromiseUntilTheHostIsDestroyed() {
    configure(customFlow = true).assertSuccess()
    val original = confirm()

    confirm().assertFailure()
    present().assertFailure()
    configure().assertFailure()

    assertTrue(original.values.isEmpty())
    verify(flowControllers.single()).confirm()
    assertEquals(1, configurationCallbacks.size)
    destroyActivity(activities.single())
    original.assertFailure()

    manager.destroy()
    idleMainThread()
    original.assertFailure()
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())
  }

  @Test
  fun overlappingPresentationAndConfigurationCannotReplaceTheActivePromise() {
    val original = present()
    assertTrue(original.values.isEmpty())
    assertTrue(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())

    val duplicate = present()
    duplicate.assertFailure()
    configure().assertFailure()
    confirm().assertFailure()
    assertTrue(original.values.isEmpty())

    deliverResult(completedResult())
    original.assertSuccess()
    duplicate.assertFailure()
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())

    val subsequent = present()
    deliverResult(completedResult())
    subsequent.assertSuccess()
  }

  @Test
  fun queuedResultFromThePreviousHostCannotResolveTheReplacementPresentation() {
    val replacement = createActivity().get()
    val originalRegistration = sheetRegistrations.single()
    val original = present()
    var resultDispatched = false
    Thread {
      resultDispatched =
        originalRegistration.activity.activityResultRegistry.dispatchResult(
          originalRegistration.requestCode,
          completedResult(),
        )
    }.apply {
      start()
      join()
    }
    assertTrue(resultDispatched)

    currentActivity = replacement
    val initialization = PromiseResult()
    manager.configure(parameters(), initialization.promise)
    val subsequent = PromiseResult()
    manager.present(subsequent.promise)
    idleMainThread()

    initialization.assertSuccess()
    original.assertFailure()
    assertTrue(subsequent.values.isEmpty())
    assertTrue(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())

    deliverResult(completedResult())
    subsequent.assertSuccess()
    original.assertFailure()
  }

  @Test
  fun changingHostsCancelsAResultWaitingForTheReactActivityToResume() {
    val replacement = createActivity().get()
    val application = currentActivity!!.application as TrackingApplication
    val callbacksBeforePresentation = application.activityCallbacks.toSet()
    val original = present(timeout = 1000)
    val timeoutCallback = (application.activityCallbacks - callbacksBeforePresentation).single()
    currentActivity = null
    deliverResult(completedResult())
    val originalResumeListener = activeReactListeners.single()
    assertTrue(original.values.isEmpty())

    currentActivity = replacement
    configure().assertSuccess()

    original.assertFailure()
    assertTrue(activeReactListeners.isEmpty())
    assertFalse(application.activityCallbacks.contains(timeoutCallback))
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())

    val subsequent = present()
    originalResumeListener.onHostResume()
    idleMainThread()

    assertTrue(subsequent.values.isEmpty())
    original.assertFailure()
    deliverResult(completedResult())
    subsequent.assertSuccess()
  }

  @Test
  fun completedPresentationCancelsItsTimeoutBeforeAnotherSheetIsPresented() {
    val host = currentActivity as FragmentActivity
    val application = host.application as TrackingApplication
    val callbacksBeforePresentation = application.activityCallbacks.toSet()
    val original = present(timeout = 1000)
    val firstTimeoutCallback = (application.activityCallbacks - callbacksBeforePresentation).single()
    val originalSheet = announceLaunchedSheet(host, listOf(firstTimeoutCallback))

    deliverResult(canceledResult())

    original.assertError("Canceled")
    assertFalse(application.activityCallbacks.contains(firstTimeoutCallback))
    val subsequent = present(timeout = 3000)
    val subsequentCallbacks = application.activityCallbacks - callbacksBeforePresentation
    val subsequentSheet = announceLaunchedSheet(host, subsequentCallbacks)

    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(1000))

    assertFalse(originalSheet.isFinishing)
    assertFalse(subsequentSheet.isFinishing)
    assertTrue(subsequent.values.isEmpty())

    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(2000))
    assertTrue(subsequentSheet.isFinishing)
    deliverResult(canceledResult())

    subsequent.assertError("Timeout")
    assertEquals(callbacksBeforePresentation, application.activityCallbacks.toSet())
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())
  }

  @Test
  fun destroyingTheHostCancelsItsPresentationTimeoutAndAwakeTask() {
    val host = currentActivity as FragmentActivity
    val application = host.application as TrackingApplication
    val callbacksBeforePresentation = application.activityCallbacks.toSet()
    val result = present(timeout = 1000)
    val timeoutCallback = (application.activityCallbacks - callbacksBeforePresentation).single()
    val sheet = announceLaunchedSheet(host, listOf(timeoutCallback))

    destroyActivity(activities.single())
    shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(1000))

    result.assertFailure()
    assertFalse(sheet.isFinishing)
    assertFalse(application.activityCallbacks.contains(timeoutCallback))
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())
  }

  @Test
  fun immediateNativeLaunchFailureCancelsTheAwakeTaskAndTimeout() {
    val registration = sheetRegistrations.single()
    val application = registration.activity.application as TrackingApplication
    val callbacksBeforePresentation = application.activityCallbacks.toSet()
    registration.unregister()

    val result = present(timeout = 1000)
    idleMainThread()

    result.assertFailure()
    assertFalse(HeadlessJsTaskContext.getInstance(context).hasActiveTasks())
    assertEquals(callbacksBeforePresentation, application.activityCallbacks.toSet())
    assertNull(shadowOf(registration.activity).nextStartedActivityForResult)
  }

  @Test
  fun activityWaiterCanBeCanceledBeforeTheHostResumes() {
    val original = currentActivity
    currentActivity = null
    var actionCount = 0
    val cancel = runWhenActivityAvailable(context) { actionCount += 1 }
    val listener = activeReactListeners.single()

    cancel()
    cancel()
    currentActivity = original
    listener.onHostResume()

    assertEquals(0, actionCount)
    assertTrue(activeReactListeners.isEmpty())
    verify(context).removeLifecycleEventListener(listener)
  }

  private fun present(timeout: Long? = null): PromiseResult =
    PromiseResult().also {
      manager.present(it.promise, timeout)
      idleMainThread()
    }

  // The SDK's result constructors are Kotlin-internal, but their JVM constructors are public.
  private fun completedResult(): PaymentSheetResult =
    PaymentSheetResult.Completed::class.java.getDeclaredConstructor(java.lang.Boolean.TYPE).newInstance(true)

  private fun canceledResult(): PaymentSheetResult =
    PaymentSheetResult.Canceled::class.java.getDeclaredConstructor(java.lang.Boolean.TYPE).newInstance(true)

  private fun deliverResult(result: PaymentSheetResult) {
    val registration = sheetRegistrations.last()
    assertTrue(registration.activity.activityResultRegistry.dispatchResult(registration.requestCode, result))
    idleMainThread()
  }

  private fun announceLaunchedSheet(
    host: FragmentActivity,
    callbacks: List<Application.ActivityLifecycleCallbacks>,
  ): Activity {
    val intent = shadowOf(host).nextStartedActivityForResult.intent
    val activityClass = Class.forName(intent.component!!.className).asSubclass(Activity::class.java)
    val sheet = Robolectric.buildActivity(activityClass, intent).get()
    callbacks.forEach { it.onActivityCreated(sheet, null) }
    return sheet
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

  private fun registeredKeys(activity: FragmentActivity): Set<String> = registeredRequests(activity).keys

  private fun registeredRequests(activity: FragmentActivity): Map<String, Int> {
    val state = Bundle()
    activity.activityResultRegistry.onSaveInstanceState(state)
    val keys = state.getStringArrayList("KEY_COMPONENT_ACTIVITY_REGISTERED_KEYS").orEmpty()
    val codes = state.getIntegerArrayList("KEY_COMPONENT_ACTIVITY_REGISTERED_RCS").orEmpty()
    return keys.zip(codes).toMap()
  }

  private fun idleMainThread() {
    shadowOf(Looper.getMainLooper()).idle()
  }

  private data class SheetRegistration(
    val activity: FragmentActivity,
    val key: String,
    val requestCode: Int,
    val unregister: () -> Unit,
  )

  class TrackingApplication : Application() {
    val activityCallbacks = mutableListOf<ActivityLifecycleCallbacks>()

    override fun registerActivityLifecycleCallbacks(callback: ActivityLifecycleCallbacks) {
      super.registerActivityLifecycleCallbacks(callback)
      activityCallbacks.add(callback)
    }

    override fun unregisterActivityLifecycleCallbacks(callback: ActivityLifecycleCallbacks) {
      super.unregisterActivityLifecycleCallbacks(callback)
      activityCallbacks.remove(callback)
    }
  }

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
      assertFalse(values.single().toString(), values.single().hasKey("error"))
    }

    fun assertFailure() {
      assertError("Failed")
    }

    fun assertError(code: String) {
      assertEquals(1, values.size)
      assertEquals(code, values.single().getMap("error")?.getString("code"))
    }
  }
}
