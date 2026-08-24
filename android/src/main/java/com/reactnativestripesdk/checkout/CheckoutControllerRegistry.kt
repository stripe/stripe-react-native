package com.reactnativestripesdk.checkout

import java.util.UUID

/** Resources owned by one Checkout controller registered with the bridge. */
internal interface CheckoutControllerInstance {
  /** Releases all resources owned by this instance. Implementations must be idempotent. */
  fun destroy()
}

/** Stores Checkout controllers behind opaque identifiers used by JavaScript. */
internal class CheckoutControllerRegistry(
  private val controllerIdFactory: () -> String = { UUID.randomUUID().toString() },
) {
  private data class Entry(
    val instance: CheckoutControllerInstance,
    var eventSequence: Int = 0,
  )

  private val lock = Any()
  private val entries = mutableMapOf<String, Entry>()

  val size: Int
    get() = synchronized(lock) { entries.size }

  fun register(instance: CheckoutControllerInstance): String =
    synchronized(lock) {
      var controllerId = controllerIdFactory()
      while (entries.containsKey(controllerId)) {
        controllerId = controllerIdFactory()
      }

      entries[controllerId] = Entry(instance)
      controllerId
    }

  fun instance(controllerId: String): CheckoutControllerInstance? =
    synchronized(lock) {
      entries[controllerId]?.instance
    }

  /** Returns null after the controller has been removed. */
  fun nextEventSequence(controllerId: String): Int? =
    synchronized(lock) {
      val entry = entries[controllerId] ?: return@synchronized null
      entry.eventSequence += 1
      entry.eventSequence
    }

  fun remove(controllerId: String): Boolean {
    val instance = synchronized(lock) { entries.remove(controllerId)?.instance }
    instance?.destroy()
    return instance != null
  }

  fun clear() {
    val instances =
      synchronized(lock) {
        entries.values.map { it.instance }.also {
          entries.clear()
        }
      }

    instances.forEach { it.destroy() }
  }
}
