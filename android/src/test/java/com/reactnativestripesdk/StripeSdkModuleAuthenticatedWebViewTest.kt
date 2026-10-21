package com.reactnativestripesdk

import com.facebook.react.bridge.Promise
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class StripeSdkModuleAuthenticatedWebViewTest {
  @get:Rule
  internal val contextRule = ReactContextRule()

  @Test
  fun `rejects non-HTTPS and credentialed URLs before requesting an activity`() {
    val module = StripeSdkModule(contextRule.context)

    listOf(
      "http://connect.stripe.com/auth",
      "https://user:password@connect.stripe.com/auth",
      "not a URL",
    ).forEach { url ->
      val promise = mock(Promise::class.java)

      module.openAuthenticatedWebView("auth-id", url, promise)

      verify(promise).reject(
        "InvalidUrl",
        "Authenticated web view URL must be HTTPS and contain no credentials",
      )
      verify(promise, never()).resolve(any())
    }
  }

  @Test
  fun `rejects a valid URL when there is no current activity`() {
    val module = StripeSdkModule(contextRule.context)
    val promise = mock(Promise::class.java)

    module.openAuthenticatedWebView(
      "auth-id",
      "https://connect.stripe.com/auth?state=opaque",
      promise,
    )

    verify(promise).reject("MissingActivity", "Authenticated web view requires an active activity")
    verify(promise, never()).resolve(any())
    verify(promise, never()).reject(
      "InvalidUrl",
      "Authenticated web view URL must be HTTPS and contain no credentials",
    )
  }
}
