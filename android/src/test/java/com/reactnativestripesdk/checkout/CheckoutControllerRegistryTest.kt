package com.reactnativestripesdk.checkout

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckoutControllerRegistryTest {
  @Test
  fun `register stores multiple controllers behind opaque identifiers`() {
    val controllerIds = mutableListOf("controller-1", "controller-2").iterator()
    val registry = CheckoutControllerRegistry { controllerIds.next() }
    val first = TestCheckoutControllerInstance()
    val second = TestCheckoutControllerInstance()

    val firstId = registry.register(first)
    val secondId = registry.register(second)

    assertEquals("controller-1", firstId)
    assertEquals("controller-2", secondId)
    assertSame(first, registry.instance(firstId))
    assertSame(second, registry.instance(secondId))
    assertEquals(2, registry.size)
  }

  @Test
  fun `nextEventSequence orders events per controller`() {
    val controllerIds = mutableListOf("controller-1", "controller-2").iterator()
    val registry = CheckoutControllerRegistry { controllerIds.next() }
    val firstId = registry.register(TestCheckoutControllerInstance())
    val secondId = registry.register(TestCheckoutControllerInstance())

    assertEquals(1, registry.nextEventSequence(firstId))
    assertEquals(2, registry.nextEventSequence(firstId))
    assertEquals(1, registry.nextEventSequence(secondId))
  }

  @Test
  fun `remove destroys controller and rejects future events`() {
    val registry = CheckoutControllerRegistry { "controller-1" }
    val instance = TestCheckoutControllerInstance()
    val controllerId = registry.register(instance)

    assertTrue(registry.remove(controllerId))

    assertEquals(1, instance.destroyCallCount)
    assertNull(registry.instance(controllerId))
    assertNull(registry.nextEventSequence(controllerId))
    assertFalse(registry.remove(controllerId))
    assertEquals(1, instance.destroyCallCount)
  }

  @Test
  fun `clear destroys every controller once`() {
    val controllerIds = mutableListOf("controller-1", "controller-2").iterator()
    val registry = CheckoutControllerRegistry { controllerIds.next() }
    val first = TestCheckoutControllerInstance()
    val second = TestCheckoutControllerInstance()
    registry.register(first)
    registry.register(second)

    registry.clear()
    registry.clear()

    assertEquals(1, first.destroyCallCount)
    assertEquals(1, second.destroyCallCount)
    assertEquals(0, registry.size)
  }
}

private class TestCheckoutControllerInstance : CheckoutControllerInstance {
  var destroyCallCount = 0
    private set

  override fun destroy() {
    destroyCallCount += 1
  }
}
