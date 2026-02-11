package com.reactnativestripesdk

import android.app.Activity
import android.os.Bundle

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
 * 3. The Activity immediately finishes without showing any UI
 * 4. JavaScript polls for URLs via NativeStripeSdk.pollPendingStripeConnectUrls()
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
class StripeConnectDeepLinkInterceptor : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Extract the deep link URL from the Intent
    val url = intent?.data?.toString()

    if (url != null && url.startsWith("stripe-connect://")) {
      // Store in SDK's internal storage (thread-safe)
      StripeSdkModule.storeStripeConnectDeepLink(url)
    }

    // Immediately finish - don't show any UI
    // This makes the Activity transparent to the user
    finish()
  }
}
