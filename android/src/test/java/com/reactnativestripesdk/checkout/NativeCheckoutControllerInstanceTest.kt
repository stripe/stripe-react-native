package com.reactnativestripesdk.checkout

import android.app.Activity
import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import android.graphics.drawable.ColorDrawable
import androidx.activity.ComponentActivity
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.reactnativestripesdk.EventEmitterCompat
import com.stripe.android.checkout.CheckoutElementsController
import com.stripe.android.checkout.CheckoutElementsPresenter
import com.stripe.android.elements.ExpressCheckoutElement
import com.stripe.android.paymentelement.CheckoutSessionPreview
import com.stripe.android.uicore.utils.mapAsStateFlow
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.job
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.yield
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import java.util.concurrent.atomic.AtomicReference

@OptIn(CheckoutSessionPreview::class, ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class NativeCheckoutControllerInstanceTest {
  @Test
  fun `destroy releases resources and stops future updates`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    val firstSession = fixture.events.last().getMap("session") as WritableMap
    firstSession.putString("email", "changed-by-recipient@example.com")
    fixture.updating.value = true
    advanceUntilIdle()
    assertEquals("jenny@example.com", fixture.events.last().getMap("session")!!.getString("email"))
    assertEquals("updating", fixture.events.last().getString("status"))

    val countBeforeDestroy = fixture.events.size
    fixture.instance.destroy()
    fixture.instance.destroy()
    fixture.updating.value = false
    fixture.sessions.value = checkoutSession(email = "late@example.com")
    advanceUntilIdle()

    assertEquals(countBeforeDestroy, fixture.events.size)
    assertFalse(fixture.scope.isActive)
    verify(fixture.controller, times(1)).destroy()
  }

  @Test
  fun `destroy cancels a mutation before observation is dispatched`() = withFixture { fixture ->
    fixture.start()
    var canceled = false
    fixture.instance.launchMutation {
      try {
        awaitCancellation()
      } catch (_: CancellationException) {
        canceled = true
      }
    }
    fixture.instance.destroy()
    advanceUntilIdle()

    assertTrue(canceled)
  }

  @Test
  fun `view observers can detach and are notified once on destruction`() = withFixture { fixture ->
    var detachedCalls = 0
    var mountedCalls = 0
    val remove = fixture.instance.observeDestruction { detachedCalls++ }
    fixture.instance.observeDestruction { mountedCalls++ }
    remove()
    fixture.instance.destroy()
    fixture.instance.destroy()
    assertEquals(0, detachedCalls)
    assertEquals(1, mountedCalls)
  }

  @Test
  fun `does not emit ready with an outdated session while its image loads`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    fixture.updating.value = true
    runCurrent()
    val imageStarted = CompletableDeferred<Unit>()
    fixture.sessions.value = checkoutSession(
      email = "updated@example.com",
      paymentOption = checkoutPaymentOption(imageLoader = {
        imageStarted.complete(Unit)
        awaitCancellation()
      }),
    )
    imageStarted.await()
    fixture.updating.value = false
    runCurrent()

    assertEquals("updating", fixture.events.last().getString("status"))
  }

  @Test
  fun `emits a brief updating state while payment option image loads`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    val initialEventCount = fixture.events.size
    val imageStarted = CompletableDeferred<Unit>()
    fixture.sessions.value = checkoutSession(
      paymentOption = checkoutPaymentOption(imageLoader = {
        imageStarted.complete(Unit)
        awaitCancellation()
      }),
    )
    runCurrent()
    imageStarted.await()

    fixture.updating.value = true
    runCurrent()
    fixture.updating.value = false
    runCurrent()

    assertTrue(fixture.events.drop(initialEventCount).any { it.getString("status") == "updating" })
  }

  @Test
  fun `observes sessions when the native flow creates a new value on every read`() = withFixture { fixture ->
    `when`(fixture.controller.session).thenReturn(
      fixture.sessions.mapAsStateFlow { session -> session?.let { checkoutSession(email = it.email.orEmpty()) } },
    )
    fixture.start()
    advanceUntilIdle()

    assertEquals("ready", fixture.events.last().getString("status"))
    assertEquals("jenny@example.com", fixture.events.last().getMap("session")!!.getString("email"))
  }

  @Test
  fun `session icons follow the current activity across activity changes`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    val requestedDarkTheme = AtomicReference<Boolean>()
    fun activityWithNightMode(nightMode: Int): Activity {
      val activity = mock(Activity::class.java)
      val resources = mock(Resources::class.java)
      `when`(resources.configuration).thenReturn(Configuration().apply { uiMode = nightMode })
      `when`(activity.resources).thenReturn(resources)
      return activity
    }

    assertEquals(
      Configuration.UI_MODE_NIGHT_NO,
      fixture.context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK,
    )
    val darkActivity = activityWithNightMode(Configuration.UI_MODE_NIGHT_YES)
    `when`(fixture.context.currentActivity).thenReturn(darkActivity)
    fixture.sessions.value = checkoutSession(
      paymentOption = checkoutPaymentOption(
        imageLoader = { ColorDrawable() },
        requestedDarkTheme = requestedDarkTheme,
      ),
    )
    fixture.instance.publishCurrentState()
    assertEquals(true, requestedDarkTheme.get())

    val lightActivity = activityWithNightMode(Configuration.UI_MODE_NIGHT_NO)
    `when`(fixture.context.currentActivity).thenReturn(lightActivity)
    fixture.sessions.value = checkoutSession(
      email = "new@example.com",
      paymentOption = checkoutPaymentOption(
        imageLoader = { ColorDrawable() },
        requestedDarkTheme = requestedDarkTheme,
      ),
    )
    fixture.instance.publishCurrentState()
    assertEquals(false, requestedDarkTheme.get())
  }

  @Test
  fun `publishes the latest session before returning when serialization changes it`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    fixture.sessions.value = checkoutSession(
      paymentOption = checkoutPaymentOption(imageLoader = {
        fixture.sessions.value = checkoutSession(email = "updated@example.com")
        ColorDrawable()
      }),
    )

    fixture.instance.publishCurrentState()

    assertEquals("updated@example.com", fixture.events.last().getMap("session")!!.getString("email"))
    assertEquals("ready", fixture.events.last().getString("status"))
  }

  @Test
  fun `snapshot publication does not restore an updating status after native completion`() = withFixture { fixture ->
    fixture.start()
    advanceUntilIdle()
    fixture.updating.value = true
    val publication = async { fixture.instance.publishCurrentState() }
    launch {
      // Complete the operation after its busy snapshot is queued, before it is published.
      repeat(2) { yield() }
      fixture.updating.value = false
    }
    advanceUntilIdle()
    publication.await()

    assertEquals("ready", fixture.events.last().getString("status"))
  }

  @Test
  fun `confirmation waits for native and publishes its session before completing`() = withFixture { fixture ->
    fixture.start()
    val pending = async { fixture.instance.confirm(fixture.activity.get()) }
    runCurrent()
    verify(fixture.presenter).confirm()
    assertFalse(pending.isCompleted)
    fixture.updating.value = true
    runCurrent()
    assertEquals("confirming", fixture.events.last().getString("status"))

    fixture.sessions.value = checkoutSession(status = NativeCheckoutFixtures.completeStatus())
    val completed = NativeCheckoutFixtures.completedResult()
    fixture.instance.onConfirmationResult(completed)
    fixture.updating.value = false
    fixture.instance.onConfirmationResult(NativeCheckoutFixtures.canceledResult())
    assertEquals("completed", pending.await().getString("status"))
    assertEquals("complete", fixture.events.last().getMap("session")!!.getMap("status")!!.getString("type"))
    assertEquals("ready", fixture.events.last().getString("status"))
  }

  @Test
  fun `second confirmation cannot replace a pending call and canceled attempts can retry`() = withFixture { fixture ->
    fixture.start()
    val first = async { fixture.instance.confirm(fixture.activity.get()) }
    runCurrent()
    val secondError = runCatching { fixture.instance.confirm(fixture.activity.get()) }.exceptionOrNull()
    assertEquals("Checkout confirmation is already in progress.", secondError?.message)
    assertFalse(first.isCompleted)
    verify(fixture.presenter, times(1)).confirm()
    val canceled = NativeCheckoutFixtures.canceledResult()
    fixture.instance.onConfirmationResult(canceled)
    assertEquals("canceled", first.await().getString("status"))

    doAnswer {
      fixture.instance.onConfirmationResult(canceled)
      null
    }.`when`(fixture.presenter).confirm()
    assertEquals("canceled", fixture.instance.confirm(fixture.activity.get()).getString("status"))
    verify(fixture.controller, times(1)).createPresenter(fixture.activity.get())
  }

  @Test
  fun `native invocation failure clears pending confirmation`() = withFixture { fixture ->
    fixture.start()
    doAnswer { throw IllegalStateException("Native failure") }.`when`(fixture.presenter).confirm()
    val error = runCatching { fixture.instance.confirm(fixture.activity.get()) }.exceptionOrNull()
    assertEquals("Native failure", error?.message)
    assertEquals("ready", fixture.events.last().getString("status"))
    val canceled = NativeCheckoutFixtures.canceledResult()
    doAnswer {
      fixture.instance.onConfirmationResult(canceled)
      null
    }.`when`(fixture.presenter).confirm()
    assertEquals("canceled", fixture.instance.confirm(fixture.activity.get()).getString("status"))
  }

  @Test
  fun `destruction waits for a pending confirmation before releasing native resources`() = withFixture { fixture ->
    fixture.start()
    var result: WritableMap? = null
    fixture.instance.launchMutation { result = fixture.instance.confirm(fixture.activity.get()) }
    runCurrent()
    val eventCountBeforeDestroy = fixture.events.size
    fixture.instance.destroy()
    runCurrent()
    assertEquals(null, result)
    verify(fixture.controller, times(0)).destroy()

    fixture.sessions.value = checkoutSession(status = NativeCheckoutFixtures.completeStatus())
    fixture.instance.onConfirmationResult(NativeCheckoutFixtures.completedResult())
    runCurrent()
    assertEquals("completed", result?.getString("status"))
    verify(fixture.controller, times(1)).destroy()
    assertEquals(eventCountBeforeDestroy, fixture.events.size)
  }

  @Test
  fun `finishing activity fails a pending confirmation`() = withFixture { fixture ->
    fixture.start()
    var error: Throwable? = null
    fixture.instance.launchMutation {
      error = runCatching { fixture.instance.confirm(fixture.activity.get()) }.exceptionOrNull()
    }
    runCurrent()
    fixture.instance.destroy()
    fixture.activity.get().finish()
    fixture.activity.pause().stop().destroy()
    runCurrent()
    assertTrue(error is IllegalStateException)
    verify(fixture.controller, times(1)).destroy()
  }

  @Test
  fun `recreated activity receives a confirmation after the controller is destroyed`() = withFixture { fixture ->
    fixture.start()
    var result: WritableMap? = null
    fixture.instance.launchMutation { result = fixture.instance.confirm(fixture.activity.get()) }
    runCurrent()

    // React Native unmounts the old screen, and its controller, after the activity is destroyed.
    val recreated = fixture.recreateActivity()
    fixture.instance.destroy()
    runCurrent()
    assertEquals(null, result)
    verify(fixture.controller, times(0)).destroy()

    fixture.resumeHost(recreated)
    verify(fixture.controller, times(1)).createPresenter(recreated)
    fixture.sessions.value = checkoutSession(status = NativeCheckoutFixtures.completeStatus())
    fixture.instance.onConfirmationResult(NativeCheckoutFixtures.completedResult())
    runCurrent()
    assertEquals("completed", result?.getString("status"))
    verify(fixture.controller, times(1)).destroy()
    verify(fixture.context).removeLifecycleEventListener(checkNotNull(fixture.hostListener))
  }

  @Test
  fun `recreated activity receives a confirmation for a live controller`() = withFixture { fixture ->
    fixture.start()
    val pending = async { fixture.instance.confirm(fixture.activity.get()) }
    runCurrent()

    val recreated = fixture.recreateActivity()
    runCurrent()
    assertFalse(pending.isCompleted)

    fixture.resumeHost(recreated)
    fixture.instance.onConfirmationResult(NativeCheckoutFixtures.canceledResult())
    assertEquals("canceled", pending.await().getString("status"))
    verify(fixture.controller, times(1)).createPresenter(recreated)
  }

  @Test
  fun `destruction settles a server update while confirmation keeps running`() = withFixture { fixture ->
    fixture.start()
    fixture.instance.launchMutation { fixture.instance.confirm(fixture.activity.get()) }
    var result: Result<Unit>? = null
    fixture.instance.launchMutation { result = fixture.instance.requestServerUpdate("update-1") {} }
    fixture.instance.destroy()
    runCurrent()
    assertTrue(result?.exceptionOrNull() is CancellationException)
    fixture.instance.onConfirmationResult(NativeCheckoutFixtures.canceledResult())
  }

  @Test
  fun `unconfigured express element cannot be accessed`() = withFixture { fixture ->
    assertThrows(IllegalStateException::class.java) {
      fixture.instance.expressCheckoutElement(fixture.activity.get())
    }
  }

  @Test
  fun `express element shares the presenter and registers wallets after activity recreation`() =
    withFixture(expressConfigured = true) { fixture ->
      val element = mock(ExpressCheckoutElement::class.java)
      `when`(fixture.presenter.expressCheckoutElement()).thenReturn(element)
      fixture.instance.paymentElement(fixture.activity.get())
      assertSame(element, fixture.instance.expressCheckoutElement(fixture.activity.get()))
      assertSame(element, fixture.instance.expressCheckoutElement(fixture.activity.get()))
      verify(fixture.controller, times(1)).createPresenter(fixture.activity.get())
      fixture.activity.pause().stop().destroy()
      val nextActivity = Robolectric.buildActivity(ComponentActivity::class.java).setup()
      val nextPresenter = mock(CheckoutElementsPresenter::class.java)
      val nextElement = mock(ExpressCheckoutElement::class.java)
      `when`(fixture.controller.createPresenter(nextActivity.get())).thenReturn(nextPresenter)
      `when`(nextPresenter.expressCheckoutElement()).thenReturn(nextElement)
      try {
        fixture.instance.currencySelectorElement(nextActivity.get())
        verify(nextPresenter).expressCheckoutElement()
        assertSame(nextElement, fixture.instance.expressCheckoutElement(nextActivity.get()))
        fixture.instance.destroy()
        assertThrows(IllegalStateException::class.java) {
          fixture.instance.expressCheckoutElement(nextActivity.get())
        }
      } finally {
        nextActivity.pause().stop().destroy()
      }
    }

  private fun withFixture(expressConfigured: Boolean = false, test: suspend TestScope.(Fixture) -> Unit) = runTest {
    Dispatchers.setMain(StandardTestDispatcher(testScheduler))
    val fixture = Fixture(expressConfigured)
    try {
      test(fixture)
    } finally {
      fixture.close()
      Dispatchers.resetMain()
    }
  }

  private class Fixture(expressConfigured: Boolean) {
    val controller = mock(CheckoutElementsController::class.java)
    val presenter = mock(CheckoutElementsPresenter::class.java)
    val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup()
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    val sessions = MutableStateFlow<CheckoutElementsController.Session?>(checkoutSession())
    val updating = MutableStateFlow(false)
    val events = mutableListOf<ReadableMap>()
    val context = mock(ReactApplicationContext::class.java)
    val instance: NativeCheckoutControllerInstance
    var hostListener: LifecycleEventListener? = null

    init {
      doAnswer { invocation ->
        hostListener = invocation.getArgument(0)
        null
      }.`when`(context).addLifecycleEventListener(any())
      `when`(controller.createPresenter(activity.get())).thenReturn(presenter)
      `when`(controller.session).thenReturn(sessions)
      `when`(controller.isUpdating).thenReturn(updating)
      `when`(context.resources).thenReturn(ApplicationProvider.getApplicationContext<Context>().resources)
      val emitter = mock(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      `when`(context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)).thenReturn(emitter)
      doAnswer { invocation ->
        assertEquals("checkoutControllerDidUpdate", invocation.getArgument<String>(0))
        val event = invocation.getArgument<ReadableMap>(1)
        events.add(event)
        null
      }.`when`(emitter).emit(anyString(), any())
      instance = NativeCheckoutControllerInstance(
        controller,
        EventEmitterCompat(context),
        scope,
        com.facebook.react.bridge.JavaOnlyMap.of("id", "cs_test", "email", "jenny@example.com"),
        context,
        isExpressCheckoutElementConfigured = expressConfigured,
      )
    }

    fun start() {
      instance.start("controller-1")
    }

    /** Recreates the activity the way a configuration change does, with no React Native host yet. */
    fun recreateActivity(): ComponentActivity {
      activity.recreate()
      val recreated = activity.get()
      `when`(controller.createPresenter(recreated)).thenReturn(presenter)
      return recreated
    }

    fun resumeHost(activity: Activity) {
      `when`(context.currentActivity).thenReturn(activity)
      checkNotNull(hostListener).onHostResume()
    }

    suspend fun close() {
      instance.destroy()
      scope.coroutineContext.job.join()
      if (!activity.get().isDestroyed) activity.pause().stop().destroy()
    }
  }
}
