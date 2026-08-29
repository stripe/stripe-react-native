package com.reactnativestripesdk.checkout

import androidx.annotation.MainThread
import com.facebook.react.bridge.UiThreadUtil
import java.util.UUID

/**
 * Resources owned by one Checkout controller registered with the bridge.
 *
 * Concrete instances own the native Checkout object, its stable Payment Element and presenter,
 * observation jobs, and pending operations.
 */
internal interface CheckoutControllerInstance {
  /** Releases all resources owned by this instance. Must be idempotent and run on the UI thread. */
  @MainThread
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

  private val entries = mutableMapOf<String, Entry>()

  val size: Int
    @MainThread
    get() {
      UiThreadUtil.assertOnUiThread()
      return entries.size
    }

  @MainThread
  fun register(instance: CheckoutControllerInstance): String {
    UiThreadUtil.assertOnUiThread()

    var controllerId = controllerIdFactory()
    while (entries.containsKey(controllerId)) {
      controllerId = controllerIdFactory()
    }

    entries[controllerId] = Entry(instance)
    return controllerId
  }

  @MainThread
  fun instance(controllerId: String): CheckoutControllerInstance? {
    UiThreadUtil.assertOnUiThread()
    return entries[controllerId]?.instance
  }

  /** Returns null after the controller has been removed. */
  @MainThread
  fun nextEventSequence(controllerId: String): Int? {
    UiThreadUtil.assertOnUiThread()
    val entry = entries[controllerId] ?: return null
    entry.eventSequence += 1
    return entry.eventSequence
  }

  @MainThread
  fun remove(controllerId: String): Boolean {
    UiThreadUtil.assertOnUiThread()
    val instance = entries.remove(controllerId)?.instance
    instance?.destroy()
    return instance != null
  }

  @MainThread
  fun clear() {
    UiThreadUtil.assertOnUiThread()
    val instances = entries.values.map { it.instance }
    entries.clear()

    instances.forEach { it.destroy() }
  }
}
