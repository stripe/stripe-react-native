package com.reactnativestripesdk.connect

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.ConnectBridgeContainerManagerDelegate
import com.facebook.react.viewmanagers.ConnectBridgeContainerManagerInterface

@ReactModule(name = ConnectBridgeContainerManager.NAME)
// React Native's generated view interface requires prop, command, and event overrides here.
@Suppress("TooManyFunctions")
class ConnectBridgeContainerManager :
  ViewGroupManager<ConnectBridgeContainerView>(),
  ConnectBridgeContainerManagerInterface<ConnectBridgeContainerView> {
  private val delegate = ConnectBridgeContainerManagerDelegate(this)

  override fun getName() = NAME

  override fun getDelegate() = delegate

  override fun getExportedCustomDirectEventTypeConstants() =
    mutableMapOf(
      EVENT_REQUEST to mutableMapOf("registrationName" to "onBridgeRequest"),
      EVENT_CLAIM_RESULT to mutableMapOf("registrationName" to "onBridgeClaimResult"),
      EVENT_ERROR to mutableMapOf("registrationName" to "onBridgeError"),
    )

  override fun createViewInstance(reactContext: ThemedReactContext): ConnectBridgeContainerView =
    ConnectBridgeContainerView(reactContext).apply {
      onRequest = { request ->
        dispatchEvent(this, BridgeRequestEvent(reactContext.surfaceId, id, request))
      }
      onClaimResult = { result ->
        dispatchEvent(this, BridgeClaimResultEvent(reactContext.surfaceId, id, result))
      }
      onError = { error ->
        dispatchEvent(this, BridgeErrorEvent(reactContext.surfaceId, id, error))
      }
    }

  override fun onAfterUpdateTransaction(view: ConnectBridgeContainerView) {
    super.onAfterUpdateTransaction(view)
    view.onAfterUpdateTransaction()
  }

  @ReactProp(name = "contextId")
  override fun setContextId(
    view: ConnectBridgeContainerView,
    contextId: String?,
  ) {
    view.contextId = contextId
  }

  @ReactProp(name = "connectSource")
  override fun setConnectSource(
    view: ConnectBridgeContainerView,
    source: String?,
  ) {
    view.connectSource = source
  }

  @ReactProp(name = "sourceGeneration")
  override fun setSourceGeneration(
    view: ConnectBridgeContainerView,
    sourceGeneration: String?,
  ) {
    view.sourceGeneration = sourceGeneration
  }

  @ReactProp(name = "initializationObjectJson")
  override fun setInitializationObjectJson(
    view: ConnectBridgeContainerView,
    initializationObjectJson: String?,
  ) {
    view.initializationObjectJson = initializationObjectJson.orEmpty()
  }

  @ReactProp(name = "observeContentHeight", defaultBoolean = false)
  override fun setObserveContentHeight(
    view: ConnectBridgeContainerView,
    observeContentHeight: Boolean,
  ) {
    view.observeContentHeight = observeContentHeight
  }

  override fun onDropViewInstance(view: ConnectBridgeContainerView) {
    super.onDropViewInstance(view)
    view.dispose()
  }

  override fun reply(
    view: ConnectBridgeContainerView,
    attachmentId: String,
    requestHandle: String,
    payload: String,
  ) {
    view.reply(attachmentId, requestHandle, payload)
  }

  override fun claim(
    view: ConnectBridgeContainerView,
    claimId: String,
    attachmentId: String,
    requestHandle: String,
    documentId: String,
    contextId: String,
    sourceGeneration: String,
  ) {
    view.claim(claimId, attachmentId, requestHandle, documentId, contextId, sourceGeneration)
  }

  override fun cancel(
    view: ConnectBridgeContainerView,
    attachmentId: String,
    requestHandle: String,
  ) {
    view.cancel(attachmentId, requestHandle)
  }

  private fun dispatchEvent(
    view: ConnectBridgeContainerView,
    event: Event<*>,
  ) {
    val context = view.context as ThemedReactContext
    UIManagerHelper.getEventDispatcherForReactTag(context, view.id)?.dispatchEvent(event)
  }

  private class BridgeRequestEvent(
    surfaceId: Int,
    viewId: Int,
    private val request: ConnectBridgeContainerView.Request,
  ) : Event<BridgeRequestEvent>(surfaceId, viewId) {
    override fun canCoalesce() = false

    override fun getEventName() = EVENT_REQUEST

    override fun getEventData(): WritableMap =
      Arguments.createMap().apply {
        putString("attachmentId", request.attachmentId)
        putString("requestHandle", request.requestHandle)
        putString("documentId", request.documentId)
        putString("contextId", request.contextId)
        putString("sourceGeneration", request.sourceGeneration)
        putString("rawMessage", request.rawMessage)
      }
  }

  private class BridgeClaimResultEvent(
    surfaceId: Int,
    viewId: Int,
    private val result: ConnectBridgeContainerView.ClaimResult,
  ) : Event<BridgeClaimResultEvent>(surfaceId, viewId) {
    override fun canCoalesce() = false

    override fun getEventName() = EVENT_CLAIM_RESULT

    override fun getEventData(): WritableMap =
      Arguments.createMap().apply {
        putString("claimId", result.claimId)
        putString("attachmentId", result.attachmentId)
        putString("requestHandle", result.requestHandle)
        putString("sourceGeneration", result.sourceGeneration)
        putBoolean("admitted", result.admitted)
        result.claimToken?.let { putString("claimToken", it) }
      }
  }

  private class BridgeErrorEvent(
    surfaceId: Int,
    viewId: Int,
    private val error: String,
  ) : Event<BridgeErrorEvent>(surfaceId, viewId) {
    override fun getEventName() = EVENT_ERROR

    override fun getEventData(): WritableMap =
      Arguments.createMap().apply { putString("error", error) }
  }

  companion object {
    const val NAME = "ConnectBridgeContainer"
    private const val EVENT_REQUEST = "topBridgeRequest"
    private const val EVENT_CLAIM_RESULT = "topBridgeClaimResult"
    private const val EVENT_ERROR = "topBridgeError"
  }
}
