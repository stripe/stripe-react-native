package com.reactnativestripesdk

import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.reactnativestripesdk.customersheet.CustomerSheetManager
import com.stripe.android.core.reactnative.ReactNativeSdkInternal
import com.stripe.android.customersheet.CustomerSheet
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLooper
import org.robolectric.util.ReflectionHelpers

@OptIn(ExperimentalCoroutinesApi::class, ReactNativeSdkInternal::class)
@RunWith(RobolectricTestRunner::class)
class ReactNativeCustomerSessionProviderTest {
  @Test
  fun `both providers route reverse responses and ignore duplicate or unknown IDs`() =
    runTest {
      for (kind in Kind.values()) {
        val fixture = Fixture()
        val first = async { fixture.request(kind) }
        val second = async { fixture.request(kind) }
        runCurrent()
        val (firstId, secondId) = fixture.ids(kind)
        assertNotEquals(firstId, secondId)

        assertTrue(fixture.resolve(kind, secondId, success("B")))
        assertValue(kind, "B", second.await().getOrThrow())
        assertFalse(first.isCompleted)
        assertFalse(fixture.resolve(kind, secondId, success("duplicate")))
        assertFalse(fixture.resolve(kind, "unknown", success("unknown")))
        assertEquals(1, fixture.provider.pendingRequestCount)
        assertTrue(fixture.resolve(kind, firstId, success("A")))
        assertValue(kind, "A", first.await().getOrThrow())
        assertEquals(0, fixture.provider.pendingRequestCount)
      }
    }

  @Test
  fun `both providers complete failures and malformed matching responses`() =
    runTest {
      for (kind in Kind.values()) {
        val fixture = Fixture()
        val responses =
          listOf(
            JavaOnlyMap.of("error", "Merchant failed"),
            JavaOnlyMap.of("clientSecret", 123),
            JavaOnlyMap.of("error", 123),
            JavaOnlyMap.of("clientSecret", ""),
            JavaOnlyMap(),
          )
        for (response in responses) {
          val task = async { fixture.request(kind) }
          runCurrent()
          val requestId = fixture.ids(kind).last()
          assertTrue(fixture.resolve(kind, requestId, response))
          assertTrue(task.await().isFailure)
          assertFalse(fixture.resolve(kind, requestId, success("late")))
          assertEquals(0, fixture.provider.pendingRequestCount)
        }
      }
    }

  @Test
  fun `missing customer ID fails only the matching CustomerSession request`() =
    runTest {
      val fixture = Fixture()
      val task = async { fixture.provider.providesCustomerSessionClientSecret() }
      runCurrent()
      assertTrue(
        fixture.provider.resolveCustomerSession(
          fixture.sessions.single(),
          JavaOnlyMap.of("clientSecret", "secret"),
        ),
      )
      assertEquals("Missing or invalid customerId", task.await().exceptionOrNull()?.message)
      assertEquals(0, fixture.provider.pendingRequestCount)
    }

  @Test
  fun `canceling a caller removes only its pending request`() =
    runTest {
      for (kind in Kind.values()) {
        val fixture = Fixture()
        val first = async { fixture.request(kind) }
        val second = async { fixture.request(kind) }
        runCurrent()
        val (firstId, secondId) = fixture.ids(kind)
        first.cancelAndJoin()
        assertFalse(fixture.resolve(kind, firstId, success("late")))
        assertEquals(1, fixture.provider.pendingRequestCount)
        assertTrue(fixture.resolve(kind, secondId, success("second")))
        assertValue(kind, "second", second.await().getOrThrow())
      }
    }

