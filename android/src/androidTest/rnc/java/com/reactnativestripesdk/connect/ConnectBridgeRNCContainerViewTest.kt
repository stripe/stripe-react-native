package com.reactnativestripesdk.connect

import android.content.Context
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.CatalystInstance
import com.facebook.react.bridge.UIManager
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.facebook.react.bridge.JavaScriptModule
import com.facebook.react.bridge.JavaScriptContextHolder
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebViewManager
import com.reactnativecommunity.webview.RNCWebViewClient
import com.reactnativecommunity.webview.RNCWebViewWrapper
import java.io.ByteArrayInputStream
import java.lang.reflect.Proxy
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONObject
import org.json.JSONTokener
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ConnectBridgeRNCContainerViewTest {
  @Test
  fun rncDescendantLoadsAfterBindingAndKeepsNativeInitialization() {
    assertTrue(androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.WEB_MESSAGE_LISTENER))
    assertTrue(androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.DOCUMENT_START_SCRIPT))

    val readyLatch = CountDownLatch(1)
    val heightLatch = CountDownLatch(1)
    val initializationLatch = CountDownLatch(1)
    val clientSecretLatch = CountDownLatch(1)
    val clientSecretResultLatch = CountDownLatch(1)
    val reloadFetchLatch = CountDownLatch(1)
    val sourceWasUnsetWhenBound = AtomicReference<Boolean>()
    val initializationObject = AtomicReference<String>()
    val clientSecretResult = AtomicReference<String>()
    val genericMessageCount = AtomicInteger()
    val fetchRequestCount = AtomicInteger()
    val webViewReference = AtomicReference<WebView>()
    val containerReference = AtomicReference<ConnectBridgeContainerView>()
    val requestDocumentIds = java.util.concurrent.CopyOnWriteArrayList<String>()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        SoLoader.init(activity.applicationContext, OpenSourceMergedSoMapping)
        val reactContext = RecordingReactApplicationContext(activity, genericMessageCount)
        val themedContext = ThemedReactContext(reactContext, activity, "example", 1)
        val webViewManager = TestRNCWebViewManager()
        val rncWrapper = webViewManager.createView(themedContext)
        val webView = rncWrapper.webView
        webViewReference.set(webView)
        webView.webChromeClient = WebChromeClient()
        webViewManager.enableJavaScript(rncWrapper)
        webViewManager.setBeforeContentLoaded(rncWrapper)
        webView.webViewClient = FixtureRNCWebViewClient("initial_engine")

        lateinit var container: ConnectBridgeContainerView
        container = ConnectBridgeContainerView(activity).apply {
          contextId = "rnc-initial-context"
          connectSource = CONNECT_SOURCE
          observeContentHeight = true
          initializationObjectJson = INITIALIZATION_JSON
          onReady = {
            sourceWasUnsetWhenBound.set(webView.url.isNullOrEmpty())
            readyLatch.countDown()
          }
          onRequest = { request ->
            assertEquals("rnc-initial-context", request.contextId)
            val message = runCatching { JSONObject(request.rawMessage) }.getOrNull()
            if (message?.optString("type") == "contentHeightChanged") {
              val height = message.optJSONObject("data")?.optDouble("height", 0.0) ?: 0.0
              if (height > 0) {
                webView.evaluateJavascript(
                  "window.ReactNativeWebView.injectedObjectJson()",
                ) { value ->
                  val decoded = runCatching { JSONTokener(value).nextValue() as? String }.getOrNull()
                  if (decoded != null) initializationObject.set(decoded)
                  initializationLatch.countDown()
                }
                heightLatch.countDown()
              }
            }

            val reply = if (message?.optString("type") == "fetchClientSecret") {
              requestDocumentIds += request.documentId
              if (fetchRequestCount.incrementAndGet() >= 2) reloadFetchLatch.countDown()
              JSONObject()
                .put("type", "connectBridgeReply")
                .put("action", "clientSecret")
                .put("data", "cs_test_fixture")
                .toString()
            } else {
              "{\"type\":\"ack\"}"
            }
            container.reply(request.attachmentId, request.requestHandle, reply)
            if (message?.optString("type") == "fetchClientSecret") clientSecretLatch.countDown()
          }
        }
        containerReference.set(container)
        container.onAfterUpdateTransaction()

        container.addView(rncWrapper, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("RNC WebView did not bind", readyLatch.await(10, TimeUnit.SECONDS))
      assertTrue("Container must bind before its production source is loaded", sourceWasUnsetWhenBound.get())
      assertFalse("RNC generic messaging must remain disabled", rncMessagingEnabled(webViewReference.get()))
      assertTrue("Connect bootstrap did not report content height", heightLatch.await(40, TimeUnit.SECONDS))
      assertTrue("RNC init script did not remain callable", initializationLatch.await(10, TimeUnit.SECONDS))
      assertEquals(INITIALIZATION_JSON, initializationObject.get())
      assertTrue("RNC fixture did not request a client secret", clientSecretLatch.await(10, TimeUnit.SECONDS))
      webViewReference.get().postDelayed({
        webViewReference.get().evaluateJavascript("document.getElementById('result').textContent") { value ->
          clientSecretResult.set(value.trim('"'))
          clientSecretResultLatch.countDown()
        }
      }, 250)
      assertTrue("Production reply shim did not deliver the client secret", clientSecretResultLatch.await(5, TimeUnit.SECONDS))
      assertEquals("cs_test_fixture", clientSecretResult.get())
      assertEquals("No generic RNC message should be dispatched", 0, genericMessageCount.get())

      val originalDocumentId = evaluateString(webViewReference.get(), "window.__stripeConnectDocument")
      scenario.onActivity {
        containerReference.get().initializationObjectJson = UPDATED_INITIALIZATION_JSON
        containerReference.get().onAfterUpdateTransaction()
      }
      val liveDocumentUpdate = JSONObject(
        JSONTokener(evaluateJavaScript(
          webViewReference.get(),
          "JSON.stringify({documentId:window.__stripeConnectDocument,initialization:window.ReactNativeWebView.injectedObjectJson(),locale:window.__lastConnectInstanceUpdate.locale,setter:window.__lastComponentPropUpdate.setter,value:window.__lastComponentPropUpdate.value})",
        )).nextValue() as String,
      )
      assertEquals("A prop update must keep the current document", originalDocumentId, liveDocumentUpdate.getString("documentId"))
      assertEquals(UPDATED_INITIALIZATION_JSON, liveDocumentUpdate.getString("initialization"))
      assertEquals("fr", liveDocumentUpdate.getString("locale"))
      assertEquals("fixtureMarker", liveDocumentUpdate.getString("setter"))
      assertEquals("updated", liveDocumentUpdate.getString("value"))

      scenario.onActivity { webViewReference.get().reload() }
      assertTrue("Reloaded RNC document did not request a client secret", reloadFetchLatch.await(10, TimeUnit.SECONDS))
      assertEquals(originalDocumentId, requestDocumentIds.first())
      assertTrue("Reload must create a new Connect document", requestDocumentIds.last() != originalDocumentId)
      val reloadedDocument = JSONObject(
        JSONTokener(evaluateJavaScript(
          webViewReference.get(),
          "JSON.stringify({documentId:window.__stripeConnectDocument,initialization:window.ReactNativeWebView.injectedObjectJson()})",
        )).nextValue() as String,
      )
      assertEquals(UPDATED_INITIALIZATION_JSON, reloadedDocument.getString("initialization"))
      assertTrue("Reloaded document ID must differ", reloadedDocument.getString("documentId") != originalDocumentId)
    } finally {
      scenario.close()
    }
  }

  @Test
  fun replacementWebViewInsideTheSameRncWrapperGetsANewAttachment() {
    val firstRequestLatch = CountDownLatch(1)
    val replacementRequestLatch = CountDownLatch(1)
    val unavailableLatch = CountDownLatch(1)
    val replacementReadyLatch = CountDownLatch(1)
    val acceptedOldReply = AtomicReference<Boolean>()
    val replacementAttachment = AtomicReference<String>()
    val fixtureRequests = java.util.concurrent.CopyOnWriteArrayList<String>()
    val firstRequest = AtomicReference<ConnectBridgeContainerView.Request>()
    val containerReference = AtomicReference<ConnectBridgeContainerView>()
    val wrapperReference = AtomicReference<RNCWebViewWrapper>()
    val managerReference = AtomicReference<TestRNCWebViewManager>()
    val themedContextReference = AtomicReference<ThemedReactContext>()
    val firstWebViewReference = AtomicReference<WebView>()
    val replacementWebViewReference = AtomicReference<WebView>()
    val readyCount = AtomicInteger()
    val scenario = ActivityScenario.launch(ConnectBridgeTestActivity::class.java)

    try {
      scenario.onActivity { activity ->
        SoLoader.init(activity.applicationContext, OpenSourceMergedSoMapping)
        val reactContext = RecordingReactApplicationContext(activity, AtomicInteger())
        val themedContext = ThemedReactContext(reactContext, activity, "example", 1)
        val manager = TestRNCWebViewManager()
        val wrapper = manager.createView(themedContext)
        val firstWebView = wrapper.webView
        firstWebViewReference.set(firstWebView)
        firstWebView.webChromeClient = WebChromeClient()
        manager.enableJavaScript(wrapper)
        manager.setBeforeContentLoaded(wrapper)
        firstWebView.webViewClient = FixtureRNCWebViewClient("initial_engine")

        val container = ConnectBridgeContainerView(activity).apply {
          contextId = "rnc-replacement-context"
          connectSource = CONNECT_SOURCE
          onReady = { attachment ->
            if (readyCount.incrementAndGet() == 2) {
              replacementAttachment.set(attachment)
              replacementReadyLatch.countDown()
            }
          }
          onUnavailable = unavailableLatch::countDown
          onRequest = { request ->
            val message = runCatching { JSONObject(request.rawMessage) }.getOrNull()
            if (message?.optString("type") == "fetchClientSecret") {
              val value = message.optString("value")
              fixtureRequests += value
              if (value == "initial_engine") {
                firstRequest.set(request)
                firstRequestLatch.countDown()
              } else if (value == "replacement_engine") {
                acceptedOldReply.set(
                  containerReference.get().reply(
                    firstRequest.get().attachmentId,
                    firstRequest.get().requestHandle,
                    clientSecretReply("stale_result"),
                  ),
                )
                assertTrue(
                  containerReference.get().reply(
                    request.attachmentId,
                    request.requestHandle,
                    clientSecretReply("replacement_result"),
                  ),
                )
                replacementRequestLatch.countDown()
              } else if (value == "detached_engine") {
                fixtureRequests += "unexpected_detached_engine_request"
              }
            } else {
              containerReference.get().reply(request.attachmentId, request.requestHandle, "{\"type\":\"ack\"}")
            }
          }
        }
        containerReference.set(container)
        wrapperReference.set(wrapper)
        managerReference.set(manager)
        themedContextReference.set(themedContext)
        container.onAfterUpdateTransaction()
        container.addView(wrapper, FrameLayout.LayoutParams(-1, -1))
        activity.setContentView(container)
      }

      assertTrue("Initial RNC engine did not send its fixture request", firstRequestLatch.await(10, TimeUnit.SECONDS))
      val originalAttachment = firstRequest.get().attachmentId

      scenario.onActivity { activity ->
        val manager = managerReference.get()
        val wrapper = wrapperReference.get()
        val oldWebView = firstWebViewReference.get()
        val replacementWrapper = manager.createView(themedContextReference.get())
        val replacementWebView = replacementWrapper.webView
        replacementWebView.webChromeClient = WebChromeClient()
        manager.enableJavaScript(replacementWrapper)
        manager.setBeforeContentLoaded(replacementWrapper)
        replacementWebView.webViewClient = FixtureRNCWebViewClient("replacement_engine")
        replacementWrapper.removeView(replacementWebView)
        wrapper.removeView(oldWebView)
        oldWebView.evaluateJavascript(
          "window.ReactNativeWebView.postMessage(JSON.stringify({type:'fetchClientSecret',value:'detached_engine'}))",
          null,
        )
        wrapper.addView(replacementWebView, FrameLayout.LayoutParams(-1, -1))
        replacementWebViewReference.set(replacementWebView)
      }

      assertTrue("Old RNC engine was not revoked", unavailableLatch.await(5, TimeUnit.SECONDS))
      assertTrue("Replacement RNC engine was not rebound", replacementReadyLatch.await(10, TimeUnit.SECONDS))
      assertTrue("Replacement RNC engine did not send a request", replacementRequestLatch.await(10, TimeUnit.SECONDS))
      assertEquals("Old attachment must reject replies after nested engine removal", false, acceptedOldReply.get())
      assertTrue("Detached engine messages must not reach the container", "detached_engine" !in fixtureRequests)
      assertTrue("Replacement must receive a distinct attachment", originalAttachment != replacementAttachment.get())
      assertFalse("Replacement RNC generic messaging must remain disabled", rncMessagingEnabled(replacementWebViewReference.get()))
    } finally {
      scenario.close()
    }
  }

  private class FixtureRNCWebViewClient(private val fixtureName: String) : RNCWebViewClient() {
    override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) = Unit

    override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) = Unit

    override fun onPageFinished(view: WebView, url: String) = Unit

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
      if (!request.url.host.equals(TRUSTED_HOST, ignoreCase = true)) return super.shouldInterceptRequest(view, request)
      val html = FIXTURE_HTML.replace("__FIXTURE_NAME__", fixtureName)
      return WebResourceResponse("text/html", "UTF-8", ByteArrayInputStream(html.toByteArray()))
    }
  }

  private fun clientSecretReply(value: String) =
    JSONObject()
      .put("type", "connectBridgeReply")
      .put("action", "clientSecret")
      .put("data", value)
      .toString()

  private fun rncMessagingEnabled(webView: WebView): Boolean =
    (webView as com.reactnativecommunity.webview.RNCWebView).messagingEnabled

  private fun evaluateJavaScript(
    webView: WebView,
    script: String,
  ): String {
    val result = AtomicReference<String>()
    val completed = CountDownLatch(1)
    webView.post {
      webView.evaluateJavascript(script) { value ->
        result.set(value)
        completed.countDown()
      }
    }
    assertTrue("JavaScript evaluation did not complete", completed.await(10, TimeUnit.SECONDS))
    return result.get()
  }

  private fun evaluateString(
    webView: WebView,
    script: String,
  ): String = JSONTokener(evaluateJavaScript(webView, script)).nextValue() as String

  private class TestRNCWebViewManager : RNCWebViewManager() {
    fun createView(context: ThemedReactContext): RNCWebViewWrapper = super.createViewInstance(context)

    fun enableJavaScript(view: RNCWebViewWrapper) {
      setJavaScriptEnabled(view, true)
    }

    fun setBeforeContentLoaded(view: RNCWebViewWrapper) {
      setInjectedJavaScriptBeforeContentLoaded(view, "(function() {})();")
    }
  }

  private class RecordingReactApplicationContext(
    context: Context,
    private val genericMessageCount: AtomicInteger,
  ) : ReactApplicationContext(context) {
    override fun <T : JavaScriptModule> getJSModule(jsInterface: Class<T>): T {
      val module = Proxy.newProxyInstance(jsInterface.classLoader, arrayOf(jsInterface)) { _, method, _ ->
        if (method.name == "onMessage") genericMessageCount.incrementAndGet()
        null
      }
      return jsInterface.cast(module)
    }

    override fun <T : NativeModule> hasNativeModule(nativeModuleInterface: Class<T>): Boolean = false

    override fun getNativeModules(): MutableCollection<NativeModule> = mutableListOf()

    override fun <T : NativeModule> getNativeModule(nativeModuleInterface: Class<T>): T? = null

    override fun getNativeModule(moduleName: String): NativeModule? = null

    override fun getCatalystInstance(): CatalystInstance? = null

    override fun hasActiveCatalystInstance(): Boolean = false

    override fun hasActiveReactInstance(): Boolean = false

    override fun hasCatalystInstance(): Boolean = false

    override fun hasReactInstance(): Boolean = false

    override fun destroy() = Unit

    override fun handleException(e: Exception) = throw e

    override fun isBridgeless(): Boolean = true

    override fun getJavaScriptContextHolder(): JavaScriptContextHolder? = null

    override fun getJSCallInvokerHolder(): CallInvokerHolder? = null

    override fun getFabricUIManager(): UIManager? = null

    override fun getSourceURL(): String? = null

    override fun registerSegment(segmentId: Int, path: String, callback: Callback) = Unit
  }

  private companion object {
    const val TRUSTED_HOST = "connect-js.stripe.com"
    const val CONNECT_SOURCE =
      "https://connect-js.stripe.com/v1.0/react_native_webview.html#component=debug-utils&publicKey=pk_test_000000000000000000000000"
    val FIXTURE_HTML = """
      <!doctype html><html><body><div id="result"></div><script>
      window.clientSecretDeferred = {
        resolve: function(value) { document.getElementById('result').textContent = value; }
      };
      window.updateConnectInstance = function(value) { window.__lastConnectInstanceUpdate = value; };
      window.callSetterWithSerializableValue = function(value) { window.__lastComponentPropUpdate = value; };
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'fetchClientSecret',value:'__FIXTURE_NAME__'}));
      </script></body></html>
    """.trimIndent()
    const val INITIALIZATION_JSON =
      "{\"initParams\":{\"locale\":\"en\"},\"initComponentProps\":{\"fixtureMarker\":\"init_preserved\"},\"appInfo\":{}}"
    const val UPDATED_INITIALIZATION_JSON =
      "{\"initParams\":{\"locale\":\"fr\"},\"initComponentProps\":{\"fixtureMarker\":\"updated\"},\"appInfo\":{}}"
  }
}
