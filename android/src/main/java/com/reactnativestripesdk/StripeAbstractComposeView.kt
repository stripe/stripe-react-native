package com.reactnativestripesdk

import android.content.Context
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import com.facebook.react.bridge.ReactContext

/**
 * Compose disposes views by default when using Fragments, which is not compatible with how
 * react-native-screens work. To avoid this we change the composition strategy to use the
 * activity lifecycle instead of the fragment. Note that `setViewTreeLifecycleOwner` also
 * needs to be set otherwise a different code path will dispose of the view.
 *
 * **IMPORTANT** Views using this will need to call `handleOnDropViewInstance` manually to avoid leaking.
 * This can be done using the using the following code in the view manager:
 *
 * ```
 * override fun onDropViewInstance(view: SomeStripeAbstractComposeView) {
 *   super.onDropViewInstance(view)
 *
 *   view.handleOnDropViewInstance()
 * }
 * ```
 */
abstract class StripeAbstractComposeView(
  context: Context,
) : AbstractComposeView(context) {
  private var isLifecycleSetup = false

  // Create a lifecycle this is tied to the activity, but that we can manually
  // update to DESTROYED state when the view is dropped.
  private val lifecycleOwner: LifecycleOwner =
    object : LifecycleOwner {
      override val lifecycle: Lifecycle get() {
        return lifecycleRegistry
      }
    }
  private var lifecycleRegistry = LifecycleRegistry(lifecycleOwner)

  init {
    setViewCompositionStrategy(
      ViewCompositionStrategy.DisposeOnLifecycleDestroyed(lifecycleOwner = lifecycleOwner),
    )
    setViewTreeLifecycleOwner(lifecycleOwner = lifecycleOwner)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()

    if (isLifecycleSetup) {
      return
    }

    ((context as? ReactContext)?.currentActivity as? LifecycleOwner?)?.let {
      isLifecycleSetup = true

      // Setup our lifecycle to match the activity.
      it.lifecycle.addObserver(
        object : LifecycleEventObserver {
          override fun onStateChanged(
            source: LifecycleOwner,
            event: Lifecycle.Event,
          ) {
            lifecycleRegistry.handleLifecycleEvent(event)
          }
        },
      )
    }
  }

  fun handleOnDropViewInstance() {
    // Update the lifecycle state to DESTROYED to cause the composition to be destroyed.
    lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
  }
}
