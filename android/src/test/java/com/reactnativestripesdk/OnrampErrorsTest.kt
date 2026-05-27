package com.reactnativestripesdk

import com.stripe.android.core.StripeError
import com.stripe.android.core.exception.APIException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import kotlin.Lazy

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
        sdkVersion = "23.9.1",
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
    assertEquals("configure", details.getString("operation"))
    assertEquals("com.example.app", details.getString("appPackageName"))
    assertEquals("test", details.getString("mode"))
    assertEquals("23.9.1", details.getString("sdkVersion"))
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
        className = "com.stripe.android.crypto.onramp.exception.UncategorizedApiErrorException",
        reason = "consumer_session_expired",
        operation = "authorize",
        appPackageName = "com.example.app",
        mode = "live",
        sdkVersion = "23.9.1",
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
    assertEquals("authorize", details.getString("operation"))
    assertEquals("req_auth", details.getString("requestId"))
    assertTrue(details.getString("developerMessage")!!.contains("code: consumer_session_expired"))
  }

  private fun createOnrampException(
    className: String,
    reason: String,
    operation: String,
    appPackageName: String,
    mode: String,
    sdkVersion: String,
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
    val constructor =
      Class
        .forName(className)
        .getDeclaredConstructor(
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          String::class.java,
          Lazy::class.java,
          Throwable::class.java,
        ).apply {
          isAccessible = true
        }

    return constructor.newInstance(
      reason,
      operation,
      appPackageName,
      mode,
      sdkVersion,
      apiErrorCode,
      apiErrorType,
      apiErrorMessage,
      apiUserMessage,
      docUrl,
      lazy { "Fallback user message" },
      cause,
    ) as Exception
  }
}
