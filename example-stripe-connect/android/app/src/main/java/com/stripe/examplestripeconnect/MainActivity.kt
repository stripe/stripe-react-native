package com.stripe.examplestripeconnect

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import com.reactnativestripesdk.StripeSdkModule

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
   * Intercept stripe-connect:// deep links and store them in the SDK
   * WITHOUT broadcasting to React Native's Linking module.
   *
   * This prevents Expo Router from receiving the URL and dismissing the screen.
   *
   * NOTE: This manual implementation is OPTIONAL. The SDK now handles stripe-connect://
   * URLs automatically via StripeConnectDeepLinkInterceptor Activity.
   * This code is kept as a reference implementation for advanced use cases.
   */
  override fun onNewIntent(intent: Intent) {
    val uri: Uri? = intent.data
    if (uri != null && uri.scheme == "stripe-connect") {
      // Store using SDK's static method
      StripeSdkModule.storeStripeConnectDeepLink(uri.toString())

      // CRITICAL: Do NOT call super.onNewIntent() for stripe-connect URLs
      // This prevents React Native's Linking module from broadcasting to Expo Router
      return
    }

    // For all other URLs, use normal handling
    super.onNewIntent(intent)
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
