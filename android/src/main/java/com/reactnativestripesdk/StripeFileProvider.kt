package com.reactnativestripesdk

/**
 * A custom FileProvider subclass for the Stripe React Native SDK.
 *
 * This class extends androidx.core.content.FileProvider to provide a unique
 * android:name in the manifest, preventing conflicts with other libraries that
 * also use FileProvider (e.g., react-native-document-viewer, expo-file-system).
 *
 * By using a library-specific class name, the Android manifest merger keeps
 * this provider separate from other FileProviders, avoiding the
 * "Attribute provider@authorities value=... is also present at..." error.
 *
 * No additional implementation is needed - this simply inherits all functionality
 * from the parent FileProvider class.
 */
class StripeFileProvider : androidx.core.content.FileProvider()
