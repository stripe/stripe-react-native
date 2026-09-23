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
import com.reactnativestripesdk.utils.readableMapOf
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.paymentsheet.PaymentSheet
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Answers
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
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
          mock(PaymentSheet.FlowController::class.java) { invocation ->
            if (invocation.method.name == "configureWithPaymentIntent") {
              invocation.getArgument<PaymentSheet.FlowController.ConfigCallback>(2).onConfigured(true, null)
              null
            } else {
              Answers.RETURNS_DEFAULTS.answer(invocation)
            }
          }
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
