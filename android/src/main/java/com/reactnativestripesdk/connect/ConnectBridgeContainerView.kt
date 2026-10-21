package com.reactnativestripesdk.connect

import android.content.Context
import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.webkit.ScriptHandler
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.util.UUID

/** Hosts a Connect WebView and binds its document-scoped message transport. */
class ConnectBridgeContainerView(
  context: Context,
) : FrameLayout(context) {
  internal data class Request(
    val attachmentId: String,
    val requestHandle: String,
    val documentId: String,
    val contextId: String,
    val rawMessage: String,
    val sourceOrigin: String,
    val isMainFrame: Boolean,
    val sourceViewMatched: Boolean,
  )

  internal var onReady: ((String) -> Unit)? = null
  internal var onUnavailable: (() -> Unit)? = null
  internal var onRequest: ((Request) -> Unit)? = null
  internal var onError: ((String) -> Unit)? = null

  internal var contextId: String? = null
    set(value) {
      if (field == value) return
      field = value
      propsDirty = true
    }

  internal var connectSource: String? = null
    set(value) {
      if (field == value) return
      field = value
      propsDirty = true
    }

  internal var initializationObjectJson: String = ""
    set(value) {
      if (field == value) return
      field = value
      propsDirty = true
    }

  internal var observeContentHeight: Boolean = false
    set(value) {
      if (field == value) return
      field = value
      propsDirty = true
    }

  private data class PendingReply(
    val attachmentId: String,
    val documentId: String,
    val replyProxy: androidx.webkit.JavaScriptReplyProxy,
  )

  private var boundWebView: WebView? = null
  private var documentStartScript: ScriptHandler? = null
  private var attachmentId: String? = null
  private var currentDocumentId: String? = null
  private val pendingReplies = mutableMapOf<String, PendingReply>()
  private var invalidated = false
  private var errorReported = false
  private var propsDirty = false
  private var pendingInitializationUpdate = false
  private var pendingInitializationUpdatePreviousJson: String? = null
  private var configurationUpdateInFlight = false
  private var initializationUpdateGeneration = 0
  private var appliedContextId: String? = null
  private var appliedConnectSource: String? = null
  private var appliedInitializationObjectJson: String? = null
  private var appliedObserveContentHeight: Boolean? = null

  private val boundWebViewAttachListener =
    object : View.OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(view: View) {
        post { bindDescendantWebView() }
      }

      override fun onViewDetachedFromWindow(view: View) {
        val webView = view as? WebView ?: return
        if (boundWebView === webView && !isDescendantOf(webView, this@ConnectBridgeContainerView)) {
          unbindWebView(webView)
        }
      }
    }

  private val layoutListener = android.view.ViewTreeObserver.OnGlobalLayoutListener {
    bindDescendantWebView()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (!viewTreeObserver.isAlive) return
    viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
    post { bindDescendantWebView() }
  }

  override fun onDetachedFromWindow() {
    if (viewTreeObserver.isAlive) {
      viewTreeObserver.removeOnGlobalLayoutListener(layoutListener)
    }
    super.onDetachedFromWindow()
  }

  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    post { bindDescendantWebView() }
  }

  override fun onViewRemoved(child: View) {
    super.onViewRemoved(child)
    val currentWebView = boundWebView
    if (currentWebView != null && (currentWebView === child || isDescendantOf(currentWebView, child))) {
      unbindWebView(currentWebView)
      if (isAttachedToWindow) post { bindDescendantWebView() }
    }
  }

  /** Rejects pending replies and removes the bridge during actual component disposal. */
  internal fun dispose() {
    invalidated = true
    boundWebView?.let(::unbindWebView)
  }

  /** Applies the complete prop transaction before starting or replacing a document. */
  internal fun onAfterUpdateTransaction() {
    if (!propsDirty) return
    propsDirty = false

    val contextChanged = appliedContextId != contextId
    val sourceChanged = appliedConnectSource != connectSource
    val heightObservationChanged = appliedObserveContentHeight != observeContentHeight
    val initializationChanged = appliedInitializationObjectJson != initializationObjectJson
    val configurationChanged = contextChanged || sourceChanged || heightObservationChanged || initializationChanged
    val previousInitializationJson = appliedInitializationObjectJson
    appliedContextId = contextId
    appliedConnectSource = connectSource
    appliedInitializationObjectJson = initializationObjectJson
    appliedObserveContentHeight = observeContentHeight
    if (!configurationChanged) return

    if (contextChanged || sourceChanged || heightObservationChanged) {
      pendingInitializationUpdate = false
      configurationUpdateInFlight = false
      val currentWebView = boundWebView
      if (currentWebView != null) {
        unbindWebView(currentWebView)
        if (connectSource == null) {
          currentWebView.stopLoading()
          currentWebView.loadUrl("about:blank")
        }
      }
      if (isAttachedToWindow) post { bindDescendantWebView() }
      return
    }

    pendingInitializationUpdate = true
    pendingInitializationUpdatePreviousJson = previousInitializationJson
    initializationUpdateGeneration += 1
    boundWebView?.let { webView ->
      installDocumentStartScript(webView)
      deliverPendingInitializationUpdate()
    }
  }

  /** Replies only to a request owned by the current WebView attachment. */
  internal fun reply(
    expectedAttachmentId: String,
    requestHandle: String,
    payload: String,
  ): Boolean {
    if (invalidated || attachmentId != expectedAttachmentId) return false
    val pending = pendingReplies.remove(requestHandle) ?: return false
    if (
      pending.attachmentId != expectedAttachmentId ||
      pending.documentId != currentDocumentId
    ) {
      return false
    }
    pending.replyProxy.postMessage(payload)
    return true
  }

  private fun bindDescendantWebView() {
    if (invalidated || propsDirty || !isAttachedToWindow) return
    val webViews = findWebViews(this)
    val currentWebView = boundWebView
    if (currentWebView != null && webViews.size == 1 && webViews.single() === currentWebView) return
    currentWebView?.let(::unbindWebView)
    if (webViews.isEmpty()) return
    if (webViews.size != 1) {
      reportError(ERROR_MULTIPLE_WEB_VIEWS)
      return
    }

    val webView = webViews.single()
    if (
      !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) ||
      !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
    ) {
      reportError(ERROR_UNSUPPORTED_WEB_VIEW)
      return
    }

    val newAttachmentId = UUID.randomUUID().toString()
    val expectedContextId = contextId.orEmpty()
    try {
      WebViewCompat.addWebMessageListener(
        webView,
        BRIDGE_OBJECT_NAME,
        setOf(ORIGIN_RULE),
        WebViewCompat.WebMessageListener { sourceView, message, sourceOrigin, isMainFrame, replyProxy ->
          handleMessage(
            newAttachmentId,
            expectedContextId,
            webView,
            sourceView,
            message,
            sourceOrigin,
            isMainFrame,
            replyProxy,
          )
        },
      )
      installDocumentStartScript(webView)
      boundWebView = webView
      webView.addOnAttachStateChangeListener(boundWebViewAttachListener)
      attachmentId = newAttachmentId
      errorReported = false
      onReady?.invoke(newAttachmentId)
      connectSource?.let { loadSource(webView, it) }
    } catch (_: RuntimeException) {
      reportError(ERROR_UNSUPPORTED_WEB_VIEW)
      runCatching { WebViewCompat.removeWebMessageListener(webView, BRIDGE_OBJECT_NAME) }
    }
  }

  private fun handleMessage(
    expectedAttachmentId: String,
    expectedContextId: String,
    expectedWebView: WebView,
    sourceView: WebView,
    message: WebMessageCompat,
    sourceOrigin: Uri,
    isMainFrame: Boolean,
    replyProxy: androidx.webkit.JavaScriptReplyProxy,
  ) {
    if (!isCurrentBinding(expectedAttachmentId, expectedContextId)) {
      replyProxy.postMessage(ACKNOWLEDGEMENT)
      return
    }
    val currentAttachmentId = expectedAttachmentId
    if (
      !isAcceptedMessageSource(
        expectedWebView,
        sourceView,
        sourceOrigin,
        isMainFrame,
      )
    ) {
      replyProxy.postMessage(ACKNOWLEDGEMENT)
      return
    }

    val envelope = runCatching { JSONObject(message.data.orEmpty()) }.getOrNull()
    val documentId = envelope?.optString("documentId").orEmpty()
    val rawMessage = envelope?.optString("rawMessage").orEmpty()
    if (documentId.isEmpty() || rawMessage.isEmpty()) {
      replyProxy.postMessage(ACKNOWLEDGEMENT)
      return
    }

    if (currentDocumentId != documentId) {
      pendingReplies.clear()
      currentDocumentId = documentId
    }

    val parsedMessage = runCatching { JSONObject(rawMessage) }.getOrNull()
    if (parsedMessage?.optString("type") == DOCUMENT_START_MESSAGE) {
      replyProxy.postMessage(ACKNOWLEDGEMENT)
      deliverPendingInitializationUpdate()
      return
    }

    deliverPendingInitializationUpdate()

    val requestHandle = UUID.randomUUID().toString()
    val requiresReply =
      parsedMessage?.optString("type")?.let { it in ASYNCHRONOUS_MESSAGE_TYPES } == true
    if (requiresReply) {
      pendingReplies[requestHandle] = PendingReply(currentAttachmentId, documentId, replyProxy)
    }
    onRequest?.invoke(
      Request(
        attachmentId = currentAttachmentId,
        requestHandle = requestHandle,
        documentId = documentId,
        contextId = expectedContextId,
        rawMessage = rawMessage,
        sourceOrigin = sourceOrigin.toString(),
        isMainFrame = isMainFrame,
        sourceViewMatched = sourceView === expectedWebView,
      ),
    )
    if (!requiresReply) replyProxy.postMessage(ACKNOWLEDGEMENT)
  }

  private fun isCurrentBinding(
    expectedAttachmentId: String,
    expectedContextId: String,
  ): Boolean {
    if (attachmentId != expectedAttachmentId) return false
    return contextId.orEmpty() == expectedContextId
  }

  private fun isAcceptedMessageSource(
    expectedWebView: WebView,
    sourceView: WebView,
    sourceOrigin: Uri,
    isMainFrame: Boolean,
  ): Boolean {
    if (sourceView !== expectedWebView) return false
    if (sourceView !== boundWebView) return false
    if (!isAttachedToWindow || !sourceView.isAttachedToWindow) return false
    if (!isMainFrame) return false
    return isTrustedOrigin(sourceOrigin)
  }

  private fun unbindWebView(webView: WebView) {
    if (boundWebView !== webView) return
    pendingReplies.clear()
    boundWebView = null
    attachmentId = null
    currentDocumentId = null
    webView.removeOnAttachStateChangeListener(boundWebViewAttachListener)
    documentStartScript?.remove()
    documentStartScript = null
    runCatching { WebViewCompat.removeWebMessageListener(webView, BRIDGE_OBJECT_NAME) }
    onUnavailable?.invoke()
  }

  private fun installDocumentStartScript(webView: WebView) {
    documentStartScript?.remove()
    documentStartScript =
      WebViewCompat.addDocumentStartJavaScript(
        webView,
        documentStartScript(initializationObjectJson, observeContentHeight),
        setOf(ORIGIN_RULE),
      )
  }

  private fun deliverPendingInitializationUpdate() {
    if (!pendingInitializationUpdate || configurationUpdateInFlight) return
    val webView = boundWebView ?: return
    val expectedAttachmentId = attachmentId ?: return
    val expectedDocumentId = currentDocumentId ?: return
    val previousJson = pendingInitializationUpdatePreviousJson ?: return
    val generation = initializationUpdateGeneration
    val updateInstance = initializationInstanceChanged(previousJson, initializationObjectJson)
    val updateComponentProps = initializationComponentPropsChanged(previousJson, initializationObjectJson)
    configurationUpdateInFlight = true

    webView.evaluateJavascript(
      initializationUpdateScript(
        expectedDocumentId,
        initializationObjectJson,
        updateInstance,
        updateComponentProps,
      ),
    ) { result ->
      configurationUpdateInFlight = false
      if (
        boundWebView !== webView ||
        attachmentId != expectedAttachmentId ||
        currentDocumentId != expectedDocumentId
      ) {
        return@evaluateJavascript
      }

      if (result?.trim('"') == "true" && generation == initializationUpdateGeneration) {
        pendingInitializationUpdate = false
        pendingInitializationUpdatePreviousJson = null
      } else if (generation != initializationUpdateGeneration) {
        deliverPendingInitializationUpdate()
      }
    }
  }

  private fun initializationInstanceChanged(
    previousJson: String,
    nextJson: String,
  ): Boolean =
    jsonValue(previousJson, "initParams", "appearance") != jsonValue(nextJson, "initParams", "appearance") ||
      jsonValue(previousJson, "initParams", "locale") != jsonValue(nextJson, "initParams", "locale")

  private fun initializationComponentPropsChanged(
    previousJson: String,
    nextJson: String,
  ): Boolean =
    jsonObjectValue(previousJson, "initComponentProps") != jsonObjectValue(nextJson, "initComponentProps")

  private fun jsonValue(
    json: String,
    objectName: String,
    key: String,
  ): String? =
    runCatching { JSONObject(json).optJSONObject(objectName)?.opt(key)?.toString() }.getOrNull()

  private fun jsonObjectValue(
    json: String,
    key: String,
  ): String? =
    runCatching { JSONObject(json).optJSONObject(key)?.toString() }.getOrNull()

  private fun reportError(error: String) {
    if (errorReported) return
    errorReported = true
    onError?.invoke(error)
  }

  private fun loadSource(
    webView: WebView,
    source: String,
  ) {
    val uri = runCatching { Uri.parse(source) }.getOrNull()
    if (uri == null || !isTrustedOrigin(uri)) {
      reportError(ERROR_INVALID_SOURCE)
      return
    }
    webView.loadUrl(source)
  }

  private fun isTrustedOrigin(uri: Uri): Boolean =
    uri.scheme == "https" &&
      uri.host.equals(TRUSTED_HOST, ignoreCase = true) &&
      (uri.port == -1 || uri.port == DEFAULT_HTTPS_PORT)

  private fun isDescendantOf(view: View, ancestor: View): Boolean {
    var parent = view.parent
    while (parent is View) {
      if (parent === ancestor) return true
      parent = parent.parent
    }
    return false
  }

  private fun findWebViews(view: View): List<WebView> =
    when (view) {
      is WebView -> listOf(view)
      is ViewGroup -> (0 until view.childCount).flatMap { index -> findWebViews(view.getChildAt(index)) }
      else -> emptyList()
    }

  private fun documentStartScript(
    initializationObjectJson: String,
    observeContentHeight: Boolean,
  ): String =
    DOCUMENT_START_SCRIPT
      .replace("__DOCUMENT_START_TYPE__", DOCUMENT_START_MESSAGE)
      .replace("__INITIALIZATION_OBJECT_JSON__", JSONObject.quote(initializationObjectJson))
      .replace("__OBSERVE_CONTENT_HEIGHT__", observeContentHeight.toString())

  internal companion object {
    const val TRUSTED_HOST = "connect-js.stripe.com"
    const val ORIGIN_RULE = "https://connect-js.stripe.com"
    const val DEFAULT_HTTPS_PORT = 443
    const val BRIDGE_OBJECT_NAME = "StripeConnectBridge"
    const val ERROR_MULTIPLE_WEB_VIEWS = "multiple_web_views"
    const val ERROR_UNSUPPORTED_WEB_VIEW = "unsupported_web_view"
    const val ERROR_INVALID_SOURCE = "invalid_connect_source"
    const val DOCUMENT_START_MESSAGE = "nativeDocumentStart"
    const val ACKNOWLEDGEMENT = "{\"type\":\"ack\"}"
    private val ASYNCHRONOUS_MESSAGE_TYPES = setOf(
      "fetchClientSecret",
      "openAuthenticatedWebView",
      "openFinancialConnections",
    )

    internal fun initializationUpdateScript(
      expectedDocumentId: String,
      json: String,
      updateInstance: Boolean,
      updateComponentProps: Boolean,
    ): String =
      """
        (function() {
          'use strict';
          if (window.location.origin !== 'https://connect-js.stripe.com' ||
              window.__stripeConnectDocument !== ${JSONObject.quote(expectedDocumentId)}) return false;
          var canUpdate = window.__stripeConnectCanUpdateDocument;
          if (typeof canUpdate !== 'function' || !canUpdate(${JSONObject.quote(expectedDocumentId)})) return false;
          var applyUpdate = window.__stripeConnectApplyInitializationUpdate;
          if (typeof applyUpdate !== 'function') return false;
          return applyUpdate(
            ${JSONObject.quote(expectedDocumentId)},
            ${JSONObject.quote(json)},
            $updateInstance,
            $updateComponentProps
          );
        })();
      """.trimIndent()

    val DOCUMENT_START_SCRIPT = """
      (function() {
        if (window.top !== window || window.__stripeConnectDocument) return;
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        var documentId = Array.from(bytes, function(byte) {
          return byte.toString(16).padStart(2, '0');
        }).join('');
        Object.defineProperty(window, '__stripeConnectDocument', {
          value: documentId,
          configurable: false,
          writable: false
        });
        var bridge = window.StripeConnectBridge;
        var webView = window.ReactNativeWebView || (window.ReactNativeWebView = {});
        var initializationObjectJson = __INITIALIZATION_OBJECT_JSON__;
        Object.defineProperty(webView, 'injectedObjectJson', {
          value: function() { return initializationObjectJson; },
          configurable: false,
          writable: false
        });
        var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        var objectKeys = Object.keys;
        var jsonParse = JSON.parse;
        var canUpdateDocument = function(expectedDocumentId) {
          if (window.location.origin !== 'https://connect-js.stripe.com') return false;
          var descriptor = getOwnPropertyDescriptor(window, '__stripeConnectDocument');
          return !!descriptor && descriptor.value === expectedDocumentId;
        };
        Object.defineProperty(window, '__stripeConnectCanUpdateDocument', {
          value: canUpdateDocument,
          configurable: false,
          writable: false
        });
        Object.defineProperty(window, '__stripeConnectApplyInitializationUpdate', {
          value: function(expectedDocumentId, serialized, updateInstance, updateComponentProps) {
            if (!canUpdateDocument(expectedDocumentId)) return false;
            var initializationUpdater = getOwnPropertyDescriptor(window, '__stripeConnectUpdateInitializationObject');
            var updateConnectInstance = updateInstance && getOwnPropertyDescriptor(window, 'updateConnectInstance');
            var callSetterWithSerializableValue = updateComponentProps && getOwnPropertyDescriptor(window, 'callSetterWithSerializableValue');
            if (!initializationUpdater || typeof initializationUpdater.value !== 'function') return false;
            if (updateInstance && (!updateConnectInstance || typeof updateConnectInstance.value !== 'function')) return false;
            if (updateComponentProps && (!callSetterWithSerializableValue || typeof callSetterWithSerializableValue.value !== 'function')) return false;
            var initialization = jsonParse(serialized);
            initializationUpdater.value(serialized);
            if (updateInstance) {
              var initParams = initialization.initParams || {};
              updateConnectInstance.value({ appearance: initParams.appearance, locale: initParams.locale });
            }
            if (updateComponentProps) {
              var componentProps = initialization.initComponentProps || {};
              objectKeys(componentProps).forEach(function(key) {
                callSetterWithSerializableValue.value({ setter: key, value: componentProps[key] });
              });
            }
            return true;
          },
          configurable: false,
          writable: false
        });
        Object.defineProperty(window, '__stripeConnectUpdateInitializationObject', {
          value: function(serialized) { initializationObjectJson = serialized; },
          configurable: false,
          writable: false
        });
        Object.defineProperty(webView, 'postMessage', {
          value: function(rawMessage) {
          bridge.postMessage(JSON.stringify({
            documentId: documentId,
            rawMessage: String(rawMessage)
          }));
          },
          configurable: false,
          writable: false
        });
        bridge.onmessage = function(event) {
          var reply = JSON.parse(event.data);
          if (reply.type === 'connectBridgeReply') {
            if (reply.action === 'clientSecret') {
              window.clientSecretDeferred.resolve(reply.data);
            } else if (reply.action === 'authenticatedWebView') {
              window.returnedFromAuthenticatedWebView(reply.data);
            } else if (reply.action === 'financialConnections') {
              window.callSetterWithSerializableValue({
                setter: 'setCollectMobileFinancialConnectionsResult',
                value: reply.data
              });
            }
          }
        };
        webView.postMessage(JSON.stringify({ type: '__DOCUMENT_START_TYPE__' }));
        var observeHeight = function() {
          if (!__OBSERVE_CONTENT_HEIGHT__ || window.__stripeConnectHeightObserver || !document.body || !window.ResizeObserver) return;
          window.__stripeConnectHeightObserver = true;
          var lastHeight = -1;
          var reportHeight = function() {
            var height = document.body.getBoundingClientRect().height;
            if (Math.abs(height - lastHeight) < 0.5) return;
            lastHeight = height;
            webView.postMessage(JSON.stringify({
              type: 'contentHeightChanged',
              data: { height: height }
            }));
          };
          new ResizeObserver(reportHeight).observe(document.body);
          reportHeight();
        };
        if (document.body) observeHeight();
        else document.addEventListener('DOMContentLoaded', observeHeight, { once: true });
      })();
    """.trimIndent()
  }
}
