package com.reactnativestripesdk

import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.android.controller.ActivityController

@RunWith(RobolectricTestRunner::class)
class PaymentSheetManagerFactoryTest {
  private val hosts = mutableListOf<ActivityController<FragmentActivity>>()
  private val createdFor = mutableListOf<FragmentActivity>()
  private val factory: PaymentSheetManagerFactory =
    DefaultPaymentSheetManagerFactory { activity ->
      createdFor.add(activity)
      mock(PaymentSheetManager::class.java)
    }

  @After
  fun tearDown() {
    factory.dispose()
    hosts.asReversed().forEach { host ->
      if (!host.get().isDestroyed) {
        host.pause().stop().destroy()
      }
    }
  }

  @Test
  fun getDoesNotCreateAnUninitializedManager() {
    val activity = newHost().get()

    assertNull(factory.get(activity))
    assertEquals(0, createdFor.size)
  }

  @Test
  fun reusesTheManagerOnlyForTheSameActivityInstance() {
    val firstHost = newHost().get()
    val secondHost = newHost().get()
    val first = factory.getOrCreate(firstHost)
    val second = factory.getOrCreate(secondHost)

    assertSame(first, factory.getOrCreate(firstHost))
    assertSame(first, factory.get(firstHost))
    assertSame(second, factory.get(secondHost))
    assertNotSame(first, second)
    assertEquals(listOf(firstHost, secondHost), createdFor)
  }

  @Test
  fun destructionOfTheOldHostDoesNotDisposeTheReplacementManager() {
    val oldHost = newHost()
    val first = requireNotNull(factory.getOrCreate(oldHost.get()))
    val newHost = newHost().get()
    val second = requireNotNull(factory.getOrCreate(newHost))

    oldHost.pause().stop().destroy()

    assertNull(factory.get(oldHost.get()))
    assertNull(factory.getOrCreate(oldHost.get()))
    assertSame(second, factory.getOrCreate(newHost))
    verify(first).onDispose()
    verify(second, never()).onDispose()
    assertEquals(2, createdFor.size)
  }

  @Test
  fun pausingForNativeUiDoesNotDisposeTheHostManager() {
    val host = newHost()
    val manager = requireNotNull(factory.getOrCreate(host.get()))

    host.pause().stop()
    assertSame(manager, factory.get(host.get()))
    host.restart().start().resume()

    assertSame(manager, factory.getOrCreate(host.get()))
    verify(manager, never()).onDispose()
  }

  @Test
  fun explicitDisposalRemovesTheObserverAndAllowsFreshInitialization() {
    val host = newHost()
    val lifecycle = host.get().lifecycle as LifecycleRegistry
    val originalObserverCount = lifecycle.observerCount
    val first = requireNotNull(factory.getOrCreate(host.get()))
    assertEquals(originalObserverCount + 1, lifecycle.observerCount)

    factory.dispose(host.get())

    assertNull(factory.get(host.get()))
    assertEquals(originalObserverCount, lifecycle.observerCount)
    verify(first).onDispose()
    val second = requireNotNull(factory.getOrCreate(host.get()))
    assertNotSame(first, second)
    host.pause().stop().destroy()

    verify(first, times(1)).onDispose()
    verify(second, times(1)).onDispose()
    assertNull(factory.get(host.get()))
  }

  @Test
  fun moduleDisposalReleasesAllManagersAndPreventsQueuedCreation() {
    val firstHost = newHost().get()
    val secondHost = newHost().get()
    val first = requireNotNull(factory.getOrCreate(firstHost))
    val second = requireNotNull(factory.getOrCreate(secondHost))

    factory.dispose()
    factory.dispose()

    verify(first, times(1)).onDispose()
    verify(second, times(1)).onDispose()
    assertNull(factory.get(firstHost))
    assertNull(factory.get(secondHost))
    assertNull(factory.getOrCreate(newHost().get()))
    assertEquals(2, createdFor.size)
  }

  @Test
  fun finishingAndDestroyedActivitiesCannotCreateManagers() {
    val finishing = newHost().get()
    finishing.finish()
    val destroyed = newHost()
    destroyed.pause().stop().destroy()

    assertEquals(Lifecycle.State.DESTROYED, destroyed.get().lifecycle.currentState)
    assertNull(factory.getOrCreate(finishing))
    assertNull(factory.getOrCreate(destroyed.get()))
    assertEquals(0, createdFor.size)
  }

  private fun newHost(): ActivityController<FragmentActivity> =
    Robolectric.buildActivity(FragmentActivity::class.java).setup().also(hosts::add)
}
