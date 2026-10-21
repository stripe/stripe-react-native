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
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import org.json.JSONTokener

@RunWith(AndroidJUnit4::class)
class ConnectBridgeContainerViewTest {
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
          assertTrue(container.reply(request.attachmentId, request.requestHandle, payload))
          requestLatch.countDown()
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
            firstRequestLatch.countDown()
          } else if (requests.size == 2) {
            val oldRequest = requests.first()
            staleReplyAccepted.set(
              container.reply(oldRequest.attachmentId, oldRequest.requestHandle, reply("stale")),
            )
            assertTrue(container.reply(request.attachmentId, request.requestHandle, reply("result_test")))
            secondRequestLatch.countDown()
          }
        }
        container.onReady = {
          webView.loadDataWithBaseURL(TRUSTED_ORIGIN, FIRST_DOCUMENT, "text/html", "UTF-8", null)
        }
        container.addView(webView, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("First document did not send a request", firstRequestLatch.await(10, TimeUnit.SECONDS))
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

  private companion object {
    const val TRUSTED_ORIGIN = "https://connect-js.stripe.com"
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