  @Test
  fun `invalidation drains both providers and rejects future requests`() =
    runTest {
      val fixture = Fixture()
      val setup = async { fixture.request(Kind.Setup) }
      val session = async { fixture.request(Kind.Session) }
      runCurrent()
      fixture.provider.invalidate()
      fixture.provider.invalidate()
      runCurrent()
      assertTrue(setup.isCancelled)
      assertTrue(session.isCancelled)
      assertEquals(0, fixture.provider.pendingRequestCount)
      assertFalse(fixture.resolve(Kind.Setup, fixture.setups.single(), success("late")))
      assertFalse(fixture.resolve(Kind.Session, fixture.sessions.single(), success("late")))
      for (kind in Kind.values()) {
        try {
          fixture.request(kind)
          throw AssertionError("Invalidated provider accepted a request")
        } catch (_: CancellationException) {
          // A destroyed sheet cannot start new work.
        }
      }
      assertEquals(1, fixture.setups.size)
      assertEquals(1, fixture.sessions.size)
    }

  @Test
  fun `destroying the manager cancels its provider and stale replies cannot complete a replacement`() =
    runTest {
      val old = Fixture()
      val setup = async { old.request(Kind.Setup) }
      val session = async { old.request(Kind.Session) }
      runCurrent()
      val manager =
        CustomerSheetManager(
          mock(ReactApplicationContext::class.java),
          JavaOnlyMap(),
          JavaOnlyMap(),
          mock(Promise::class.java),
        )
      manager.customerSessionProvider = old.provider
      manager.destroy()
      ShadowLooper.runUiThreadTasks()
      runCurrent()
      assertTrue(setup.isCancelled)
      assertTrue(session.isCancelled)
      assertEquals(0, old.provider.pendingRequestCount)

      val replacement = Fixture()
      val pending = async { replacement.request(Kind.Session) }
      runCurrent()
      assertFalse(replacement.resolve(Kind.Session, old.sessions.single(), success("stale")))
      assertFalse(pending.isCompleted)
      assertTrue(replacement.resolve(Kind.Session, replacement.sessions.single(), success("new")))
      assertValue(Kind.Session, "new", pending.await().getOrThrow())
    }

  @Test
  fun `registration precedes emission and emitter failures do not leak`() =
    runTest {
      lateinit var immediate: ReactNativeCustomerSessionProvider
      immediate =
        ReactNativeCustomerSessionProvider(
          configuration(),
          { assertTrue(immediate.resolveSetupIntent(it, success("immediate"))) },
          { throw IllegalStateException("No emitter") },
        )
      assertEquals("secret_immediate", immediate.provideSetupIntentClientSecret("cus_test").getOrThrow())
      assertEquals("No emitter", immediate.providesCustomerSessionClientSecret().exceptionOrNull()?.message)
      assertEquals(0, immediate.pendingRequestCount)
    }

  private enum class Kind { Setup, Session }

  private class Fixture {
    val setups = mutableListOf<String>()
    val sessions = mutableListOf<String>()
    val provider = ReactNativeCustomerSessionProvider(configuration(), { setups.add(it) }, { sessions.add(it) })

    suspend fun request(kind: Kind): Result<Any> =
      when (kind) {
        Kind.Setup -> provider.provideSetupIntentClientSecret("cus_test")
        Kind.Session -> provider.providesCustomerSessionClientSecret()
      }

    fun ids(kind: Kind): List<String> = if (kind == Kind.Setup) setups else sessions

    fun resolve(
      kind: Kind,
      requestId: String,
      result: ReadableMap,
    ): Boolean =
      when (kind) {
        Kind.Setup -> provider.resolveSetupIntent(requestId, result)
        Kind.Session -> provider.resolveCustomerSession(requestId, result)
      }
  }

  companion object {
    private fun configuration() = CustomerSheet.IntentConfiguration.Builder().build()

    private fun success(label: String) = JavaOnlyMap.of("clientSecret", "secret_$label", "customerId", "cus_$label")

    private fun assertValue(
      kind: Kind,
      label: String,
      value: Any,
    ) {
      when (kind) {
        Kind.Setup -> assertEquals("secret_$label", value)
        Kind.Session -> {
          assertTrue(value is CustomerSheet.CustomerSessionClientSecret)
          assertEquals("cus_$label", ReflectionHelpers.getField<String>(value, "customerId"))
          assertEquals("secret_$label", ReflectionHelpers.getField<String>(value, "clientSecret"))
        }
      }
    }
  }
}
