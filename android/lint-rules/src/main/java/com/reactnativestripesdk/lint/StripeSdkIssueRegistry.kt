package com.reactnativestripesdk.lint

import com.android.tools.lint.client.api.IssueRegistry
import com.android.tools.lint.client.api.Vendor
import com.android.tools.lint.detector.api.CURRENT_API

class StripeSdkIssueRegistry : IssueRegistry() {
    override val api = CURRENT_API

    override val issues = listOf(
        ReadableMapUnsafeMethodDetector.ISSUE,
    )

    override val vendor = Vendor(
        vendorName = "Stripe React Native SDK",
        identifier = "com.reactnativestripesdk",
        feedbackUrl = "https://github.com/stripe/stripe-react-native/issues"
    )
}
