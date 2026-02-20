package com.reactnativestripesdk

import android.content.Context
import android.widget.FrameLayout
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
 * A wrapper around Compose views that safely handles React Native's layout system.
 *
 * This uses a FrameLayout wrapper pattern to solve the "Cannot locate windowRecomposer;
 * View is not attached to a window" crash that occurs when React Native measures views
 * before they are attached to the window hierarchy. By extending FrameLayout instead of
 * AbstractComposeView directly, the view can be safely measured before the Compose
 * infrastructure is ready.
 *
 * The inner ComposeView is only created when the wrapper is attached to the window,
 * ensuring the WindowRecomposer is always available.
 *
 * Compose disposes views by default when using Fragments, which is not compatible with how
 * react-native-screens work. To avoid this we change the composition strategy to use the
 * activity lifecycle instead of the fragment. Note that `setViewTreeLifecycleOwner` also
 * needs to be set otherwise a different code path will dispose of the view.
 *
 * **IMPORTANT** Views using this will need to call `handleOnDropViewInstance` manually to avoid leaking.
 * This can be done using the following code in the view manager:
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
) : FrameLayout(context) {
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

  private var innerComposeView: InnerComposeView? = null
  private var isLifecycleSetup = false
  private var activityLifecycleOwner: LifecycleOwner? = null
  private var activityLifecycleObserver: LifecycleEventObserver? = null

  // Create a lifecycle this is tied to the activity, but that we can manually
  // update to DESTROYED state when the view is dropped.
  private val lifecycleOwner: LifecycleOwner =
    object : LifecycleOwner {
      override val lifecycle: Lifecycle get() {
        return lifecycleRegistry
      }
    }
  private var lifecycleRegistry = LifecycleRegistry(lifecycleOwner)

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    ensureComposeViewCreated()
    setupActivityLifecycleObserver()
  }

  private fun ensureComposeViewCreated() {
    if (innerComposeView != null) return

    innerComposeView =
      InnerComposeView(context).also { cv ->
        // Setup lifecycles
        cv.setViewCompositionStrategy(
          ViewCompositionStrategy.DisposeOnLifecycleDestroyed(lifecycleOwner = lifecycleOwner),
        )
        cv.setViewTreeLifecycleOwner(lifecycleOwner = lifecycleOwner)

        // Setup context from dummy compose view (now safe since we're attached to window)
        (context as? ReactContext)?.getNativeModule(StripeSdkModule::class.java)?.composeCompatView?.let {
          cv.setParentCompositionContext(it.findViewTreeCompositionContext())
          cv.setViewTreeSavedStateRegistryOwner(it.findViewTreeSavedStateRegistryOwner())
          cv.setViewTreeViewModelStoreOwner(it.findViewTreeViewModelStoreOwner())
        }

        addView(cv, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
      }
  }

  private fun setupActivityLifecycleObserver() {
    if (isLifecycleSetup) {
      return
    }

    ((context as? ReactContext)?.currentActivity as? LifecycleOwner?)?.let { owner ->
      isLifecycleSetup = true
      activityLifecycleOwner = owner

      // Setup the lifecycle to match the activity.
      val observer =
        object : LifecycleEventObserver {
          override fun onStateChanged(
            source: LifecycleOwner,
            event: Lifecycle.Event,
          ) {
            if (lifecycleRegistry.currentState != Lifecycle.State.DESTROYED) {
              lifecycleRegistry.handleLifecycleEvent(event)
            }
          }
        }
      activityLifecycleObserver = observer
      owner.lifecycle.addObserver(observer)
    }
  }

  fun handleOnDropViewInstance() {
    activityLifecycleObserver?.let { observer ->
      activityLifecycleOwner?.lifecycle?.removeObserver(observer)
    }
    activityLifecycleObserver = null
    activityLifecycleOwner = null

    if (lifecycleRegistry.currentState.isAtLeast(Lifecycle.State.CREATED)) {
      lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }
  }

  @Composable
  abstract fun Content()

  private inner class InnerComposeView(
    context: Context,
  ) : AbstractComposeView(context) {
    @Composable
    override fun Content() {
      this@StripeAbstractComposeView.Content()
    }
  }
}
