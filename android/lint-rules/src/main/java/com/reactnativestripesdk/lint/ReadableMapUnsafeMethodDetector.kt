package com.reactnativestripesdk.lint

import com.android.tools.lint.detector.api.Category
import com.android.tools.lint.detector.api.Detector
import com.android.tools.lint.detector.api.Implementation
import com.android.tools.lint.detector.api.Issue
import com.android.tools.lint.detector.api.JavaContext
import com.android.tools.lint.detector.api.Scope
import com.android.tools.lint.detector.api.Severity
import com.android.tools.lint.detector.api.SourceCodeScanner
import com.intellij.psi.PsiMethod
import org.jetbrains.uast.UCallExpression

/**
 * Detector that flags usage of unsafe ReadableMap getter methods that throw
 * exceptions when the key doesn't exist, and recommends using the safe extension
 * methods from com.reactnativestripesdk.utils.Extensions instead.
 */
class ReadableMapUnsafeMethodDetector : Detector(), SourceCodeScanner {

    override fun getApplicableMethodNames(): List<String> = listOf(
        "getBoolean",
        "getInt",
        "getDouble",
        "getLong",
    )

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        val evaluator = context.evaluator

        // Check if this is a method on ReadableMap
        if (evaluator.isMemberInClass(method, "com.facebook.react.bridge.ReadableMap")) {
            // Don't flag usage in Extensions.kt where the safe wrappers are implemented
            val containingFile = context.file.name
            if (containingFile == "Extensions.kt") {
                return
            }

            val methodName = method.name
            val safeAlternative = SAFE_ALTERNATIVES[methodName] ?: return

            context.report(
                issue = ISSUE,
                scope = node,
                location = context.getNameLocation(node),
                message = "Use `$safeAlternative` instead of `$methodName()`. " +
                    "`$methodName()` throws if the key doesn't exist."
            )
        }
    }

    companion object {
        private val SAFE_ALTERNATIVES = mapOf(
            "getBoolean" to "getBooleanOr() or getBooleanOrNull()",
            "getInt" to "getIntOr() or getIntOrNull()",
            "getDouble" to "getDoubleOr() or getDoubleOrNull()",
            "getLong" to "getLongOr() or getLongOrNull()",
        )

        private val IMPLEMENTATION = Implementation(
            ReadableMapUnsafeMethodDetector::class.java,
            Scope.JAVA_FILE_SCOPE
        )

        @JvmField
        val ISSUE = Issue.create(
            id = "ReadableMapUnsafeMethod",
            briefDescription = "Use safe ReadableMap extension methods",
            explanation = """
                `ReadableMap.getBoolean()`, `getInt()`, `getDouble()`, and `getLong()` throw exceptions \
                if the key doesn't exist in the map.

                Use the safe extension methods from `com.reactnativestripesdk.utils.Extensions` instead:
                - `getBooleanOr(key, default)` or `getBooleanOrNull(key)` instead of `getBoolean()`
                - `getIntOr(key, default)` or `getIntOrNull(key)` instead of `getInt()`
                - `getDoubleOr(key, default)` or `getDoubleOrNull(key)` instead of `getDouble()`
                - `getLongOr(key, default)` or `getLongOrNull(key)` instead of `getLong()`

                Example:
                ```kotlin
                // Instead of:
                map.getBoolean("key")
                map.getInt("count")
                map.getDouble("amount")

                // Use:
                map.getBooleanOr("key", default = false)
                map.getIntOr("count", default = 0)
                map.getDoubleOr("amount", default = 0.0)
                ```
            """,
            category = Category.CORRECTNESS,
            priority = 6,
            severity = Severity.WARNING,
            implementation = IMPLEMENTATION
        )
    }
}
