package com.reactnativestripesdk.identity

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.stripe.android.identity.IdentityVerificationSheet
import com.stripe.android.identity.IdentityVerificationSheet.VerificationFlowResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.any
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class IdentityVerificationSheetManagerTest {
  private val context = mock(ReactApplicationContext::class.java)
  private val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
  private val sheet = mock(IdentityVerificationSheet::class.java)
  private lateinit var callback: IdentityVerificationSheet.IdentityVerificationCallback
  private val manager = IdentityVerificationSheetManagerImpl(context) {
    IdentityVerificationSheetFragment().apply {
      sheetFactory = { _, configuration, resultCallback ->
        assertEquals("https://example.com/logo.png", configuration.brandLogo.toString())
        callback = resultCallback
        sheet
      }
    }
  }

  @Test
  fun `result mapping preserves all statuses and includes flat failure details`() {
    val completed = IdentityVerificationSheetManagerImpl.mapResult(VerificationFlowResult.Completed)
    assertEquals("FlowCompleted", completed.getString("status"))
    val canceled = IdentityVerificationSheetManagerImpl.mapResult(VerificationFlowResult.Canceled)
    assertEquals("FlowCanceled", canceled.getString("status"))
    val result =
      IdentityVerificationSheetManagerImpl.mapResult(VerificationFlowResult.Failed(Exception("Camera failed")))
    assertEquals("FlowFailed", result.getString("status"))
    assertEquals("FlowFailed", result.getMap("error")!!.getString("code"))
    assertEquals("Camera failed", result.getMap("error")!!.getString("message"))
    assertFalse(result.getMap("error")!!.hasKey("error"))
  }

  @Test
  fun `promise is installed before immediate result and fragment is removed`() {
    `when`(context.currentActivity).thenReturn(activity)
    doAnswer {
      callback.onVerificationFlowResult(VerificationFlowResult.Completed)
      null
    }.`when`(sheet).present("vs_test", "ek_test")
    val promise = mock(Promise::class.java)

    manager.present(options(), promise)
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("FlowCompleted", resolved(promise).getString("status"))
    assertTrue(activity.supportFragmentManager.fragments.isEmpty())
    verify(context).removeLifecycleEventListener(manager)
  }

  @Test
  fun `concurrent presentation fails without replacing original promise and allows retry after completion`() {
    `when`(context.currentActivity).thenReturn(activity)
    val first = mock(Promise::class.java)
    val second = mock(Promise::class.java)
    manager.present(options(), first)
    shadowOf(Looper.getMainLooper()).idle()
    manager.present(options(), second)
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("FlowFailed", resolved(second).getString("status"))
    verify(first, never()).resolve(any())
    callback.onVerificationFlowResult(VerificationFlowResult.Canceled)
    assertEquals("FlowCanceled", resolved(first).getString("status"))
    shadowOf(Looper.getMainLooper()).idle()

    val third = mock(Promise::class.java)
    manager.present(options(), third)
    shadowOf(Looper.getMainLooper()).idle()
    callback.onVerificationFlowResult(VerificationFlowResult.Completed)
    assertEquals("FlowCompleted", resolved(third).getString("status"))
  }

  @Test
  fun `invalid options and missing activity resolve a failure`() {
    val missingSession = mock(Promise::class.java)
    manager.present(options().apply { putString("sessionId", " ") }, missingSession)
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals("sessionId is required.", resolved(missingSession).getMap("error")!!.getString("message"))

    val missingLogo = mock(Promise::class.java)
    manager.present(options().apply { putMap("brandLogo", JavaOnlyMap.of("uri", "")) }, missingLogo)
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals("FlowFailed", resolved(missingLogo).getString("status"))

    val missingActivity = mock(Promise::class.java)
    manager.present(options(), missingActivity)
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals("FlowFailed", resolved(missingActivity).getString("status"))
  }

  @Test
  fun `invalid drawable returns useful error instead of resource exception`() {
    val result = runCatching { IdentityVerificationSheetManagerImpl.resolveBrandLogo(activity, "missing_drawable") }
    assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    assertEquals("brandLogo drawable resource was not found: missing_drawable", result.exceptionOrNull()!!.message)
  }

  @Test
  fun `launch exceptions resolve a failure and clean up`() {
    `when`(context.currentActivity).thenReturn(activity)
    doAnswer { throw IllegalStateException("Unable to launch") }.`when`(sheet).present("vs_test", "ek_test")
    val promise = mock(Promise::class.java)
    manager.present(options(), promise)
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("Unable to launch", resolved(promise).getMap("error")!!.getString("message"))
    assertTrue(activity.supportFragmentManager.fragments.isEmpty())
  }

  @Test
  fun `invalidation before fragment transaction resolves once and removes queued fragment`() {
    `when`(context.currentActivity).thenReturn(activity)
    val promise = mock(Promise::class.java)
    manager.present(options(), promise)
    manager.invalidate()
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("FlowFailed", resolved(promise).getString("status"))
    assertTrue(activity.supportFragmentManager.fragments.isEmpty())
    verify(sheet, never()).present("vs_test", "ek_test")
  }

  @Test
  fun `invalidation prevents work already queued from the native modules thread`() {
    `when`(context.currentActivity).thenReturn(activity)
    val promise = mock(Promise::class.java)
    val caller = Thread { manager.present(options(), promise) }
    caller.start()
    caller.join(2_000)
    assertFalse(caller.isAlive)
    manager.invalidate()
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("FlowFailed", resolved(promise).getString("status"))
    assertTrue(activity.supportFragmentManager.fragments.isEmpty())
    verify(context, never()).addLifecycleEventListener(manager)
  }

  @Test
  fun `result received before React resumes a replacement activity is delivered once`() {
    `when`(context.currentActivity).thenReturn(activity)
    val promise = mock(Promise::class.java)
    manager.present(options(), promise)
    shadowOf(Looper.getMainLooper()).idle()
    val original = activity.supportFragmentManager.fragments.single()
    val tag = original.tag
    val recreated = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    val restored = IdentityVerificationSheetFragment().apply {
      arguments = original.arguments
      sheetFactory = { _, _, resultCallback ->
        resultCallback.onVerificationFlowResult(VerificationFlowResult.Completed)
        sheet
      }
    }
    recreated.supportFragmentManager.beginTransaction().add(restored, tag).commitNow()
    verify(promise, never()).resolve(any())
    `when`(context.currentActivity).thenReturn(recreated)
    manager.onHostResume()
    manager.onHostResume()
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("FlowCompleted", resolved(promise).getString("status"))
    assertTrue(recreated.supportFragmentManager.fragments.isEmpty())
  }

  @Test
  fun `restoring a fragment preserves its in-flight presentation without launching again`() {
    `when`(context.currentActivity).thenReturn(activity)
    val promise = mock(Promise::class.java)
    manager.present(options(), promise)
    shadowOf(Looper.getMainLooper()).idle()
    val original = activity.supportFragmentManager.fragments.single()
    val state = activity.supportFragmentManager.saveFragmentInstanceState(original)
    val recreated = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    val restored = IdentityVerificationSheetFragment().apply {
      arguments = original.arguments
      setInitialSavedState(state)
      sheetFactory = { _, _, resultCallback ->
        callback = resultCallback
        sheet
      }
    }
    recreated.supportFragmentManager.beginTransaction().add(restored, original.tag).commitNow()
    `when`(context.currentActivity).thenReturn(recreated)
    manager.onHostResume()
    callback.onVerificationFlowResult(VerificationFlowResult.Canceled)
    shadowOf(Looper.getMainLooper()).idle()

    verify(sheet).present("vs_test", "ek_test")
    assertEquals("FlowCanceled", resolved(promise).getString("status"))
    assertTrue(recreated.supportFragmentManager.fragments.isEmpty())
  }

  @Test
  fun `activity destruction settles the promise and ignores late SDK results`() {
    `when`(context.currentActivity).thenReturn(activity)
    val promise = mock(Promise::class.java)
    manager.present(options(), promise)
    shadowOf(Looper.getMainLooper()).idle()
    manager.onHostDestroy()
    callback.onVerificationFlowResult(VerificationFlowResult.Completed)
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals("FlowFailed", resolved(promise).getString("status"))
    assertTrue(activity.supportFragmentManager.fragments.isEmpty())
  }

  private fun options() = JavaOnlyMap.of(
    "sessionId", "vs_test",
    "ephemeralKeySecret", "ek_test",
    "brandLogo", JavaOnlyMap.of("uri", "https://example.com/logo.png"),
  )

  private fun resolved(promise: Promise): WritableMap {
    val captor = ArgumentCaptor.forClass(WritableMap::class.java)
    verify(promise).resolve(captor.capture())
    return captor.value
  }
}
