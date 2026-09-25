package com.reactnativestripesdk

import androidx.annotation.MainThread
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import java.util.IdentityHashMap

/** Owns one PaymentSheet manager per React host Activity. */
@MainThread
internal interface PaymentSheetManagerFactory {
  fun get(activity: FragmentActivity): PaymentSheetManager?

  fun getOrCreate(activity: FragmentActivity): PaymentSheetManager?

  fun dispose(activity: FragmentActivity)

  fun dispose()
}

@MainThread
internal class DefaultPaymentSheetManagerFactory(
  private val createManager: (FragmentActivity) -> PaymentSheetManager,
) : PaymentSheetManagerFactory {
  private class Entry(
    val manager: PaymentSheetManager,
    val observer: DefaultLifecycleObserver,
  )

  private val entries = IdentityHashMap<FragmentActivity, Entry>()
  private var disposed = false

  override fun get(activity: FragmentActivity): PaymentSheetManager? =
    if (canUse(activity)) entries[activity]?.manager else null

  override fun getOrCreate(activity: FragmentActivity): PaymentSheetManager? {
    if (!canUse(activity)) return null
    entries[activity]?.let { return it.manager }

    val manager = createManager(activity)
    val observer =
      object : DefaultLifecycleObserver {
        override fun onDestroy(owner: LifecycleOwner) {
          if (entries[activity]?.manager === manager) {
            dispose(activity)
          }
        }
      }
    entries[activity] = Entry(manager, observer)
    activity.lifecycle.addObserver(observer)
    return manager
  }

  override fun dispose(activity: FragmentActivity) {
    val entry = entries.remove(activity) ?: return
    activity.lifecycle.removeObserver(entry.observer)
    entry.manager.onDispose()
  }

  override fun dispose() {
    if (disposed) return
    disposed = true
    entries.keys.toList().forEach(::dispose)
  }

  private fun canUse(activity: FragmentActivity): Boolean =
    !disposed &&
      !activity.isFinishing &&
      !activity.isDestroyed &&
      activity.lifecycle.currentState != Lifecycle.State.DESTROYED
}
