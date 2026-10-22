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
import java.lang.ref.WeakReference
import java.util.UUID

/**
 * Hosts the Connect WebView and owns its attachment, request, claim, and initialization state.
 * These lifecycles invalidate one another, so the state machine stays in this view adapter.
 */
@Suppress("LargeClass")
class ConnectBridgeContainerView(
  context: Context,
) : FrameLayout(context) {
  internal data class Request(
    val attachmentId: String,
    val requestHandle: String,
    val documentId: String,
    val contextId: String,
    val sourceGeneration: String,
    val rawMessage: String,
    val sourceOrigin: String,
    val isMainFrame: Boolean,
    val sourceViewMatched: Boolean,
  )

  internal data class ClaimResult(
    val claimId: String,
    val attachmentId: String,
    val requestHandle: String,
    val sourceGeneration: String,
    val admitted: Boolean,
    val claimToken: String?,
  )

  internal var onReady: ((String) -> Unit)? = null
  internal var onUnavailable: (() -> Unit)? = null
  internal var onRequest: ((Request) -> Unit)? = null
  internal var onClaimResult: ((ClaimResult) -> Unit)? = null
  internal var onError: ((String) -> Unit)? = null
  internal var evaluateInitializationUpdateForTesting: ((WebView, String, (String?) -> Unit) -> Unit)? = null

  internal var contextId: String? = null
    set(value) {
      if (field == value) return
      field = value
      propsDirty = true
    }

  internal var sourceGeneration: String? = null
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

  private class PendingRequest(
    val recordId: String,
    val attachmentId: String,
    val contextId: String,
    val sourceGeneration: String,
    val documentId: String,
    val messageType: String,
    val requestId: String?,
    val rawMessage: String,
    val requiresReply: Boolean,
    val replyProxy: androidx.webkit.JavaScriptReplyProxy?,
    var claimId: String? = null,
    var claimToken: String? = null,
    var claimed: Boolean = false,
  )

  private data class BridgeMessage(
    val documentId: String,
    val rawMessage: String,
    val parsedMessage: JSONObject?,
  )

  private data class InitializationUpdate(
    val updateId: String,
    val webView: WebView,
    val attachmentId: String,
    val documentId: String,
    val generation: Int,
    val targetJson: String,
  )

  private var boundWebView: WebView? = null
  private var documentStartScript: ScriptHandler? = null
  private var attachmentId: String? = null
  private var currentDocumentId: String? = null
  private val pendingRequests = linkedMapOf<String, PendingRequest>()
  private var invalidated = false
  private var errorReported = false
  private var propsDirty = false
  private var pendingInitializationUpdate = false
  private var pendingInitializationUpdatePreviousJson: String? = null
  private var configurationUpdateInFlightId: String? = null
  private var configurationUpdateRetryRequested = false
  private var initializationUpdateGeneration = 0
  private var documentInitializationBaselineJson: String? = null
  private var appliedContextId: String? = null
  private var appliedSourceGeneration: String? = null
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
    val sourceGenerationChanged = appliedSourceGeneration != sourceGeneration
    val sourceChanged = appliedConnectSource != connectSource
    val heightObservationChanged = appliedObserveContentHeight != observeContentHeight
    val initializationChanged = appliedInitializationObjectJson != initializationObjectJson
    val sourceConfigurationChanged = isSourceConfigurationChanged(
      contextChanged,
      sourceGenerationChanged,
      sourceChanged,
      heightObservationChanged,
    )
    val configurationChanged = sourceConfigurationChanged || initializationChanged
    val previousInitializationJson = appliedInitializationObjectJson
    appliedContextId = contextId
    appliedSourceGeneration = sourceGeneration
    appliedConnectSource = connectSource
    appliedInitializationObjectJson = initializationObjectJson
    appliedObserveContentHeight = observeContentHeight
    if (!configurationChanged) return

    if (sourceConfigurationChanged) {
      clearPendingInitializationUpdate()
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
    if (pendingInitializationUpdatePreviousJson == null) {
      pendingInitializationUpdatePreviousJson = documentInitializationBaselineJson ?: previousInitializationJson
    }
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
    if (invalidated || propsDirty || attachmentId != expectedAttachmentId) return false
    val pending = pendingRequests[requestHandle] ?: return false
    if (!isCurrentReplyRecord(pending, expectedAttachmentId)) return false
    pendingRequests.remove(requestHandle)
    pending.claimToken?.let(::removeClaimToken)
    pending.replyProxy?.postMessage(payload)
    return true
  }

  private fun isSourceConfigurationChanged(
    contextChanged: Boolean,
    sourceGenerationChanged: Boolean,
    sourceChanged: Boolean,
    heightObservationChanged: Boolean,
  ): Boolean = contextChanged || sourceGenerationChanged || sourceChanged || heightObservationChanged

  private fun isCurrentReplyRecord(
    pending: PendingRequest,
    expectedAttachmentId: String,
  ): Boolean =
    isCurrentPendingBinding(pending, expectedAttachmentId, pending.contextId, pending.sourceGeneration) &&
      pending.documentId == currentDocumentId &&
      pending.requiresReply &&
      pending.claimed

  private fun isCurrentPendingBinding(
    pending: PendingRequest,
    expectedAttachmentId: String,
    expectedContextId: String,
    expectedSourceGeneration: String,
  ): Boolean =
    isCurrentBinding(expectedAttachmentId, expectedContextId, expectedSourceGeneration) &&
      pending.attachmentId == expectedAttachmentId &&
      pending.contextId == expectedContextId &&
      pending.sourceGeneration == expectedSourceGeneration

  private fun isCurrentDocument(
    pending: PendingRequest,
    expectedDocumentId: String,
  ): Boolean =
    pending.documentId == expectedDocumentId && currentDocumentId == expectedDocumentId

  internal fun claim(
    claimId: String,
    expectedAttachmentId: String,
    requestHandle: String,
    expectedDocumentId: String,
    expectedContextId: String,
    expectedSourceGeneration: String,
  ) {
    val pending = pendingRequests[requestHandle]
    val webView = boundWebView
    if (
      pending == null || webView == null ||
      !isValidClaimRequest(
        pending,
        expectedAttachmentId,
        requestHandle,
        expectedDocumentId,
        expectedContextId,
        expectedSourceGeneration,
      )
    ) {
      emitClaimResult(claimId, expectedAttachmentId, requestHandle, expectedSourceGeneration, false, null)
      return
    }
    if (!isAttachedLaunchOwner(webView)) {
      rejectClaim(claimId, expectedAttachmentId, requestHandle, expectedSourceGeneration, pending)
      return
    }

    pending.claimId = claimId
    webView.evaluateJavascript(claimProbeScript(expectedDocumentId)) { result ->
      completeClaimProbe(
        result,
        webView,
        pending,
        claimId,
        expectedAttachmentId,
        requestHandle,
        expectedDocumentId,
        expectedContextId,
        expectedSourceGeneration,
      )
    }
  }

  private fun isValidClaimRequest(
    pending: PendingRequest,
    expectedAttachmentId: String,
    requestHandle: String,
    expectedDocumentId: String,
    expectedContextId: String,
    expectedSourceGeneration: String,
  ): Boolean =
    isUnclaimedRequest(pending, requestHandle) &&
      isCurrentPendingBinding(pending, expectedAttachmentId, expectedContextId, expectedSourceGeneration) &&
      isCurrentDocument(pending, expectedDocumentId)

  private fun isUnclaimedRequest(
    pending: PendingRequest,
    requestHandle: String,
  ): Boolean = pendingRequests[requestHandle] === pending && pending.claimId == null

  private fun completeClaimProbe(
    result: String?,
    webView: WebView,
    pending: PendingRequest,
    claimId: String,
    expectedAttachmentId: String,
    requestHandle: String,
    expectedDocumentId: String,
    expectedContextId: String,
    expectedSourceGeneration: String,
  ) {
    if (
      result?.trim('"') != "true" ||
      !isCurrentClaim(
        webView,
        pending,
        claimId,
        expectedAttachmentId,
        requestHandle,
        expectedDocumentId,
        expectedContextId,
        expectedSourceGeneration,
      )
    ) {
      rejectClaim(claimId, expectedAttachmentId, requestHandle, expectedSourceGeneration, pending)
      return
    }

    pending.claimed = true
    val needsLaunchClaim = pending.messageType in LAUNCH_MESSAGE_TYPES
    val claimToken = if (needsLaunchClaim) registerClaimToken(pending, requestHandle) else null
    if (needsLaunchClaim && claimToken == null) {
      rejectClaim(claimId, expectedAttachmentId, requestHandle, expectedSourceGeneration, pending)
      return
    }
    if (!pending.requiresReply) pendingRequests.remove(requestHandle, pending)
    emitClaimResult(claimId, expectedAttachmentId, requestHandle, expectedSourceGeneration, true, claimToken)
  }

  private fun isCurrentClaim(
    webView: WebView,
    pending: PendingRequest,
    claimId: String,
    expectedAttachmentId: String,
    requestHandle: String,
    expectedDocumentId: String,
    expectedContextId: String,
    expectedSourceGeneration: String,
  ): Boolean =
    isClaimRequestRecord(pending, requestHandle, claimId) &&
      isCurrentPendingBinding(pending, expectedAttachmentId, expectedContextId, expectedSourceGeneration) &&
      isCurrentDocument(pending, expectedDocumentId) &&
      isAttachedLaunchOwner(webView)

  private fun isClaimRequestRecord(
    pending: PendingRequest,
    requestHandle: String,
    claimId: String,
  ): Boolean = pendingRequests[requestHandle] === pending && pending.claimId == claimId

  private fun rejectClaim(
    claimId: String,
    expectedAttachmentId: String,
    requestHandle: String,
    expectedSourceGeneration: String,
    pending: PendingRequest,
  ) {
    cancelRequest(requestHandle, pending)
    emitClaimResult(claimId, expectedAttachmentId, requestHandle, expectedSourceGeneration, false, null)
  }

  private fun emitClaimResult(
    claimId: String,
    expectedAttachmentId: String,
    requestHandle: String,
    expectedSourceGeneration: String,
    admitted: Boolean,
    claimToken: String?,
  ) {
    onClaimResult?.invoke(
      ClaimResult(
        claimId,
        expectedAttachmentId,
        requestHandle,
        expectedSourceGeneration,
        admitted,
        claimToken,
      ),
    )
  }

  internal fun cancel(
    expectedAttachmentId: String,
    requestHandle: String,
  ) {
    val pending = pendingRequests[requestHandle] ?: return
    if (pending.attachmentId != expectedAttachmentId) return
    cancelRequest(requestHandle)
  }

  private fun cancelRequest(requestHandle: String, expectedPending: PendingRequest? = null) {
    val pending = pendingRequests[requestHandle] ?: return
    if (expectedPending != null && pending !== expectedPending) return
    pendingRequests.remove(requestHandle, pending)
    pending.claimToken?.let(::removeClaimToken)
    if (pending.requiresReply) {
      val action = when (pending.messageType) {
        "openAuthenticatedWebView" -> "authenticatedWebView"
        "openFinancialConnections" -> "financialConnections"
        else -> "clientSecret"
      }
      val data: Any = when (pending.messageType) {
        "openAuthenticatedWebView" -> JSONObject()
          .put("id", pending.requestId ?: "")
          .put("url", JSONObject.NULL)
        "openFinancialConnections" -> JSONObject()
          .put("id", pending.requestId ?: "")
          .put("financialConnectionsSession", JSONObject.NULL)
          .put("token", JSONObject.NULL)
          .put("error", JSONObject().put("code", "Canceled").put("message", "The flow has been canceled."))
        else -> JSONObject.NULL
      }
      runCatching {
        pending.replyProxy?.postMessage(
          JSONObject()
            .put("type", "connectBridgeReply")
            .put("action", action)
            .put("data", data)
            .toString(),
        )
      }
    }
  }

  private fun clearPendingRequests() {
    pendingRequests.keys.toList().forEach(::cancelRequest)
  }

  private fun registerClaimToken(pending: PendingRequest, requestHandle: String): String? {
    if (pending.messageType !in LAUNCH_MESSAGE_TYPES) return null
    val token = UUID.randomUUID().toString()
    val claim = ClaimTokenRecord(
      token = token,
      owner = WeakReference(this),
      requestRecordId = pending.recordId,
      attachmentId = pending.attachmentId,
      requestHandle = requestHandle,
      documentId = pending.documentId,
      contextId = pending.contextId,
      sourceGeneration = pending.sourceGeneration,
      rawMessage = pending.rawMessage,
    )
    synchronized(launchClaims) {
      if (launchClaims.size >= MAX_PENDING_REQUESTS) return null
      launchClaims[token] = claim
    }
    pending.claimToken = token
    return token
  }

  internal fun revalidateClaimToken(
    claim: ClaimTokenRecord,
    callback: (Boolean) -> Unit,
  ) {
    val pending = pendingRequests[claim.requestHandle]
    val webView = boundWebView
    if (pending == null || webView == null || !isValidLaunchClaim(claim, pending)) {
      cancelClaimRecord(claim, pending)
      callback(false)
      return
    }
    if (!isAttachedLaunchOwner(webView)) {
      cancelClaimRecord(claim, pending, requireMatchingToken = true)
      callback(false)
      return
    }

    webView.evaluateJavascript(claimProbeScript(claim.documentId)) { result ->
      completeLaunchClaimProbe(result, claim, pending, webView, callback)
    }
  }

  private fun isValidLaunchClaim(
    claim: ClaimTokenRecord,
    pending: PendingRequest,
  ): Boolean =
    isCurrentLaunchRequestRecord(pending, claim) &&
      isCurrentPendingBinding(pending, claim.attachmentId, claim.contextId, claim.sourceGeneration) &&
      isCurrentDocument(pending, claim.documentId)

  private fun isCurrentLaunchRequestRecord(
    pending: PendingRequest,
    claim: ClaimTokenRecord,
  ): Boolean =
    pending.recordId == claim.requestRecordId &&
      pending.claimToken == claim.token &&
      pending.claimed

  private fun isCurrentLaunchTokenRecord(
    pending: PendingRequest,
    claim: ClaimTokenRecord,
  ): Boolean =
    pendingRequests[claim.requestHandle] === pending && isCurrentLaunchRequestRecord(pending, claim)

  private fun completeLaunchClaimProbe(
    result: String?,
    claim: ClaimTokenRecord,
    pending: PendingRequest,
    webView: WebView,
    callback: (Boolean) -> Unit,
  ) {
    val isCurrent =
      isCurrentLaunchTokenRecord(pending, claim) &&
        isCurrentPendingBinding(pending, claim.attachmentId, claim.contextId, claim.sourceGeneration) &&
        isCurrentDocument(pending, claim.documentId) &&
        isAttachedLaunchOwner(webView)
    if (result?.trim('"') == "true" && isCurrent) {
      pending.claimToken = null
      callback(true)
    } else {
      cancelRequest(claim.requestHandle, pending)
      callback(false)
    }
  }

  private fun cancelClaimRecord(
    claim: ClaimTokenRecord,
    pending: PendingRequest?,
    requireMatchingToken: Boolean = false,
  ) {
    pending?.takeIf {
      it.recordId == claim.requestRecordId &&
        (!requireMatchingToken || it.claimToken == claim.token)
    }
      ?.let { cancelRequest(claim.requestHandle, it) }
  }

  private fun claimProbeScript(expectedDocumentId: String): String =
    """
      (function() {
        return window.location.origin === 'https://connect-js.stripe.com' &&
          window.__stripeConnectDocument === ${JSONObject.quote(expectedDocumentId)};
      })();
    """.trimIndent()

  private fun isAttachedLaunchOwner(webView: WebView): Boolean =
    !invalidated && isAttachedToWindow && webView.isAttachedToWindow && boundWebView === webView

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
    val expectedSourceGeneration = sourceGeneration.orEmpty()
    try {
      WebViewCompat.addWebMessageListener(
        webView,
        BRIDGE_OBJECT_NAME,
        setOf(ORIGIN_RULE),
        WebViewCompat.WebMessageListener { sourceView, message, sourceOrigin, isMainFrame, replyProxy ->
          handleMessage(
            newAttachmentId,
            expectedContextId,
            expectedSourceGeneration,
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
    expectedSourceGeneration: String,
    expectedWebView: WebView,
    sourceView: WebView,
    message: WebMessageCompat,
    sourceOrigin: Uri,
    isMainFrame: Boolean,
    replyProxy: androidx.webkit.JavaScriptReplyProxy,
  ) {
    if (
      !isCurrentBinding(expectedAttachmentId, expectedContextId, expectedSourceGeneration) ||
      !isAcceptedMessageSource(expectedWebView, sourceView, sourceOrigin, isMainFrame)
    ) {
      replyProxy.postMessage(ACKNOWLEDGEMENT)
      return
    }
    val bridgeMessage = parseBridgeMessage(message.data)
    if (bridgeMessage == null) {
      replyProxy.postMessage(ACKNOWLEDGEMENT)
      return
    }

    if (currentDocumentId != bridgeMessage.documentId) {
      clearPendingRequests()
      currentDocumentId = bridgeMessage.documentId
      documentInitializationBaselineJson = null
      configurationUpdateInFlightId = null
      configurationUpdateRetryRequested = false
    }

    if (handleDocumentStart(bridgeMessage, replyProxy)) return
    deliverPendingInitializationUpdate()
    dispatchRequest(
      expectedAttachmentId,
      expectedContextId,
      expectedSourceGeneration,
      expectedWebView,
      sourceView,
      sourceOrigin,
      isMainFrame,
      bridgeMessage,
      replyProxy,
    )
  }

  private fun parseBridgeMessage(rawEnvelope: String?): BridgeMessage? {
    val envelope = runCatching { rawEnvelope?.let(::JSONObject) }.getOrNull()
    val documentId = envelope?.optString("documentId").orEmpty()
    val rawMessage = envelope?.optString("rawMessage").orEmpty()
    if (documentId.isEmpty() || rawMessage.isEmpty()) return null
    return BridgeMessage(
      documentId = documentId,
      rawMessage = rawMessage,
      parsedMessage = runCatching { JSONObject(rawMessage) }.getOrNull(),
    )
  }

  private fun handleDocumentStart(
    message: BridgeMessage,
    replyProxy: androidx.webkit.JavaScriptReplyProxy,
  ): Boolean {
    val parsedMessage = message.parsedMessage
    if (parsedMessage?.optString("type") != DOCUMENT_START_MESSAGE) return false

    val documentInitializationJson = parsedMessage.optJSONObject("data")
      ?.optString("initializationObjectJson")
      ?.takeIf { it.isNotEmpty() }
    documentInitializationBaselineJson = documentInitializationJson ?: initializationObjectJson
    val updateRequired = documentInitializationBaselineJson != initializationObjectJson
    pendingInitializationUpdate = updateRequired
    pendingInitializationUpdatePreviousJson =
      if (updateRequired) documentInitializationBaselineJson else null
    initializationUpdateGeneration += 1
    replyProxy.postMessage(ACKNOWLEDGEMENT)
    deliverPendingInitializationUpdate()
    return true
  }

  private fun dispatchRequest(
    currentAttachmentId: String,
    expectedContextId: String,
    expectedSourceGeneration: String,
    expectedWebView: WebView,
    sourceView: WebView,
    sourceOrigin: Uri,
    isMainFrame: Boolean,
    message: BridgeMessage,
    replyProxy: androidx.webkit.JavaScriptReplyProxy,
  ) {
    val parsedMessage = message.parsedMessage
    val requiresReply = parsedMessage?.optString("type")?.let { it in ASYNCHRONOUS_MESSAGE_TYPES } == true
    val requestHandle = UUID.randomUUID().toString()
    val data = parsedMessage?.optJSONObject("data")
    if (pendingRequests.size >= MAX_PENDING_REQUESTS) {
      val oldestHandle = pendingRequests.keys.firstOrNull()
      if (oldestHandle != null) cancelRequest(oldestHandle)
    }
    val pending = PendingRequest(
      recordId = UUID.randomUUID().toString(),
      attachmentId = currentAttachmentId,
      contextId = expectedContextId,
      sourceGeneration = expectedSourceGeneration,
      documentId = message.documentId,
      messageType = parsedMessage?.optString("type").orEmpty(),
      requestId = data?.optString("id")?.takeIf { it.isNotEmpty() },
      rawMessage = message.rawMessage,
      requiresReply = requiresReply,
      replyProxy = if (requiresReply) replyProxy else null,
    )
    pendingRequests[requestHandle] = pending
    onRequest?.invoke(
      Request(
        attachmentId = currentAttachmentId,
        requestHandle = requestHandle,
        documentId = message.documentId,
        contextId = expectedContextId,
        sourceGeneration = expectedSourceGeneration,
        rawMessage = message.rawMessage,
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
    expectedSourceGeneration: String,
  ): Boolean {
    if (invalidated || propsDirty || attachmentId != expectedAttachmentId) return false
    return contextId.orEmpty() == expectedContextId && sourceGeneration.orEmpty() == expectedSourceGeneration &&
      appliedContextId == contextId && appliedSourceGeneration == sourceGeneration
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
    clearPendingRequests()
    clearClaimTokensForOwner(this)
    clearPendingInitializationUpdate()
    boundWebView = null
    attachmentId = null
    currentDocumentId = null
    documentInitializationBaselineJson = null
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
    if (!pendingInitializationUpdate) return
    if (configurationUpdateInFlightId != null) {
      configurationUpdateRetryRequested = true
      return
    }
    val webView = boundWebView ?: return
    val expectedAttachmentId = attachmentId ?: return
    val expectedDocumentId = currentDocumentId ?: return
    val previousJson = pendingInitializationUpdatePreviousJson ?: return
    val generation = initializationUpdateGeneration
    val targetJson = initializationObjectJson
    val updateInstance = initializationInstanceChanged(previousJson, initializationObjectJson)
    val updateComponentProps = initializationComponentPropsChanged(previousJson, initializationObjectJson)
    if (!updateInstance && !updateComponentProps && previousJson == targetJson) {
      markInitializationUpdateApplied(targetJson)
      return
    }
    val updateId = UUID.randomUUID().toString()
    configurationUpdateInFlightId = updateId
    val update = InitializationUpdate(
      updateId = updateId,
      webView = webView,
      attachmentId = expectedAttachmentId,
      documentId = expectedDocumentId,
      generation = generation,
      targetJson = targetJson,
    )

    val script = initializationUpdateScript(
      expectedDocumentId,
      targetJson,
      updateInstance,
      updateComponentProps,
    )
    val completion: (String?) -> Unit = { result -> finishInitializationUpdate(update, result) }
    if (evaluateInitializationUpdateForTesting != null) {
      evaluateInitializationUpdateForTesting?.invoke(webView, script) { result -> completion(result) }
    } else {
      webView.evaluateJavascript(script, completion)
    }
  }

  private fun finishInitializationUpdate(
    update: InitializationUpdate,
    result: String?,
  ) {
    if (configurationUpdateInFlightId != update.updateId) return
    configurationUpdateInFlightId = null
    if (!isCurrentInitializationUpdate(update)) return

    val shouldRetry =
      configurationUpdateRetryRequested || update.generation != initializationUpdateGeneration
    configurationUpdateRetryRequested = false
    if (result?.trim('"') != "true") {
      if (shouldRetry) deliverPendingInitializationUpdate()
      return
    }

    documentInitializationBaselineJson = update.targetJson
    if (shouldRetry) {
      pendingInitializationUpdatePreviousJson = update.targetJson
      deliverPendingInitializationUpdate()
    } else {
      markInitializationUpdateApplied(update.targetJson)
    }
  }

  private fun isCurrentInitializationUpdate(update: InitializationUpdate): Boolean =
    boundWebView === update.webView &&
      attachmentId == update.attachmentId &&
      currentDocumentId == update.documentId

  private fun markInitializationUpdateApplied(targetJson: String) {
    documentInitializationBaselineJson = targetJson
    pendingInitializationUpdate = false
    pendingInitializationUpdatePreviousJson = null
  }

  private fun clearPendingInitializationUpdate() {
    pendingInitializationUpdate = false
    pendingInitializationUpdatePreviousJson = null
    configurationUpdateInFlightId = null
    configurationUpdateRetryRequested = false
    documentInitializationBaselineJson = null
    initializationUpdateGeneration += 1
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
    private const val MAX_PENDING_REQUESTS = 128
    internal data class ClaimTokenRecord(
      val token: String,
      val owner: WeakReference<ConnectBridgeContainerView>,
      val requestRecordId: String,
      val attachmentId: String,
      val requestHandle: String,
      val documentId: String,
      val contextId: String,
      val sourceGeneration: String,
      val rawMessage: String,
    )
    private val launchClaims = linkedMapOf<String, ClaimTokenRecord>()

    internal fun removeClaimToken(token: String) {
      synchronized(launchClaims) { launchClaims.remove(token) }
    }

    internal fun clearClaimTokensForOwner(owner: ConnectBridgeContainerView) {
      synchronized(launchClaims) {
        launchClaims.entries.removeAll { it.value.owner.get() === owner }
      }
    }

    internal fun authorizeLaunchClaim(
      token: String,
      expectedMessageType: String,
      expectedUrl: String? = null,
      expectedClientSecret: String? = null,
      expectedConnectedAccountId: String? = null,
      callback: (Boolean) -> Unit,
    ) {
      val claim = synchronized(launchClaims) { launchClaims.remove(token) }
      if (claim == null) {
        callback(false)
        return
      }
      val envelope = runCatching { JSONObject(claim.rawMessage) }.getOrNull()
      val data = envelope?.optJSONObject("data")
      val argumentsMatch =
        envelope?.optString("type") == expectedMessageType &&
          data != null &&
          when (expectedMessageType) {
            "openAuthenticatedWebView" -> data.optString("url") == expectedUrl
            "openFinancialConnections" ->
              data.optString("clientSecret") == expectedClientSecret &&
                data.optString("connectedAccountId") == expectedConnectedAccountId.orEmpty()
            else -> false
          }
      val owner = claim.owner.get()
      if (!argumentsMatch || owner == null) {
        owner?.pendingRequests?.get(claim.requestHandle)
          ?.takeIf { it.recordId == claim.requestRecordId }
          ?.let { owner.cancelRequest(claim.requestHandle, it) }
        callback(false)
        return
      }
      owner.revalidateClaimToken(claim, callback)
    }
    private val ASYNCHRONOUS_MESSAGE_TYPES = setOf(
      "fetchClientSecret",
      "openAuthenticatedWebView",
      "openFinancialConnections",
    )
    private val LAUNCH_MESSAGE_TYPES = setOf("openAuthenticatedWebView", "openFinancialConnections")

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
        webView.postMessage(JSON.stringify({
          type: '__DOCUMENT_START_TYPE__',
          data: { initializationObjectJson: initializationObjectJson }
        }));
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
