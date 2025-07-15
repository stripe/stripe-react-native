package com.reactnativestripesdk

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.platform.findViewTreeCompositionContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.findViewTreeViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.findViewTreeSavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
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
  /**
   * Dummy compose view that will be added at the root of the app, this is needed so that the context
   * that compose needs is already initialized and we can set it directly on our compose views.
   * If we do not do this there are cases where react-native initializes compose views in ways that
   * are not supported and causes crashes. An example is when using a compose view inside react-native
   * Modal component.
   */
  class CompatView(
    context: Context,
  ) : AbstractComposeView(context) {
    init {
      visibility = GONE
    }

    @Composable
    override fun Content() {
    }
  }

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
    // Setup lifecycles
    setViewCompositionStrategy(
      ViewCompositionStrategy.DisposeOnLifecycleDestroyed(lifecycleOwner = lifecycleOwner),
    )
    setViewTreeLifecycleOwner(lifecycleOwner = lifecycleOwner)

    // Setup context from dummy compose view.
    (context as ReactContext).getNativeModule(StripeSdkModule::class.java)?.composeCompatView?.let {
      setParentCompositionContext(it.findViewTreeCompositionContext())
      setViewTreeSavedStateRegistryOwner(it.findViewTreeSavedStateRegistryOwner())
      setViewTreeViewModelStoreOwner(it.findViewTreeViewModelStoreOwner())
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()

    if (isLifecycleSetup) {
      return
    }

    ((context as? ReactContext)?.currentActivity as? LifecycleOwner?)?.let {
      isLifecycleSetup = true

      // Setup the lifecycle to match the activity.
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
