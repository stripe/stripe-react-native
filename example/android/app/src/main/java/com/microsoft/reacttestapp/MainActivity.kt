package com.microsoft.reacttestapp

import android.content.Intent
import android.os.Bundle
import android.util.Log

/**
 * Custom MainActivity that extends RNTA's base to handle deep links with singleTask.
 * This file shadows the one in node_modules/react-native-test-app.
 */
class MainActivity : com.facebook.react.ReactActivity() {

    companion object {
        private const val TAG = "MainActivity"
        const val REQUEST_CODE_PERMISSIONS = 42
    }

    private val testApp: TestApp
        get() = application as TestApp

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate with intent: ${intent?.dataString}")
    }

    /**
     * CRITICAL: This method handles deep links when the app is already running.
     * With launchMode="singleTask", this is called instead of onCreate when
     * a deep link brings the app to foreground.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent) // ReactActivity handles sending to Linking module
        Log.d(TAG, "onNewIntent with data: ${intent.dataString}")
        setIntent(intent) // Update current intent
    }

    override fun getMainComponentName(): String? {
        return testApp.manifest.singleApp ?: "example"
    }
}
