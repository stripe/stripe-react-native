package com.reactnativestripesdk.identity

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.reactnativestripesdk.utils.createError
import com.stripe.android.identity.IdentityVerificationSheet.VerificationFlowResult
import java.util.UUID

/** Owns one presentation, including its promise while the React Activity is recreated. */
internal class IdentityVerificationSheetManagerImpl(
  private val context: ReactApplicationContext,
  private val fragmentFactory: () -> IdentityVerificationSheetFragment = { IdentityVerificationSheetFragment() },
) : IdentityVerificationSheetManager, LifecycleEventListener {
  private var promise: Promise? = null
  private var fragment: IdentityVerificationSheetFragment? = null
  private var activity: FragmentActivity? = null
  private var fragmentTag: String? = null

  @Volatile private var invalidated = false

  override fun present(options: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread { presentOnUiThread(options, promise) }
  }

  @Suppress("TooGenericExceptionCaught")
  private fun presentOnUiThread(options: ReadableMap, promise: Promise) {
    if (invalidated) {
      promise.resolve(failedResult(IllegalStateException("Stripe SDK was invalidated.")))
      return
    }
    if (this.promise != null) {
      promise.resolve(failedResult(IllegalStateException("An Identity verification sheet is already presented.")))
      return
    }
    try {
      val sessionId = requireNotNull(options.getString("sessionId")?.takeIf { it.isNotBlank() }) {
        "sessionId is required."
      }
      val ephemeralKeySecret = requireNotNull(options.getString("ephemeralKeySecret")?.takeIf { it.isNotBlank() }) {
        "ephemeralKeySecret is required."
      }
      val logo = resolveBrandLogo(context, options.getMap("brandLogo")?.getString("uri"))
      val activity = requireNotNull(context.currentActivity as? FragmentActivity) {
        "Activity doesn't exist yet. You can safely retry this method."
      }
      check(!activity.isFinishing && !activity.isDestroyed && !activity.supportFragmentManager.isStateSaved) {
        "The current Activity is not ready to present Identity. You can safely retry this method."
      }
      val fragment = fragmentFactory().apply {
        arguments = IdentityVerificationSheetFragment.arguments(sessionId, ephemeralKeySecret, logo)
      }
      // Store the promise before adding the fragment: its lifecycle can immediately launch or fail.
      this.promise = promise
      this.activity = activity
      this.fragment = fragment
      fragmentTag = "StripeIdentity_${UUID.randomUUID()}"
      context.addLifecycleEventListener(this)
      fragment.setResultCallback(::finish)
      activity.supportFragmentManager.beginTransaction().add(fragment, fragmentTag).commit()
    } catch (error: Exception) {
      if (this.promise === promise) {
        finish(VerificationFlowResult.Failed(error))
      } else {
        promise.resolve(failedResult(error))
      }
    }
  }

  override fun invalidate() {
    invalidated = true
    UiThreadUtil.runOnUiThread {
      finish(VerificationFlowResult.Failed(IllegalStateException("Stripe SDK was invalidated.")))
    }
  }

  private fun finish(result: VerificationFlowResult) {
    val pendingPromise = promise ?: return
    promise = null
    val currentFragment = fragment
    val fragmentManager = activity?.supportFragmentManager
    fragment = null
    fragmentTag = null
    activity = null
    context.removeLifecycleEventListener(this)
    currentFragment?.dispose()
    if (currentFragment != null && fragmentManager != null && !fragmentManager.isDestroyed) {
      // Also remove a fragment whose add transaction has not executed yet.
      fragmentManager.beginTransaction().remove(currentFragment).commitAllowingStateLoss()
    }
    pendingPromise.resolve(mapResult(result))
  }

  override fun onHostResume() {
    if (promise == null) return
    val currentActivity = context.currentActivity as? FragmentActivity ?: return
    val restored = currentActivity.supportFragmentManager.findFragmentByTag(fragmentTag)
    if (restored !is IdentityVerificationSheetFragment) return
    // Another React Activity can resume without owning this presentation.
    activity = currentActivity
    if (restored !== fragment) {
      fragment?.setResultCallback(null)
      fragment = restored
      restored.setResultCallback(::finish)
    }
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    val currentActivity = context.currentActivity
    // A ReactContext can also report lifecycle events for another host Activity.
    if (currentActivity != null && activity != null && currentActivity !== activity) return
    if (activity?.isChangingConfigurations == true) {
      fragment?.setResultCallback(null)
      activity = null
    } else {
      val error = IllegalStateException("The Activity was destroyed during Identity verification.")
      finish(VerificationFlowResult.Failed(error))
    }
  }

  companion object {
    internal fun resolveBrandLogo(context: Context, uriString: String?): Uri {
      require(!uriString.isNullOrBlank()) { "brandLogo must resolve to an image URI." }
      val uri = Uri.parse(uriString)
      if (uri.scheme != null) return uri
      val resourceId = context.resources.getIdentifier(uriString, "drawable", context.packageName)
      require(resourceId != 0) { "brandLogo drawable resource was not found: $uriString" }
      return Uri.Builder()
        .scheme(ContentResolver.SCHEME_ANDROID_RESOURCE)
        .authority(context.resources.getResourcePackageName(resourceId))
        .appendPath(context.resources.getResourceTypeName(resourceId))
        .appendPath(context.resources.getResourceEntryName(resourceId))
        .build()
    }

    internal fun mapResult(result: VerificationFlowResult): WritableMap =
      when (result) {
        VerificationFlowResult.Completed -> Arguments.createMap().apply { putString("status", "FlowCompleted") }
        VerificationFlowResult.Canceled -> Arguments.createMap().apply { putString("status", "FlowCanceled") }
        is VerificationFlowResult.Failed -> failedResult(result.throwable)
      }

    private fun failedResult(error: Throwable): WritableMap =
      createError("FlowFailed", error).apply { putString("status", "FlowFailed") }
  }
}
