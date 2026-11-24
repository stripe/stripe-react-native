@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.OnrampCoordinator
import kotlinx.coroutines.CancellationException
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.RETURNS_DEFAULTS
import org.mockito.Mockito.mock
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(RobolectricTestRunner::class)
class OnrampSdkModuleTest {
  @Test
  fun registerLinkUser_doesNotRethrowWhenResolveFailsAfterCoordinatorFailure() {
    val module = OnrampSdkModule(BridgeReactContext(RuntimeEnvironment.getApplication()))
    val coordinator =
      mock(OnrampCoordinator::class.java) { invocation ->
        if (invocation.method.name == "registerLinkUser") {
          throw IllegalStateException("coordinator failed")
        } else {
          RETURNS_DEFAULTS.answer(invocation)
        }
      }
    setPrivateField(module, "onrampCoordinator", coordinator)

    val worker = AtomicReference<Thread>()
    val entered = CountDownLatch(1)
    val promise =
      object : Promise by FakePromise() {
        override fun resolve(value: Any?) {
          worker.set(Thread.currentThread())
          entered.countDown()
          throw IllegalStateException("resolve failed")
        }
      }
    val escaped = AtomicReference<Throwable>()
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { _, error ->
      escaped.compareAndSet(null, error)
    }
    try {
      module.registerLinkUser(
        JavaOnlyMap.of(
          "email",
          "jenny@example.com",
          "phone",
          "+15555550100",
          "country",
          "US",
        ),
        promise,
      )
      assertTrue("registerLinkUser never resolved the failure", entered.await(5, TimeUnit.SECONDS))
      val thread = worker.get()
      val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
      while (thread.state == Thread.State.RUNNABLE && System.nanoTime() < deadline) {
        Thread.yield()
      }
      assertNotEquals(Thread.State.RUNNABLE, thread.state)
      assertNull(escaped.get())
    } finally {
      Thread.setDefaultUncaughtExceptionHandler(previous)
      module.invalidate()
    }
  }

  @Test
  fun registerLinkUser_doesNotResolveOnrampFailureWhenCoordinatorThrowsCancellationException() {
    val module = OnrampSdkModule(BridgeReactContext(RuntimeEnvironment.getApplication()))
    val coordinatorCanceled = CountDownLatch(1)
    val coordinator =
      mock(OnrampCoordinator::class.java) { invocation ->
        if (invocation.method.name == "registerLinkUser") {
          coordinatorCanceled.countDown()
          throw CancellationException("registerLinkUser canceled")
        } else {
          RETURNS_DEFAULTS.answer(invocation)
        }
      }
    setPrivateField(module, "onrampCoordinator", coordinator)

    val promise = FakePromise()
    try {
      module.registerLinkUser(JavaOnlyMap.of("email", "jenny@example.com"), promise)
      assertTrue(
        "registerLinkUser coordinator never threw CancellationException",
        coordinatorCanceled.await(5, TimeUnit.SECONDS),
      )
      promise.ensureAllEventsConsumed()
    } finally {
      module.invalidate()
    }
  }

  private fun setPrivateField(
    owner: Any,
    name: String,
    value: Any?,
  ) {
    owner.javaClass.getDeclaredField(name).apply { isAccessible = true }.set(owner, value)
  }
}
