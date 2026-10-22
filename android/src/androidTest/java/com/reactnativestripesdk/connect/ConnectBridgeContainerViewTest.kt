package com.reactnativestripesdk.connect

import android.app.Activity
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.atomic.AtomicInteger
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import org.json.JSONTokener

@RunWith(AndroidJUnit4::class)
class ConnectBridgeContainerViewTest {
  @Test
  fun consecutiveInitializationUpdatesKeepAllChangesUntilWrapperIsReady() {
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))

    val requestLatch = CountDownLatch(1)
    val pageDidLoadLatch = CountDownLatch(1)
    val wrapperInstalledLatch = CountDownLatch(1)
    val requestDocumentId = AtomicReference<String>()
    val webViewReference = AtomicReference<WebView>()
    val containerReference = AtomicReference<ConnectBridgeContainerView>()
    lateinit var webView: WebView
    lateinit var container: ConnectBridgeContainerView
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        webView = WebView(activity).apply { settings.javaScriptEnabled = true }
        container = ConnectBridgeContainerView(activity).apply {
          contextId = "initialization-race-context"
          initializationObjectJson = INIT_A
          onRequest = { request ->
            when (JSONObject(request.rawMessage).optString("type")) {
              "fetchClientSecret" -> {
                requestDocumentId.set(request.documentId)
                container.claimForTest(request) { result ->
                  assertTrue(result.admitted)
                  assertTrue(container.reply(request.attachmentId, request.requestHandle, reply("cs_test_fixture")))
                  requestLatch.countDown()
                }
              }
              "pageDidLoad" -> pageDidLoadLatch.countDown()
            }
          }
          onReady = {
            webView.loadDataWithBaseURL(
              TRUSTED_ORIGIN,
              INITIALIZATION_RACE_FIXTURE,
              "text/html",
              "UTF-8",
              null,
            )
          }
        }
        webViewReference.set(webView)
        containerReference.set(container)
        container.onAfterUpdateTransaction()
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("Initial Connect document did not send a request", requestLatch.await(10, TimeUnit.SECONDS))
      val activeWebView = requireNotNull(webViewReference.get())
      val activeContainer = requireNotNull(containerReference.get())

      scenario.onActivity {
        activeContainer.initializationObjectJson = INIT_B
        activeContainer.onAfterUpdateTransaction()
        // WebView evaluates scripts in order. This callback runs after the B update
        // evaluation has returned, so C is a distinct update while the wrapper is
        // still held behind the fixture's readiness gate.
        activeWebView.evaluateJavascript("true") {
          activeContainer.initializationObjectJson = INIT_C
          activeContainer.onAfterUpdateTransaction()
          activeWebView.evaluateJavascript("window.installWrapper()") {
            wrapperInstalledLatch.countDown()
          }
        }
      }

      assertTrue("Wrapper installation script did not run", wrapperInstalledLatch.await(5, TimeUnit.SECONDS))
      assertTrue("Wrapper readiness message did not reach native", pageDidLoadLatch.await(5, TimeUnit.SECONDS))
      val applied = awaitJavascriptValue(activeWebView, "JSON.stringify({locale:window.__connectInstanceUpdate.locale, marker:window.__componentPropUpdate.value, document:window.__stripeConnectDocument})") {
        val value = runCatching { JSONTokener(it).nextValue() as? String }.getOrNull()
        val result = runCatching { value?.let { json -> JSONObject(json) } }.getOrNull()
        result?.optString("marker") == "new"
      }
      val appliedValues = JSONObject(JSONTokener(applied).nextValue() as String)
      assertEquals("fr", appliedValues.getString("locale"))
      assertEquals("new", appliedValues.getString("marker"))
      assertEquals(requestDocumentId.get(), appliedValues.getString("document"))
    } finally {
      scenario.close()
    }
  }

  @Test
  fun readinessDuringInFlightInitializationUpdateRetriesAfterFailedEvaluation() {
    val requestLatch = CountDownLatch(1)
    val firstEvaluationLatch = CountDownLatch(1)
    val pageDidLoadLatch = CountDownLatch(1)
    val firstEvaluationResult = AtomicReference<String>()
    val releaseFirstCompletion = AtomicReference<((String?) -> Unit)?>()
    val webViewReference = AtomicReference<WebView>()
    val containerReference = AtomicReference<ConnectBridgeContainerView>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        val webView = WebView(activity).apply { settings.javaScriptEnabled = true }
        val container = ConnectBridgeContainerView(activity).apply {
          contextId = "readiness-in-flight-context"
          initializationObjectJson = INIT_A
          onRequest = { request ->
            when (JSONObject(request.rawMessage).optString("type")) {
              "fetchClientSecret" -> requestLatch.countDown()
              "pageDidLoad" -> pageDidLoadLatch.countDown()
            }
          }
          onReady = {
            webView.loadDataWithBaseURL(
              TRUSTED_ORIGIN,
              INITIALIZATION_RACE_FIXTURE,
              "text/html",
              "UTF-8",
              null,
            )
          }
        }
        webViewReference.set(webView)
        containerReference.set(container)
        container.onAfterUpdateTransaction()
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("Initial Connect request did not reach native", requestLatch.await(10, TimeUnit.SECONDS))
      val webView = requireNotNull(webViewReference.get())
      val container = requireNotNull(containerReference.get())
      scenario.onActivity {
        var holdFirstEvaluation = true
        container.evaluateInitializationUpdateForTesting = { activeWebView, script, completion ->
          activeWebView.evaluateJavascript(script) { result ->
            if (holdFirstEvaluation) {
              holdFirstEvaluation = false
              firstEvaluationResult.set(result)
              releaseFirstCompletion.set(completion)
              firstEvaluationLatch.countDown()
            } else {
              completion(result)
            }
          }
        }
        container.initializationObjectJson = INIT_B
        container.onAfterUpdateTransaction()
      }

      assertTrue("Initialization update did not evaluate", firstEvaluationLatch.await(5, TimeUnit.SECONDS))
      assertEquals("false", firstEvaluationResult.get())
      val wrapperLatch = CountDownLatch(1)
      webView.post {
        webView.evaluateJavascript("window.installWrapper()") { wrapperLatch.countDown() }
      }
      assertTrue("Delayed wrapper did not install", wrapperLatch.await(5, TimeUnit.SECONDS))
      assertTrue("Readiness did not arrive while evaluation was held", pageDidLoadLatch.await(5, TimeUnit.SECONDS))
      scenario.onActivity {
        requireNotNull(releaseFirstCompletion.get())(firstEvaluationResult.get())
      }

      val applied = awaitJavascriptValue(
        webView,
        "JSON.stringify({locale:window.__connectInstanceUpdate.locale, marker:window.__componentPropUpdate.value})",
      ) { value ->
        val json = runCatching { JSONTokener(value).nextValue() as? String }.getOrNull()
        val appliedValues = runCatching { json?.let(::JSONObject) }.getOrNull()
        appliedValues?.optString("locale") == "fr"
      }
      val values = JSONObject(JSONTokener(applied).nextValue() as String)
      assertEquals("fr", values.getString("locale"))
      assertEquals("old", values.getString("marker"))
    } finally {
      scenario.close()
    }
  }

  @Test
  fun trustedMainDocumentReceivesReplyAfterContainerBinds() {
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))

    val requestLatch = CountDownLatch(1)
    val replyLatch = CountDownLatch(1)
    val activityReference = AtomicReference<ConnectBridgeTestActivity>()
    val webViewReference = AtomicReference<WebView>()
    val requestReference = AtomicReference<ConnectBridgeContainerView.Request>()
    val replyTextReference = AtomicReference<String>()
    val errorReference = AtomicReference<String>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        activityReference.set(activity)
        val container = ConnectBridgeContainerView(activity)
        val webView = WebView(activity).apply {
          settings.javaScriptEnabled = true
        }
        webViewReference.set(webView)
        container.onError = errorReference::set
        container.onRequest = requestEvent@{ request ->
          if (!request.isFixtureRequest()) return@requestEvent
          requestReference.set(request)
          val payload = JSONObject()
            .put("type", "connectBridgeReply")
            .put("data", "result_test")
            .toString()
          container.claimForTest(request) { result ->
            assertTrue(result.admitted)
            assertTrue(container.reply(request.attachmentId, request.requestHandle, payload))
            requestLatch.countDown()
          }
        }
        container.onReady = {
          webView.loadDataWithBaseURL(
            TRUSTED_ORIGIN,
            HTML_FIXTURE,
            "text/html",
            "UTF-8",
            null,
          )
        }
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("WebView did not send its document-start request", requestLatch.await(10, TimeUnit.SECONDS))
      val request = requestReference.get()
      assertNotNull(request)
      assertEquals(TRUSTED_ORIGIN, request.sourceOrigin)
      assertTrue(request.isMainFrame)
      assertTrue(request.sourceViewMatched)
      assertTrue(request.documentId.matches(Regex("[0-9a-f]{32}")))
      assertEquals("result_test", JSONObject(request.rawMessage).getString("value"))

      val webView = webViewReference.get()
      webView.postDelayed({
        webView.evaluateJavascript("document.getElementById('result').textContent") { result ->
          replyTextReference.set(result.trim('"'))
          replyLatch.countDown()
        }
      }, 250)
      assertTrue("Reply did not reach the original document", replyLatch.await(5, TimeUnit.SECONDS))
      assertEquals("result_test", replyTextReference.get())
      assertEquals(null, errorReference.get())
    } finally {
      scenario.close()
    }
  }

  @Test
  fun authenticatedLaunchClaimRequiresMatchingArgumentsAndIsSingleUse() {
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))

    val requestCount = AtomicInteger()
    val wrongArgumentsAdmitted = AtomicReference<Boolean>()
    val matchingArgumentsAdmitted = AtomicReference<Boolean>()
    val duplicateLaunchAdmitted = AtomicReference<Boolean>()
    val requests = CopyOnWriteArrayList<ConnectBridgeContainerView.Request>()
    val webViewReference = AtomicReference<WebView>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        val container = ConnectBridgeContainerView(activity).apply {
          contextId = "claim-context"
          sourceGeneration = "claim-generation"
          onRequest = requestEvent@{ request ->
            if (JSONObject(request.rawMessage).optString("type") != "openAuthenticatedWebView") return@requestEvent
            requests += request
            val index = requestCount.incrementAndGet()
            claim(
              claimId = "claim-$index",
              expectedAttachmentId = request.attachmentId,
              requestHandle = request.requestHandle,
              expectedDocumentId = request.documentId,
              expectedContextId = request.contextId,
              expectedSourceGeneration = request.sourceGeneration,
            )
          }
          onClaimResult = { result ->
            assertTrue("Trusted live document claim was rejected", result.admitted)
            val request = requests.first { it.requestHandle == result.requestHandle }
            val data = JSONObject(request.rawMessage).getJSONObject("data")
            val expectedUrl = data.getString("url")
            val claimToken = requireNotNull(result.claimToken)
            if (requestCount.get() == 1) {
              ConnectBridgeContainerView.authorizeLaunchClaim(
                token = claimToken,
                expectedMessageType = "openAuthenticatedWebView",
                expectedUrl = "https://connect-js.stripe.com/wrong-url",
              ) { admitted -> wrongArgumentsAdmitted.set(admitted) }
            } else {
              ConnectBridgeContainerView.authorizeLaunchClaim(
                token = claimToken,
                expectedMessageType = "openAuthenticatedWebView",
                expectedUrl = expectedUrl,
              ) { admitted ->
                matchingArgumentsAdmitted.set(admitted)
                ConnectBridgeContainerView.authorizeLaunchClaim(
                  token = claimToken,
                  expectedMessageType = "openAuthenticatedWebView",
                  expectedUrl = expectedUrl,
                ) { duplicateAdmitted ->
                  duplicateLaunchAdmitted.set(duplicateAdmitted)
                  cancel(request.attachmentId, request.requestHandle)
                }
              }
            }
          }
        }
        val webView = WebView(activity).apply { settings.javaScriptEnabled = true }
        webViewReference.set(webView)
        container.onReady = {
          webView.loadDataWithBaseURL(TRUSTED_ORIGIN, LAUNCH_CLAIM_FIXTURE, "text/html", "UTF-8", null)
        }
        container.onAfterUpdateTransaction()
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      val results = awaitJavascriptValue(
        requireNotNull(webViewReference.get()),
        "document.body.dataset.results",
      ) { value ->
        runCatching { JSONTokener(value).nextValue() as? String == "cancelled,cancelled" }.getOrDefault(false)
      }
      assertEquals("cancelled,cancelled", JSONTokener(results).nextValue())
      assertEquals(2, requestCount.get())
      assertEquals(false, wrongArgumentsAdmitted.get())
      assertEquals(true, matchingArgumentsAdmitted.get())
      assertEquals(false, duplicateLaunchAdmitted.get())
    } finally {
      scenario.close()
    }
  }

  @Test
  fun detachedHostRejectsClaimsAndLaunchRevalidationButAllowsFreshRequestsAfterReattach() {
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))

    val requests = CopyOnWriteArrayList<ConnectBridgeContainerView.Request>()
    val requestLatches = listOf(CountDownLatch(1), CountDownLatch(1), CountDownLatch(1))
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)
    lateinit var container: ConnectBridgeContainerView
    lateinit var webView: WebView

    try {
      scenario.onActivity { activity ->
        container = ConnectBridgeContainerView(activity).apply {
          contextId = "detached-claim-context"
          sourceGeneration = "detached-claim-generation"
          onRequest = { request ->
            if (JSONObject(request.rawMessage).optString("type") == "openAuthenticatedWebView") {
              requests += request
              requestLatches.getOrNull(requests.lastIndex)?.countDown()
            }
          }
        }
        webView = WebView(activity).apply { settings.javaScriptEnabled = true }
        container.onReady = {
          webView.loadDataWithBaseURL(
            TRUSTED_ORIGIN,
            """
              <!doctype html><html><body><script>
              window.returnedFromAuthenticatedWebView = function() {};
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'openAuthenticatedWebView',
                data: { id: 'request-1', url: 'https://accounts.example.test/login' }
              }));
              </script></body></html>
            """.trimIndent(),
            "text/html",
            "UTF-8",
            null,
          )
        }
        container.onAfterUpdateTransaction()
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("Initial authenticated request did not arrive", requestLatches[0].await(10, TimeUnit.SECONDS))
      val firstRequest = requests[0]
      val firstClaimAdmitted = AtomicReference<Boolean>()
      val firstClaimLatch = CountDownLatch(1)
      scenario.onActivity { activity ->
        activity.setContentView(FrameLayout(activity))
        assertFalse("Detached container must not remain attached", container.isAttachedToWindow)
        assertFalse("Detached WebView must not remain attached", webView.isAttachedToWindow)
        container.claimForTest(firstRequest) { result ->
          firstClaimAdmitted.set(result.admitted)
          firstClaimLatch.countDown()
        }
      }
      assertTrue("Detached initial claim did not complete", firstClaimLatch.await(5, TimeUnit.SECONDS))
      assertFalse("Detached host must reject a pending claim", requireNotNull(firstClaimAdmitted.get()))

      scenario.onActivity { activity ->
        activity.setContentView(container)
        container.post { postAuthenticatedRequest(webView, "request-2") }
      }
      assertTrue("Reattached document did not send a fresh request", requestLatches[1].await(5, TimeUnit.SECONDS))
      val secondRequest = requests[1]
      val secondClaim = AtomicReference<ConnectBridgeContainerView.ClaimResult>()
      val secondClaimLatch = CountDownLatch(1)
      scenario.onActivity {
        container.claimForTest(secondRequest) { result ->
          secondClaim.set(result)
          secondClaimLatch.countDown()
        }
      }
      assertTrue("Attached fresh claim did not complete", secondClaimLatch.await(5, TimeUnit.SECONDS))
      assertTrue("Attached fresh claim should be admitted", requireNotNull(secondClaim.get()).admitted)
      val secondClaimToken = requireNotNull(secondClaim.get().claimToken)

      val detachedRedeemResult = AtomicReference<Boolean>()
      val detachedRedeemLatch = CountDownLatch(1)
      scenario.onActivity { activity ->
        activity.setContentView(FrameLayout(activity))
        assertFalse("Container should be detached before launch revalidation", container.isAttachedToWindow)
        ConnectBridgeContainerView.authorizeLaunchClaim(
          token = secondClaimToken,
          expectedMessageType = "openAuthenticatedWebView",
          expectedUrl = "https://accounts.example.test/login",
        ) { admitted ->
          detachedRedeemResult.set(admitted)
          detachedRedeemLatch.countDown()
        }
      }
      assertTrue("Detached launch revalidation did not complete", detachedRedeemLatch.await(5, TimeUnit.SECONDS))
      assertFalse("Detached host must reject launch revalidation", requireNotNull(detachedRedeemResult.get()))

      scenario.onActivity { activity ->
        activity.setContentView(container)
        container.post { postAuthenticatedRequest(webView, "request-3") }
      }
      assertTrue("Reattachment did not preserve a fresh document request", requestLatches[2].await(5, TimeUnit.SECONDS))
      val thirdRequest = requests[2]
      val thirdClaim = AtomicReference<ConnectBridgeContainerView.ClaimResult>()
      val thirdClaimLatch = CountDownLatch(1)
      scenario.onActivity {
        container.claimForTest(thirdRequest) { result ->
          thirdClaim.set(result)
          thirdClaimLatch.countDown()
        }
      }
      assertTrue("Fresh post-reattachment claim did not complete", thirdClaimLatch.await(5, TimeUnit.SECONDS))
      assertTrue("Fresh post-reattachment claim should be admitted", requireNotNull(thirdClaim.get()).admitted)
      val attachedRedeemResult = AtomicReference<Boolean>()
      val attachedRedeemLatch = CountDownLatch(1)
      scenario.onActivity {
        ConnectBridgeContainerView.authorizeLaunchClaim(
          token = requireNotNull(thirdClaim.get().claimToken),
          expectedMessageType = "openAuthenticatedWebView",
          expectedUrl = "https://accounts.example.test/login",
        ) { admitted ->
          attachedRedeemResult.set(admitted)
          attachedRedeemLatch.countDown()
        }
      }
      assertTrue("Attached launch revalidation did not complete", attachedRedeemLatch.await(5, TimeUnit.SECONDS))
      assertTrue("Attached host should admit launch revalidation", requireNotNull(attachedRedeemResult.get()))
      assertEquals(firstRequest.attachmentId, thirdRequest.attachmentId)
      scenario.onActivity { container.cancel(thirdRequest.attachmentId, thirdRequest.requestHandle) }
    } finally {
      scenario.close()
    }
  }

  @Test
  fun onlyTrustedMainFrameOriginsCanSendBridgeMessages() {
    val topRequestLatch = CountDownLatch(1)
    val webViewReference = AtomicReference<WebView>()
    val requests = CopyOnWriteArrayList<ConnectBridgeContainerView.Request>()
    val pageLoadedLatch = AtomicReference(CountDownLatch(1))
    val probeLatch = AtomicReference<CountDownLatch?>(null)
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        val container = ConnectBridgeContainerView(activity)
        val webView = WebView(activity).apply {
          settings.javaScriptEnabled = true
          webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
              pageLoadedLatch.get().countDown()
            }
          }
        }
        webViewReference.set(webView)
        container.onRequest = requestEvent@{ request ->
          val type = JSONObject(request.rawMessage).optString("type")
          if (!type.startsWith("matrix-")) return@requestEvent
          requests += request
          if (type == "matrix-top") topRequestLatch.countDown()
          probeLatch.get()?.countDown()
        }
        container.onReady = {
          webView.loadDataWithBaseURL(
            TRUSTED_ORIGIN,
            TRUSTED_FRAME_MATRIX,
            "text/html",
            "UTF-8",
            null,
          )
        }
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("Trusted top-level request was not delivered", topRequestLatch.await(10, TimeUnit.SECONDS))
      val webView = webViewReference.get()
      assertNotNull(webView)
      assertTrue("Top-level frame did not finish", pageLoadedLatch.get().await(10, TimeUnit.SECONDS))
      val frameSentinels = awaitJavascriptValue(webView, "window.__matrixSentinels.join('|')") {
        it?.contains("opaque-child-attempted") == true
      }
      val frameSentinelText = JSONTokener(frameSentinels).nextValue() as String
      assertTrue(frameSentinelText.contains("same-origin-child-attempted"))
      assertTrue(frameSentinelText.contains("\"bridgeAvailable\":false"))
      assertEquals(listOf("matrix-top"), requests.map { JSONObject(it.rawMessage).optString("type") })
      assertEquals(TRUSTED_ORIGIN, requests.single().sourceOrigin)
      assertTrue(requests.single().isMainFrame)

      val originCases = listOf(
        "https://connect-js.stripe.com:443" to true,
        "http://connect-js.stripe.com" to false,
        "https://connect-js.stripe.com:444" to false,
        "https://connect-js.stripe.com.attacker.test" to false,
        "https://attacker.test" to false,
      )
      originCases.forEachIndexed { index, (origin, shouldDeliver) ->
        val pageLoaded = CountDownLatch(1)
        pageLoadedLatch.set(pageLoaded)
        val incomingProbe = CountDownLatch(1)
        probeLatch.set(incomingProbe)
        scenario.onActivity {
          webView.loadDataWithBaseURL(
            origin,
            originProbe("matrix-origin-$index"),
            "text/html",
            "UTF-8",
            null,
          )
        }

        assertTrue("Origin probe page did not finish: $origin", pageLoaded.await(10, TimeUnit.SECONDS))
        val probeResult = awaitJavascriptValue(webView, "document.body.dataset.attemptResult") {
          it?.contains("|") == true
        }
        val attemptResult = JSONTokener(probeResult).nextValue() as String
        assertTrue(
          "Origin probe did not execute: $origin",
          attemptResult.startsWith("${origin.removeSuffix(":443")}|"),
        )
        if (shouldDeliver) {
          assertTrue("Trusted default-port origin was rejected", incomingProbe.await(5, TimeUnit.SECONDS))
        } else {
          assertEquals(
            "Untrusted origin reached the app callback: $origin",
            false,
            incomingProbe.await(300, TimeUnit.MILLISECONDS),
          )
        }
        probeLatch.set(null)
        assertEquals(
          shouldDeliver,
          requests.any { JSONObject(it.rawMessage).optString("type") == "matrix-origin-$index" },
        )
        if (shouldDeliver) {
          val request = requests.last()
          assertEquals("https://connect-js.stripe.com", request.sourceOrigin)
          assertTrue(request.isMainFrame)
        }
      }

      assertEquals(2, requests.size)
      assertEquals("matrix-origin-0", JSONObject(requests.last().rawMessage).optString("type"))
    } finally {
      scenario.close()
    }
  }

  @Test
  fun oneWayHeightEventsDoNotRetainReplyProxies() {
    val oneWayEventCount = 50
    val eventsReceived = CountDownLatch(oneWayEventCount)
    val acceptedOneWayReplies = AtomicInteger()
    val errorReference = AtomicReference<String>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        val container = ConnectBridgeContainerView(activity)
        val webView = WebView(activity).apply {
          settings.javaScriptEnabled = true
        }
        container.onError = errorReference::set
        container.onRequest = requestEvent@{ request ->
          if (JSONObject(request.rawMessage).optString("type") != "contentHeightChanged") {
            return@requestEvent
          }

          if (container.reply(request.attachmentId, request.requestHandle, reply("unexpected"))) {
            acceptedOneWayReplies.incrementAndGet()
          }
          eventsReceived.countDown()
        }
        container.onReady = {
          webView.loadDataWithBaseURL(
            TRUSTED_ORIGIN,
            oneWayHeightEvents(oneWayEventCount),
            "text/html",
            "UTF-8",
            null,
          )
        }
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("WebView did not deliver all one-way events", eventsReceived.await(10, TimeUnit.SECONDS))
      assertEquals(0, acceptedOneWayReplies.get())
      assertEquals(null, errorReference.get())
    } finally {
      scenario.close()
    }
  }

  @Test
  fun pendingReplyIsDiscardedWhenTheSameWebViewLoadsANewDocument() {
    val firstRequestLatch = CountDownLatch(1)
    val firstRequestClaimedLatch = CountDownLatch(1)
    val secondRequestLatch = CountDownLatch(1)
    val activityReference = AtomicReference<ConnectBridgeTestActivity>()
    val webViewReference = AtomicReference<WebView>()
    val requests = CopyOnWriteArrayList<ConnectBridgeContainerView.Request>()
    val staleReplyAccepted = AtomicReference<Boolean>()
    val resultText = AtomicReference<String>()
    val resultLatch = CountDownLatch(1)
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        activityReference.set(activity)
        val container = ConnectBridgeContainerView(activity)
        val webView = WebView(activity).apply {
          settings.javaScriptEnabled = true
        }
        webViewReference.set(webView)
        container.onRequest = requestEvent@{ request ->
          if (!request.isFixtureRequest()) return@requestEvent
          requests += request
          if (requests.size == 1) {
            container.claimForTest(request) { result ->
              assertTrue("Initial document request was not admitted", result.admitted)
              firstRequestClaimedLatch.countDown()
            }
            firstRequestLatch.countDown()
          } else if (requests.size == 2) {
            container.claimForTest(request) { result ->
              assertTrue(result.admitted)
              val oldRequest = requests.first()
              staleReplyAccepted.set(
                container.reply(oldRequest.attachmentId, oldRequest.requestHandle, reply("stale")),
              )
              assertTrue(container.reply(request.attachmentId, request.requestHandle, reply("result_test")))
              secondRequestLatch.countDown()
            }
          }
        }
        container.onReady = {
          webView.loadDataWithBaseURL(TRUSTED_ORIGIN, FIRST_DOCUMENT, "text/html", "UTF-8", null)
        }
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("First document did not send a request", firstRequestLatch.await(10, TimeUnit.SECONDS))
      assertTrue("Initial document request was not admitted", firstRequestClaimedLatch.await(5, TimeUnit.SECONDS))
      assertTrue(requests.first().documentId.matches(Regex("[0-9a-f]{32}")))

      scenario.onActivity {
        webViewReference.get().loadDataWithBaseURL(
          TRUSTED_ORIGIN,
          SECOND_DOCUMENT,
          "text/html",
          "UTF-8",
          null,
        )
      }

      assertTrue("Replacement document did not send a request", secondRequestLatch.await(10, TimeUnit.SECONDS))
      assertTrue(requests[0].documentId != requests[1].documentId)
      assertEquals(false, staleReplyAccepted.get())

      activityReference.get().runOnUiThread {
        webViewReference.get().postDelayed({
          webViewReference.get().evaluateJavascript(
            "document.getElementById('result').textContent",
          ) { value ->
            resultText.set(value.trim('"'))
            resultLatch.countDown()
          }
        }, 250)
      }
      assertTrue("Replacement document result was not readable", resultLatch.await(5, TimeUnit.SECONDS))
      assertEquals("result_test;", resultText.get())
    } finally {
      scenario.close()
    }
  }

  @Test
  fun replyProxyFromOldDocumentDoesNotDeliverToReplacementDocument() {
    assertTrue(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))

    val firstRequestLatch = CountDownLatch(1)
    val replacementLoadedLatch = CountDownLatch(1)
    val resultLatch = CountDownLatch(1)
    val pageFinishCount = AtomicReference(0)
    val replyProxy = AtomicReference<JavaScriptReplyProxy>()
    val resultText = AtomicReference<String>()
    val webViewReference = AtomicReference<WebView>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        val webView = WebView(activity).apply {
          settings.javaScriptEnabled = true
        }
        webViewReference.set(webView)
        WebViewCompat.addWebMessageListener(
          webView,
          "FixtureBridge",
          setOf(TRUSTED_ORIGIN),
        ) { sourceView, message, sourceOrigin, isMainFrame, requestReplyProxy ->
          assertTrue(sourceView === webView)
          assertEquals(TRUSTED_ORIGIN, sourceOrigin.toString())
          assertTrue(isMainFrame)
          if (message.data == "first-document") {
            replyProxy.set(requestReplyProxy)
            firstRequestLatch.countDown()
          }
        }
        webView.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView, url: String) {
            if (pageFinishCount.updateAndGet { it + 1 } >= 2) {
              replacementLoadedLatch.countDown()
            }
          }
        }
        activity.setContentView(webView)
        webView.loadDataWithBaseURL(TRUSTED_ORIGIN, PROXY_FIRST_DOCUMENT, "text/html", "UTF-8", null)
      }

      assertTrue("First document did not create a reply proxy", firstRequestLatch.await(10, TimeUnit.SECONDS))
      scenario.onActivity {
        webViewReference.get().loadDataWithBaseURL(
          TRUSTED_ORIGIN,
          PROXY_REPLACEMENT_DOCUMENT,
          "text/html",
          "UTF-8",
          null,
        )
      }
      assertTrue("Replacement document did not load", replacementLoadedLatch.await(10, TimeUnit.SECONDS))

      webViewReference.get().postDelayed({
        replyProxy.get().postMessage("stale-result")
        webViewReference.get().evaluateJavascript("document.getElementById('result').textContent") { value ->
          resultText.set(value.trim('"'))
          resultLatch.countDown()
        }
      }, 250)

      assertTrue("Replacement page result was not readable", resultLatch.await(5, TimeUnit.SECONDS))
      assertEquals("replacement-document", resultText.get())
    } finally {
      scenario.close()
    }
  }

  @Test
  fun initializationUpdateRejectsReplacementBeforeReadingHostileUpdaterGetter() {
    val pageLoadedLatch = CountDownLatch(1)
    val resultLatch = CountDownLatch(1)
    val observation = AtomicReference<JSONObject>()
    val webViewReference = AtomicReference<WebView>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        val webView = WebView(activity).apply {
          settings.javaScriptEnabled = true
        }
        webViewReference.set(webView)
        webView.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView, url: String) {
            pageLoadedLatch.countDown()
          }
        }
        activity.setContentView(webView)
        webView.loadDataWithBaseURL(
          TRUSTED_ORIGIN,
          """
            <!doctype html><html><body><script>
              Object.defineProperty(window, '__stripeConnectDocument', {
                value: 'replacement-document', configurable: false
              });
              window.beginGetterReadCount = 0;
              window.updaterInvocationCount = 0;
              Object.defineProperty(window, '__stripeConnectCanUpdateDocument', {
                configurable: false,
                get: function() {
                  window.beginGetterReadCount += 1;
                  return function() {
                    window.updaterInvocationCount += 1;
                    return true;
                  };
                }
              });
              window.__stripeConnectApplyInitializationUpdate = function() {
                window.updaterInvocationCount += 1;
                window.capturedPayload = arguments[1];
                return true;
              };
            </script></body></html>
          """.trimIndent(),
          "text/html",
          "UTF-8",
          null,
        )
      }

      assertTrue("Replacement fixture did not load", pageLoadedLatch.await(10, TimeUnit.SECONDS))
      val updateScript = ConnectBridgeContainerView.initializationUpdateScript(
        expectedDocumentId = "previous-document",
        json = "{\"initParams\":{\"locale\":\"fr\"}}",
        updateInstance = true,
        updateComponentProps = true,
      )
      webViewReference.get().post {
        webViewReference.get().evaluateJavascript(
          """
            (function() {
              var updateResult = $updateScript;
              return JSON.stringify({
                updateResult: updateResult,
                getterReadCount: window.beginGetterReadCount,
                updaterInvocationCount: window.updaterInvocationCount,
                payloadWasCaptured: Object.prototype.hasOwnProperty.call(window, 'capturedPayload')
              });
            })();
          """.trimIndent(),
        ) { value ->
          val json = runCatching { JSONTokener(value).nextValue() as? String }.getOrNull()
          if (json != null) observation.set(JSONObject(json))
          resultLatch.countDown()
        }
      }
      assertTrue("Updater result was not readable", resultLatch.await(5, TimeUnit.SECONDS))
      val result = observation.get()
      assertNotNull(result)
      assertEquals(false, result.getBoolean("updateResult"))
      assertEquals(0, result.getInt("getterReadCount"))
      assertEquals(0, result.getInt("updaterInvocationCount"))
      assertEquals(false, result.getBoolean("payloadWasCaptured"))
    } finally {
      scenario.close()
    }
  }

  private fun awaitJavascriptValue(
    webView: WebView,
    expression: String,
    predicate: (String?) -> Boolean,
  ): String {
    val latch = CountDownLatch(1)
    val result = AtomicReference<String>()
    lateinit var poll: Runnable
    poll = Runnable {
      webView.evaluateJavascript(expression) { value ->
        if (predicate(value)) {
          result.set(value)
          latch.countDown()
        } else {
          webView.postDelayed(poll, 100)
        }
      }
    }
    webView.post(poll)
    assertTrue("JavaScript did not reach expected state: $expression", latch.await(5, TimeUnit.SECONDS))
    return result.get()
  }

  private fun ConnectBridgeContainerView.claimForTest(
    request: ConnectBridgeContainerView.Request,
    completion: (ConnectBridgeContainerView.ClaimResult) -> Unit,
  ) {
    val claimId = "test-claim-${request.requestHandle}"
    onClaimResult = { result ->
      if (result.claimId == claimId) completion(result)
    }
    claim(
      claimId = claimId,
      expectedAttachmentId = request.attachmentId,
      requestHandle = request.requestHandle,
      expectedDocumentId = request.documentId,
      expectedContextId = request.contextId,
      expectedSourceGeneration = request.sourceGeneration,
    )
  }

  private fun postAuthenticatedRequest(webView: WebView, requestId: String) {
    val message = JSONObject()
      .put("type", "openAuthenticatedWebView")
      .put(
        "data",
        JSONObject()
          .put("id", requestId)
          .put("url", "https://accounts.example.test/login"),
      )
      .toString()
    webView.evaluateJavascript(
      "window.ReactNativeWebView.postMessage(${JSONObject.quote(message)})",
      null,
    )
  }

  private companion object {
    const val TRUSTED_ORIGIN = "https://connect-js.stripe.com"
    const val INIT_A = """{"initParams":{"locale":"en"},"initComponentProps":{"fixtureMarker":"old"}}"""
    const val INIT_B = """{"initParams":{"locale":"fr"},"initComponentProps":{"fixtureMarker":"old"}}"""
    const val INIT_C = """{"initParams":{"locale":"fr"},"initComponentProps":{"fixtureMarker":"new"}}"""
    val INITIALIZATION_RACE_FIXTURE = """
      <!doctype html><html><body><script>
        window.__cachedInitialization = JSON.parse(window.ReactNativeWebView.injectedObjectJson());
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'fetchClientSecret'}));
        window.installWrapper = function() {
          window.updateConnectInstance = function(value) { window.__connectInstanceUpdate = value; };
          window.callSetterWithSerializableValue = function(value) { window.__componentPropUpdate = value; };
          var params = window.__cachedInitialization.initParams;
          var props = window.__cachedInitialization.initComponentProps;
          window.updateConnectInstance({appearance:params.appearance, locale:params.locale});
          window.callSetterWithSerializableValue({setter:'fixtureMarker', value:props.fixtureMarker});
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'pageDidLoad'}));
        };
      </script></body></html>
    """.trimIndent()
    val HTML_FIXTURE = """
      <!doctype html>
      <html>
        <body>
          <div id="result"></div>
          <script>
            window.clientSecretDeferred = {
              resolve: function(value) {
                document.getElementById('result').textContent = value;
              }
            };
            window.StripeConnectBridge.onmessage = function(event) {
              var reply = JSON.parse(event.data);
              if (reply.type === 'connectBridgeReply') {
                document.getElementById('result').textContent = reply.data;
              }
            };
      window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'fetchClientSecret',
              value: 'result_test'
            }));
          </script>
        </body>
      </html>
    """.trimIndent()

    val TRUSTED_FRAME_MATRIX = """
      <!doctype html><html><body><script>
      window.__matrixSentinels = [];
      window.addEventListener('message', function(event) {
        window.__matrixSentinels.push(event.data);
        document.body.dataset.sentinelCount = String(window.__matrixSentinels.length);
      });
      var sameOriginFrame = document.createElement('iframe');
      sameOriginFrame.srcdoc = "<script>window.StripeConnectBridge.postMessage(JSON.stringify({documentId:'child-document',rawMessage:JSON.stringify({type:'matrix-child'})}));parent.postMessage('same-origin-child-attempted','*');<\/script>";
      document.body.appendChild(sameOriginFrame);
      var opaqueFrame = document.createElement('iframe');
      opaqueFrame.sandbox = 'allow-scripts';
      opaqueFrame.srcdoc = "<script>var available=!!window.StripeConnectBridge;parent.postMessage(JSON.stringify({type:'opaque-child-attempted',bridgeAvailable:available}),'*');<\/script>";
      document.body.appendChild(opaqueFrame);
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'matrix-top'}));
      </script></body></html>
    """.trimIndent()

    fun originProbe(type: String) = """
      <!doctype html><html><body><script>
      window.__attempted = true;
      document.body.dataset.attemptResult = location.origin + '|' + !!window.StripeConnectBridge;
      if (window.StripeConnectBridge) {
        window.StripeConnectBridge.postMessage(JSON.stringify({documentId:'origin-probe',rawMessage:JSON.stringify({type:'$type'})}));
      }
      </script></body></html>
    """.trimIndent()

    val FIRST_DOCUMENT = """
      <!doctype html><html><body><div id="result"></div><script>
      window.clientSecretDeferred = {
        resolve: function(value) { document.getElementById('result').textContent += value + ';'; }
      };
      window.StripeConnectBridge.onmessage = function(event) {
        var reply = JSON.parse(event.data);
        if (reply.type === 'connectBridgeReply') {
          document.getElementById('result').textContent += reply.data + ';';
        }
      };
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'fetchClientSecret',value:'first'}));
      </script></body></html>
    """.trimIndent()

    val SECOND_DOCUMENT = """
      <!doctype html><html><body><div id="result"></div><script>
      window.clientSecretDeferred = {
        resolve: function(value) { document.getElementById('result').textContent += value + ';'; }
      };
      window.StripeConnectBridge.onmessage = function(event) {
        var reply = JSON.parse(event.data);
        if (reply.type === 'connectBridgeReply') {
          document.getElementById('result').textContent += reply.data + ';';
        }
      };
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'fetchClientSecret',value:'second'}));
      </script></body></html>
    """.trimIndent()

    val PROXY_FIRST_DOCUMENT = """
      <!doctype html><html><body><script>
      window.FixtureBridge.postMessage('first-document');
      </script></body></html>
    """.trimIndent()

    val PROXY_REPLACEMENT_DOCUMENT = """
      <!doctype html><html><body><div id="result">replacement-document</div><script>
      window.FixtureBridge.onmessage = function(event) {
        document.getElementById('result').textContent = event.data;
      };
      </script></body></html>
    """.trimIndent()

    val LAUNCH_CLAIM_FIXTURE = """
      <!doctype html><html><body><script>
      var results = [];
      window.returnedFromAuthenticatedWebView = function(value) {
        results.push(value && value.url === null ? 'cancelled' : 'unexpected');
        document.body.dataset.results = results.join(',');
        if (results.length === 1) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'openAuthenticatedWebView',
            data: { id: 'second-request', url: 'https://accounts.example.test/login' }
          }));
        }
      };
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'openAuthenticatedWebView',
        data: { id: 'first-request', url: 'https://accounts.example.test/login' }
      }));
      </script></body></html>
    """.trimIndent()

    fun oneWayHeightEvents(count: Int) = """
      <!doctype html><html><body><script>
      for (var index = 0; index < $count; index++) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'contentHeightChanged',
          data: { height: index + 1 }
        }));
      }
      </script></body></html>
    """.trimIndent()

    fun reply(value: String) =
      JSONObject()
        .put("type", "connectBridgeReply")
        .put("action", "clientSecret")
        .put("data", value)
        .toString()

    fun ConnectBridgeContainerView.Request.isFixtureRequest(): Boolean =
      runCatching { JSONObject(rawMessage).optString("type") == "fetchClientSecret" }
        .getOrDefault(false)
  }
}

class ConnectBridgeTestActivity : Activity() {
  // Empty Activity used only by the WebView instrumentation test.
}
