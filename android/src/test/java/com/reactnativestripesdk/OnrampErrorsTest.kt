@file:OptIn(ExperimentalCryptoOnramp::class)

package com.reactnativestripesdk

import com.stripe.android.core.StripeError
import com.stripe.android.core.exception.APIException
import com.stripe.android.crypto.onramp.ExperimentalCryptoOnramp
import com.stripe.android.crypto.onramp.exception.APIErrorContext
import com.stripe.android.crypto.onramp.exception.SDKVersion
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class OnrampErrorsTest {
  @Test
  fun createOnrampFailedError_withAppAttestationException_preservesOnrampDiagnostics() {
    val error =
      createOnrampException(
        className = "com.stripe.android.crypto.onramp.exception.AppAttestationException",
        reason = "android_package_name_mismatch",
        operation = "configure",
        appPackageName = "com.example.app",
        mode = "test",
        sdkVersions =
          listOf(
            SDKVersion(name = "stripe-android", version = "23.9.1"),
            SDKVersion(name = "stripe-react-native", version = "0.66.0"),
          ),
        userMessage = "App attestation failed.",
        apiErrorCode = "link_failed_to_attest_request",
        apiErrorType = "api_error",
        apiErrorMessage = "Attestation request could not be verified.",
        apiUserMessage = "App attestation failed.",
        docUrl = "https://docs.stripe.com/errors/app-attestation",
        requestId = "req_attestation",
      )

    val details = createOnrampFailedError(error).getMap("error")

    assertNotNull(details)
    assertEquals("Failed", details!!.getString("code"))
    assertEquals("AppAttestationError", details.getString("onrampErrorType"))
    assertEquals("App attestation failed.", details.getString("message"))
    assertEquals("App attestation failed.", details.getString("localizedMessage"))
    assertEquals("App attestation failed.", details.getString("userMessage"))
    assertEquals("link_failed_to_attest_request", details.getString("stripeErrorCode"))
    assertEquals("link_failed_to_attest_request", details.getString("apiErrorCode"))
    assertEquals("api_error", details.getString("type"))
    assertEquals("api_error", details.getString("apiErrorType"))
    assertEquals("android_package_name_mismatch", details.getString("reason"))
    assertEquals("req_attestation", details.getString("requestId"))
    assertEquals(
      "Attestation request could not be verified.",
      details.getString("apiErrorMessage"),
    )
    assertEquals("App attestation failed.", details.getString("apiUserMessage"))
    assertEquals(
      "https://docs.stripe.com/errors/app-attestation",
      details.getString("docUrl"),
    )
    assertTrue(details.getString("developerMessage")!!.contains("operation: configure"))
    assertTrue(details.getString("developerMessage")!!.contains("request_id: req_attestation"))
  }

  @Test
  fun createOnrampFailedError_withUncategorizedApiError_preservesStripeCodes() {
    val error =
      createOnrampException(
        className = "com.stripe.android.crypto.onramp.exception.UncategorizedException",
        reason = "consumer_session_expired",
        operation = "authorize",
        appPackageName = "com.example.app",
        mode = "live",
        sdkVersions = listOf(SDKVersion(name = "stripe-android", version = "23.9.1")),
        userMessage = "Session expired. Please sign in again.",
        apiErrorCode = "consumer_session_expired",
        apiErrorType = "authentication_error",
        apiErrorMessage = "The consumer session has expired.",
        apiUserMessage = "Session expired. Please sign in again.",
        docUrl = "https://docs.stripe.com/error-codes/consumer-session-expired",
        requestId = "req_auth",
      )

    val details = createOnrampFailedError(error).getMap("error")

    assertNotNull(details)
    assertEquals("UncategorizedApiError", details!!.getString("onrampErrorType"))
    assertEquals("consumer_session_expired", details.getString("stripeErrorCode"))
    assertEquals("authentication_error", details.getString("type"))
    assertEquals("Session expired. Please sign in again.", details.getString("message"))
    assertEquals("Session expired. Please sign in again.", details.getString("userMessage"))
    assertEquals("req_auth", details.getString("requestId"))
    assertTrue(details.getString("developerMessage")!!.contains("Code: consumer_session_expired"))
  }

  private fun createOnrampException(
    className: String,
    reason: String,
    operation: String,
    appPackageName: String,
    mode: String,
    sdkVersions: List<SDKVersion>,
    userMessage: String,
    apiErrorCode: String,
    apiErrorType: String,
    apiErrorMessage: String,
    apiUserMessage: String,
    docUrl: String,
    requestId: String,
  ): Exception {
    val stripeError =
      StripeError(
        type = apiErrorType,
        message = apiErrorMessage,
        code = apiErrorCode,
        docUrl = docUrl,
      )
    val cause = APIException(stripeError = stripeError, requestId = requestId)
    val context =
      APIErrorContext(
        reason = reason,
        apiErrorCode = apiErrorCode,
        apiErrorType = apiErrorType,
        apiErrorMessage = apiErrorMessage,
        apiUserMessage = apiUserMessage,
        docUrl = docUrl,
        underlyingError = cause,
      )
    val diagnosticContextClass =
      Class.forName("com.stripe.android.crypto.onramp.exception.DiagnosticContext")
    val diagnosticContext =
      diagnosticContextClass
        .getDeclaredConstructor(
          List::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
        ).apply {
          isAccessible = true
        }.newInstance(
          sdkVersions,
          operation,
          appPackageName,
          mode,
        )

    // The exception classes in the `com.stripe.android.crypto.onramp.exception` package
    // don't have public constructors, so we use reflection to create instances for testing.
    val constructor =
      Class
        .forName(className)
        .getDeclaredConstructor(
          APIErrorContext::class.java,
          diagnosticContextClass,
          String::class.java,
        ).apply {
          isAccessible = true
        }

    return constructor.newInstance(
      context,
      diagnosticContext,
      userMessage,
    ) as Exception
  }
}
