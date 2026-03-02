package com.reactnativestripesdk

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log

/**
 * Transparent interceptor Activity that captures stripe-connect:// deep links
 * before they reach React Native's Linking module.
 *
 * This prevents Expo Router from receiving the URL and dismissing the current screen.
 * The URL is stored in StripeSdkModule's internal storage and retrieved via polling.
 *
 * HOW IT WORKS:
 * 1. Android launches this Activity when a stripe-connect:// URL is opened
 * 2. onCreate() extracts the URL and stores it via StripeSdkModule.storeStripeConnectDeepLink()
 * 3. Launches an Intent to bring the main app to the foreground
 * 4. The Activity immediately finishes without showing any UI
 * 5. JavaScript polls for URLs via NativeStripeSdk.pollAndClearPendingStripeConnectUrls()
 *
 * MANIFEST CONFIGURATION:
 * The AndroidManifest.xml declares this Activity with:
 * - android:exported="true" - allows deep links from outside the app
 * - android:launchMode="singleTask" - reuses existing instance if available
 * - android:theme="@android:style/Theme.Translucent.NoTitleBar" - transparent UI
 * - Intent filter for stripe-connect:// scheme
 *
 * USER IMPACT:
 * - Zero configuration required by users
 * - Works automatically for all package names
 * - No MainActivity override needed
 */
class StripeConnectDeepLinkInterceptorActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Extract the deep link URL from the Intent
    val url = intent?.data?.toString()

    if (url != null && url.startsWith("stripe-connect://")) {
      // Store in SDK's internal storage (thread-safe)
      StripeSdkModule.storeStripeConnectDeepLink(url)
    } else {
      Log.w(TAG, "Unexpected URL scheme in StripeConnectDeepLinkInterceptor: $url")
    }

    // Bring the main app back to the foreground
    // This is critical because when Custom Tabs opens a deep link,
    // the interceptor Activity starts in a new task. When it finishes,
    // Android doesn't automatically return to the main app - it just shows
    // the Custom Tab again. We need to explicitly bring the app forward.
    try {
      val packageName = applicationContext.packageName
      val launchIntent = packageManager.getLaunchIntentForPackage(packageName)

      if (launchIntent != null) {
        // Flags to bring existing task to front without recreating activities
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        startActivity(launchIntent)
      } else {
        Log.w(TAG, "Could not get launch intent for package: $packageName")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error bringing app to foreground", e)
    }

    // Immediately finish - don't show any UI
    // This makes the Activity transparent to the user
    finish()
  }

  companion object {
    private const val TAG = "StripeConnectInterceptor"
  }
}
