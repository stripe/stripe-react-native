import Foundation
import UIKit
import WebKit

private final class WeakConnectBridgeScriptHandler: NSObject, WKScriptMessageHandlerWithReply {
    weak var owner: ConnectBridgeContainerView?
    private let attachmentId: String
    private let contextId: String
    private let sourceGeneration: String

    init(owner: ConnectBridgeContainerView, attachmentId: String, contextId: String, sourceGeneration: String) {
        self.owner = owner
        self.attachmentId = attachmentId
        self.contextId = contextId
        self.sourceGeneration = sourceGeneration
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        owner?.receive(
            message,
            expectedAttachmentId: attachmentId,
            expectedContextId: contextId,
            expectedSourceGeneration: sourceGeneration,
            replyHandler: replyHandler
        )
            ?? replyHandler(["type": "ack"], nil)
    }
}

private final class PendingConnectBridgeRequest {
    let attachmentId: String
    let contextId: String
    let sourceGeneration: String
    let documentId: String
    let requestHandle: String
    let messageType: String
    let requestId: String?
    let launchUrl: String?
    let clientSecret: String?
    let connectedAccountId: String?
    let completion: ((Any?, String?) -> Void)?
    var claimId: String?
    var claimToken: String?
    var claimed = false

    init(
        attachmentId: String,
        contextId: String,
        sourceGeneration: String,
        documentId: String,
        requestHandle: String,
        messageType: String,
        requestId: String?,
        launchUrl: String?,
        clientSecret: String?,
        connectedAccountId: String?,
        completion: ((Any?, String?) -> Void)?
    ) {
        self.attachmentId = attachmentId
        self.contextId = contextId
        self.sourceGeneration = sourceGeneration
        self.documentId = documentId
        self.requestHandle = requestHandle
        self.messageType = messageType
        self.requestId = requestId
        self.launchUrl = launchUrl
        self.clientSecret = clientSecret
        self.connectedAccountId = connectedAccountId
        self.completion = completion
    }
}

private final class WeakConnectBridgeOwner {
    weak var value: ConnectBridgeContainerView?

    init(_ value: ConnectBridgeContainerView) {
        self.value = value
    }
}

private final class ConnectBridgeLaunchClaim {
    let owner: WeakConnectBridgeOwner
    let request: PendingConnectBridgeRequest
    let token: String

    init(owner: ConnectBridgeContainerView, request: PendingConnectBridgeRequest, token: String) {
        self.owner = WeakConnectBridgeOwner(owner)
        self.request = request
        self.token = token
    }
}

private final class ConnectBridgeLaunchClaimRegistry: @unchecked Sendable {
    private let lock = NSLock()
    private var claims: [String: ConnectBridgeLaunchClaim] = [:]

    func register(owner: ConnectBridgeContainerView, request: PendingConnectBridgeRequest) -> String? {
        lock.lock()
        defer { lock.unlock() }
        guard claims.count < ConnectBridgeContainerView.maximumPendingRequests else { return nil }
        let token = UUID().uuidString
        claims[token] = ConnectBridgeLaunchClaim(owner: owner, request: request, token: token)
        return token
    }

    func consume(_ token: String) -> ConnectBridgeLaunchClaim? {
        lock.lock()
        defer { lock.unlock() }
        return claims.removeValue(forKey: token)
    }

    func remove(_ token: String?) {
        guard let token else { return }
        lock.lock()
        claims.removeValue(forKey: token)
        lock.unlock()
    }

    func removeAll(for owner: ConnectBridgeContainerView) {
        lock.lock()
        claims = claims.filter { $0.value.owner.value !== owner }
        lock.unlock()
    }
}

@objc(ConnectBridgeContainerView)
public final class ConnectBridgeContainerView: UIView {
    fileprivate static let maximumPendingRequests = 128
    private static let launchClaimRegistry = ConnectBridgeLaunchClaimRegistry()

    @objc public var onBridgeRequest: ((NSDictionary) -> Void)?
    @objc public var onBridgeClaimResult: ((NSDictionary) -> Void)?
    @objc public var onBridgeError: ((NSString) -> Void)?
    @objc public var onBridgeReady: ((NSString) -> Void)?

    typealias InitializationUpdateCompletion = @MainActor @Sendable (Any?, Error?) -> Void

    private weak var boundWebView: WKWebView?
    private weak var discoveryRoot: UIView?
    private var boundContentController: WKUserContentController?
    private var scriptHandler: WeakConnectBridgeScriptHandler?
    private var attachmentId: String?
    private var currentDocumentId: String?
    private var contextId = ""
    private var sourceGeneration = ""
    private var connectSource = ""
    private var initializationObjectJson = "{}"
    private var observeContentHeight = false
    private var pendingRequests: [String: PendingConnectBridgeRequest] = [:]
    private var appliedInitializationObjectJson: String?
    private var pendingInitializationUpdateBaselineJson: String?
    private var initializationUpdateGeneration = 0
    private var initializationUpdateInFlightId: UUID?
    private var initializationUpdateRetryRequested = false
    private var scanTimer: Timer?
    private var errorReported = false
    private var invalidated = false
    var loadSourceForTesting: ((WKWebView, URL) -> Void)?
    var evaluateInitializationUpdateForTesting: ((WKWebView, String, @escaping InitializationUpdateCompletion) -> Void)?

    @objc public func setDiscoveryRoot(_ root: UIView) {
        discoveryRoot = root
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        // Fabric mounts React children as siblings of contentView. The adapter
        // is an invisible overlay and must not intercept their touches.
        isUserInteractionEnabled = false
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        isUserInteractionEnabled = false
    }

    @objc(updateConfigurationWithContextId:sourceGeneration:connectSource:initializationObjectJson:observeContentHeight:)
    public func updateConfiguration(
        contextId: String,
        sourceGeneration: String = "",
        connectSource: String,
        initializationObjectJson: String,
        observeContentHeight: Bool
    ) {
        let contextChanged = self.contextId != contextId
        let sourceGenerationChanged = self.sourceGeneration != sourceGeneration
        let sourceChanged = self.connectSource != connectSource
        let initializationChanged = self.initializationObjectJson != initializationObjectJson
        let heightChanged = self.observeContentHeight != observeContentHeight

        self.contextId = contextId
        self.sourceGeneration = sourceGeneration
        self.connectSource = connectSource
        self.initializationObjectJson = initializationObjectJson
        self.observeContentHeight = observeContentHeight

        guard contextChanged || sourceGenerationChanged || sourceChanged || initializationChanged || heightChanged else { return }
        guard !contextChanged, !sourceGenerationChanged, !sourceChanged, !heightChanged else {
            clearPendingInitializationUpdate()
            let webView = boundWebView
            unbind(webView: webView)
            if let webView {
                webView.stopLoading()
                webView.loadHTMLString("", baseURL: nil)
            }
            if window != nil {
                refreshBinding()
            }
            return
        }

        if initializationChanged {
            updateCurrentDocumentInitialization()
        }
    }

    @objc public func reply(_ expectedAttachmentId: String, requestHandle: String, payload: String) {
        guard !invalidated,
              attachmentId == expectedAttachmentId,
              let pending = pendingRequests[requestHandle],
              pending.completion != nil,
              pending.claimed,
              pending.attachmentId == expectedAttachmentId,
              pending.contextId == contextId,
              pending.sourceGeneration == sourceGeneration,
              pending.documentId == currentDocumentId,
              let data = payload.data(using: .utf8),
              let value = try? JSONSerialization.jsonObject(with: data)
        else { return }

        removePendingRequest(pending)
        pending.completion?(value, nil)
    }

    @objc(claim:attachmentId:requestHandle:documentId:contextId:sourceGeneration:)
    public func claim(
        _ claimId: String,
        attachmentId expectedAttachmentId: String,
        requestHandle: String,
        documentId expectedDocumentId: String,
        contextId expectedContextId: String,
        sourceGeneration expectedSourceGeneration: String
    ) {
        let runClaim = { [weak self] in
            guard let self else { return }
            self.claimOnMainThread(
                claimId,
                attachmentId: expectedAttachmentId,
                requestHandle: requestHandle,
                documentId: expectedDocumentId,
                contextId: expectedContextId,
                sourceGeneration: expectedSourceGeneration
            )
        }
        if Thread.isMainThread {
            runClaim()
        } else {
            DispatchQueue.main.async(execute: runClaim)
        }
    }

    @objc(cancel:requestHandle:)
    public func cancel(_ expectedAttachmentId: String, requestHandle: String) {
        guard attachmentId == expectedAttachmentId,
              let pending = pendingRequests[requestHandle],
              pending.attachmentId == expectedAttachmentId
        else { return }
        cancelRequest(pending)
    }

    static func authorizeLaunchClaim(
        _ token: String,
        operation: String,
        url: String? = nil,
        clientSecret: String? = nil,
        connectedAccountId: String? = nil,
        completion: @escaping (Bool) -> Void
    ) {
        guard let claim = launchClaimRegistry.consume(token) else {
            DispatchQueue.main.async { completion(false) }
            return
        }
        let request = claim.request
        let matchesOperation: Bool
        switch operation {
        case "openAuthenticatedWebView":
            matchesOperation = request.messageType == operation && request.launchUrl == url
        case "openFinancialConnections":
            matchesOperation = request.messageType == operation &&
                request.clientSecret == clientSecret &&
                request.connectedAccountId == connectedAccountId
        default:
            matchesOperation = false
        }
        DispatchQueue.main.async {
            guard matchesOperation, let owner = claim.owner.value else {
                claim.owner.value?.cancelRequest(request)
                completion(false)
                return
            }
            owner.revalidateLaunchClaim(claim, completion: completion)
        }
    }

    private func claimOnMainThread(
        _ claimId: String,
        attachmentId expectedAttachmentId: String,
        requestHandle: String,
        documentId expectedDocumentId: String,
        contextId expectedContextId: String,
        sourceGeneration expectedSourceGeneration: String
    ) {
        let pending = pendingRequests[requestHandle]
        guard let webView = boundWebView,
              !invalidated,
              window != nil,
              pending != nil,
              let pending,
              pending.claimId == nil,
              pending.attachmentId == expectedAttachmentId,
              attachmentId == expectedAttachmentId,
              pending.documentId == expectedDocumentId,
              currentDocumentId == expectedDocumentId,
              pending.contextId == expectedContextId,
              contextId == expectedContextId,
              pending.sourceGeneration == expectedSourceGeneration,
              sourceGeneration == expectedSourceGeneration
        else {
            if let pending,
               pending.attachmentId == expectedAttachmentId,
               pending.documentId == expectedDocumentId,
               pending.contextId == expectedContextId,
               pending.sourceGeneration == expectedSourceGeneration {
                cancelRequest(pending)
            }
            emitClaimResult(
                claimId,
                attachmentId: expectedAttachmentId,
                requestHandle: requestHandle,
                sourceGeneration: expectedSourceGeneration,
                admitted: false,
                claimToken: nil
            )
            return
        }

        pending.claimId = claimId
        webView.evaluateJavaScript(Self.claimProbeScript(documentId: expectedDocumentId)) { [weak self, weak webView] result, _ in
            guard let self else { return }
            let stillCurrent =
                !self.invalidated && self.window != nil &&
                webView != nil && self.boundWebView === webView &&
                self.pendingRequests[requestHandle] === pending &&
                pending.claimId == claimId &&
                pending.attachmentId == expectedAttachmentId && self.attachmentId == expectedAttachmentId &&
                pending.documentId == expectedDocumentId && self.currentDocumentId == expectedDocumentId &&
                pending.contextId == expectedContextId && self.contextId == expectedContextId &&
                pending.sourceGeneration == expectedSourceGeneration && self.sourceGeneration == expectedSourceGeneration

            guard (result as? Bool) == true, stillCurrent else {
                self.cancelRequest(pending)
                self.emitClaimResult(
                    claimId,
                    attachmentId: expectedAttachmentId,
                    requestHandle: requestHandle,
                    sourceGeneration: expectedSourceGeneration,
                    admitted: false,
                    claimToken: nil
                )
                return
            }

            pending.claimed = true
            let needsLaunchClaim = ["openAuthenticatedWebView", "openFinancialConnections"].contains(pending.messageType)
            let claimToken = needsLaunchClaim ? Self.launchClaimRegistry.register(owner: self, request: pending) : nil
            if needsLaunchClaim && claimToken == nil {
                self.cancelRequest(pending)
                self.emitClaimResult(
                    claimId,
                    attachmentId: expectedAttachmentId,
                    requestHandle: requestHandle,
                    sourceGeneration: expectedSourceGeneration,
                    admitted: false,
                    claimToken: nil
                )
                return
            }
            pending.claimToken = claimToken
            if pending.completion == nil { self.removePendingRequest(pending) }
            self.emitClaimResult(
                claimId,
                attachmentId: expectedAttachmentId,
                requestHandle: requestHandle,
                sourceGeneration: expectedSourceGeneration,
                admitted: true,
                claimToken: claimToken
            )
        }
    }

    private func revalidateLaunchClaim(_ claim: ConnectBridgeLaunchClaim, completion: @escaping (Bool) -> Void) {
        let pending = claim.request
        guard claim.owner.value === self,
              !invalidated,
              window != nil,
              let webView = boundWebView,
              pendingRequests[pending.requestHandle] === pending,
              pending.claimed,
              pending.claimToken == claim.token,
              attachmentId == pending.attachmentId,
              currentDocumentId == pending.documentId,
              contextId == pending.contextId,
              sourceGeneration == pending.sourceGeneration
        else {
            cancelRequest(pending)
            completion(false)
            return
        }

        webView.evaluateJavaScript(Self.claimProbeScript(documentId: pending.documentId)) { [weak self, weak webView] result, _ in
            guard let self else {
                completion(false)
                return
            }
            let stillCurrent =
                !self.invalidated && self.window != nil && webView != nil && self.boundWebView === webView &&
                self.pendingRequests[pending.requestHandle] === pending && pending.claimed &&
                pending.claimToken == claim.token && self.attachmentId == pending.attachmentId &&
                self.currentDocumentId == pending.documentId && self.contextId == pending.contextId &&
                self.sourceGeneration == pending.sourceGeneration
            guard (result as? Bool) == true, stillCurrent else {
                self.cancelRequest(pending)
                completion(false)
                return
            }

            pending.claimToken = nil
            completion(true)
        }
    }

    private func emitClaimResult(
        _ claimId: String,
        attachmentId: String,
        requestHandle: String,
        sourceGeneration: String,
        admitted: Bool,
        claimToken: String?
    ) {
        var event: [String: Any] = [
            "claimId": claimId,
            "attachmentId": attachmentId,
            "requestHandle": requestHandle,
            "sourceGeneration": sourceGeneration,
            "admitted": admitted,
        ]
        if let claimToken { event["claimToken"] = claimToken }
        onBridgeClaimResult?(event as NSDictionary)
    }

    private static func claimProbeScript(documentId: String) -> String {
        let expectedDocumentId = quote(documentId)
        return """
        (function() {
          return window.location.origin === 'https://connect-js.stripe.com' &&
            window.__stripeConnectDocument &&
            window.__stripeConnectDocument.id === \(expectedDocumentId);
        })();
        """
    }

    private func removePendingRequest(_ pending: PendingConnectBridgeRequest) {
        guard pendingRequests[pending.requestHandle] === pending else { return }
        pendingRequests.removeValue(forKey: pending.requestHandle)
        Self.launchClaimRegistry.remove(pending.claimToken)
        pending.claimToken = nil
    }

    private func cancelRequest(_ pending: PendingConnectBridgeRequest) {
        guard pendingRequests[pending.requestHandle] === pending else { return }
        removePendingRequest(pending)
        guard let completion = pending.completion else { return }
        let action: String
        let data: Any
        switch pending.messageType {
        case "openAuthenticatedWebView":
            action = "authenticatedWebView"
            data = ["id": pending.requestId ?? "", "url": NSNull()] as [String: Any]
        case "openFinancialConnections":
            action = "financialConnections"
            data = [
                "id": pending.requestId ?? "",
                "financialConnectionsSession": NSNull(),
                "token": NSNull(),
                "error": ["code": "Canceled", "message": "The flow has been canceled."],
            ] as [String: Any]
        default:
            action = "clientSecret"
            data = NSNull()
        }
        completion(["type": "connectBridgeReply", "action": action, "data": data], nil)
    }

    private func cancelPendingRequests() {
        let requests = Array(pendingRequests.values)
        requests.forEach(cancelRequest)
        Self.launchClaimRegistry.removeAll(for: self)
    }

    @objc public func dispose() {
        guard !invalidated else { return }
        invalidated = true
        scanTimer?.invalidate()
        scanTimer = nil
        unbind(webView: boundWebView)
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        scanTimer?.invalidate()
        scanTimer = nil
        guard window != nil else {
            unbind(webView: boundWebView)
            return
        }
        refreshBinding()
        let timer = Timer(timeInterval: 0.2, repeats: true) { [weak self] _ in
            self?.refreshBinding()
        }
        scanTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        refreshBinding()
    }

    deinit {
        scanTimer?.invalidate()
        unbind(webView: boundWebView)
    }

    private func refreshBinding() {
        guard !invalidated, window != nil else { return }
        let root = discoveryRoot ?? self
        let webViews = Self.descendantWebViews(of: root)
        if let boundWebView, webViews.count == 1, webViews.first === boundWebView { return }

        unbind(webView: boundWebView)
        guard webViews.count == 1, let webView = webViews.first else {
            if webViews.count > 1 { reportError("multiple_web_views") }
            return
        }
        guard #available(iOS 14.0, *) else {
            reportError("unsupported_web_view")
            return
        }

        let bootstrap = Self.bootstrapScript(
            initializationObjectJson: initializationObjectJson,
            observeContentHeight: observeContentHeight
        )
        guard Self.installBootstrap(bootstrap, in: root) else {
            reportError("unsupported_web_view")
            return
        }

        let newAttachmentId = UUID().uuidString
        let bindingContextId = contextId
        let bindingSourceGeneration = sourceGeneration
        let contentController = webView.configuration.userContentController
        let handler = WeakConnectBridgeScriptHandler(
            owner: self,
            attachmentId: newAttachmentId,
            contextId: bindingContextId,
            sourceGeneration: bindingSourceGeneration
        )
        contentController.addScriptMessageHandler(handler, contentWorld: .page, name: Self.messageHandlerName)
        boundWebView = webView
        boundContentController = contentController
        scriptHandler = handler
        attachmentId = newAttachmentId
        currentDocumentId = nil
        appliedInitializationObjectJson = initializationObjectJson
        errorReported = false

        guard !connectSource.isEmpty else {
            onBridgeReady?(attachmentId! as NSString)
            return
        }
        guard Self.isTrustedSource(connectSource), let sourceURL = URL(string: connectSource) else {
            reportError("invalid_connect_source")
            unbind(webView: webView)
            return
        }

        onBridgeReady?(attachmentId! as NSString)
        if let loadSourceForTesting {
            loadSourceForTesting(webView, sourceURL)
        } else {
            webView.load(URLRequest(url: sourceURL))
        }
    }

    fileprivate func receive(
        _ message: WKScriptMessage,
        expectedAttachmentId: String,
        expectedContextId: String,
        expectedSourceGeneration: String,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard !invalidated,
              window != nil,
              attachmentId == expectedAttachmentId,
              contextId == expectedContextId,
              sourceGeneration == expectedSourceGeneration,
              let webView = boundWebView,
              message.webView === webView,
              message.frameInfo.isMainFrame,
              Self.isTrustedOrigin(message.frameInfo.securityOrigin),
              let body = message.body as? [String: Any],
              let documentId = body["documentId"] as? String,
              Self.isDocumentId(documentId),
              let rawMessage = body["rawMessage"] as? String,
              !rawMessage.isEmpty,
              let attachmentId
        else {
            replyHandler(["type": "ack"], nil)
            return
        }

        if currentDocumentId != documentId {
            cancelPendingRequests()
            currentDocumentId = documentId
            initializationUpdateInFlightId = nil
            initializationUpdateRetryRequested = false
        }

        guard let rawData = rawMessage.data(using: .utf8),
              let envelope = try? JSONSerialization.jsonObject(with: rawData) as? [String: Any],
              let type = envelope["type"] as? String
        else {
            replyHandler(["type": "ack"], nil)
            return
        }

        if type == "nativeDocumentStart" {
            let documentInitializationJson = (envelope["data"] as? [String: Any])?["initializationObjectJson"] as? String
            appliedInitializationObjectJson = documentInitializationJson ?? initializationObjectJson
            if let documentInitializationJson, documentInitializationJson == initializationObjectJson {
                clearPendingInitializationUpdate()
            } else {
                if pendingInitializationUpdateBaselineJson == nil {
                    pendingInitializationUpdateBaselineJson = documentInitializationJson ?? appliedInitializationObjectJson
                } else {
                    pendingInitializationUpdateBaselineJson = documentInitializationJson
                }
                initializationUpdateGeneration += 1
            }
            replyHandler(["type": "ack"], nil)
            retryPendingInitializationUpdate()
            return
        }

        retryPendingInitializationUpdate()

        let requestHandle = UUID().uuidString
        let asynchronous = ["fetchClientSecret", "openAuthenticatedWebView", "openFinancialConnections"].contains(type)
        if pendingRequests.count >= Self.maximumPendingRequests,
           let oldest = pendingRequests.values.first {
            cancelRequest(oldest)
        }
        let data = envelope["data"] as? [String: Any]
        let pending = PendingConnectBridgeRequest(
            attachmentId: attachmentId,
            contextId: expectedContextId,
            sourceGeneration: expectedSourceGeneration,
            documentId: documentId,
            requestHandle: requestHandle,
            messageType: type,
            requestId: data?["id"] as? String,
            launchUrl: data?["url"] as? String,
            clientSecret: data?["clientSecret"] as? String,
            connectedAccountId: data?["connectedAccountId"] as? String ?? "",
            completion: asynchronous ? replyHandler : nil
        )
        pendingRequests[requestHandle] = pending
        let requestEvent: NSDictionary = [
            "attachmentId": attachmentId,
            "requestHandle": requestHandle,
            "documentId": documentId,
            "contextId": contextId,
            "sourceGeneration": expectedSourceGeneration,
            "rawMessage": rawMessage,
        ]
        if let onBridgeRequest {
            onBridgeRequest(requestEvent)
        } else {
            cancelRequest(pending)
        }
        if !asynchronous { replyHandler(["type": "ack"], nil) }
    }

    private func updateCurrentDocumentInitialization() {
        guard boundWebView != nil, attachmentId != nil else { return }
        let bootstrap = Self.bootstrapScript(
            initializationObjectJson: initializationObjectJson,
            observeContentHeight: observeContentHeight
        )
        guard Self.installBootstrap(bootstrap, in: discoveryRoot ?? self) else {
            reportError("unsupported_web_view")
            return
        }
        if pendingInitializationUpdateBaselineJson == nil {
            pendingInitializationUpdateBaselineJson = appliedInitializationObjectJson
        }
        initializationUpdateGeneration += 1
        retryPendingInitializationUpdate()
    }

    private func retryPendingInitializationUpdate() {
        if initializationUpdateInFlightId != nil {
            if pendingInitializationUpdateBaselineJson != nil {
                initializationUpdateRetryRequested = true
            }
            return
        }
        guard let webView = boundWebView,
              let expectedAttachmentId = attachmentId,
              let documentId = currentDocumentId,
              let baselineJson = pendingInitializationUpdateBaselineJson
        else { return }

        let targetJson = initializationObjectJson
        let changes = Self.changedInitializationGroups(from: baselineJson, to: targetJson)
        guard changes.updateInstance || changes.updateComponentProps else {
            appliedInitializationObjectJson = targetJson
            pendingInitializationUpdateBaselineJson = nil
            return
        }
        guard let script = Self.initializationUpdateScript(
            documentId: documentId,
            initializationObjectJson: targetJson,
            updateInstance: changes.updateInstance,
            updateComponentProps: changes.updateComponentProps
        ) else { return }

        // The Objective-C WebKit API evaluates in the page world. Avoid the
        // content-world Swift overlay here because it adds a libswiftWebKit
        // runtime dependency unavailable on supported older iOS versions.
        let updateId = UUID()
        let generation = initializationUpdateGeneration
        initializationUpdateInFlightId = updateId
        let completion: InitializationUpdateCompletion = { [weak self, weak webView] result, _ in
            guard let self,
                  let webView,
                  self.initializationUpdateInFlightId == updateId
            else { return }
            self.initializationUpdateInFlightId = nil
            guard self.boundWebView === webView,
                  self.attachmentId == expectedAttachmentId,
                  self.currentDocumentId == documentId
            else { return }

            let shouldRetry =
                self.initializationUpdateRetryRequested ||
                generation != self.initializationUpdateGeneration
            self.initializationUpdateRetryRequested = false
            if (result as? Bool) == true {
                self.appliedInitializationObjectJson = targetJson
                if shouldRetry {
                    self.pendingInitializationUpdateBaselineJson = targetJson
                    self.retryPendingInitializationUpdate()
                } else {
                    self.pendingInitializationUpdateBaselineJson = nil
                }
            } else if shouldRetry {
                self.retryPendingInitializationUpdate()
            }
        }
        if let evaluateInitializationUpdateForTesting {
            evaluateInitializationUpdateForTesting(webView, script, completion)
        } else {
            webView.evaluateJavaScript(script, completionHandler: completion)
        }
    }

    private func clearPendingInitializationUpdate() {
        pendingInitializationUpdateBaselineJson = nil
        initializationUpdateInFlightId = nil
        initializationUpdateRetryRequested = false
        initializationUpdateGeneration += 1
    }

    private static func changedInitializationGroups(from previousJson: String, to nextJson: String) -> (updateInstance: Bool, updateComponentProps: Bool) {
        guard let previous = try? JSONSerialization.jsonObject(with: Data(previousJson.utf8)) as? [String: Any],
              let next = try? JSONSerialization.jsonObject(with: Data(nextJson.utf8)) as? [String: Any]
        else { return (true, true) }

        let previousParams = previous["initParams"] as? [String: Any] ?? [:]
        let nextParams = next["initParams"] as? [String: Any] ?? [:]
        let previousComponentProps = previous["initComponentProps"] as? [String: Any] ?? [:]
        let nextComponentProps = next["initComponentProps"] as? [String: Any] ?? [:]
        let updateInstance = !NSDictionary(dictionary: previousParams.filter { ["appearance", "locale"].contains($0.key) }).isEqual(to: nextParams.filter { ["appearance", "locale"].contains($0.key) })
        let updateComponentProps = !NSDictionary(dictionary: previousComponentProps).isEqual(to: nextComponentProps)
        return (updateInstance, updateComponentProps)
    }

    static func initializationUpdateScript(
        documentId: String,
        initializationObjectJson: String,
        updateInstance: Bool = true,
        updateComponentProps: Bool = true
    ) -> String? {
        guard let json = javaScriptString(initializationObjectJson) else { return nil }
        let script = """
        (function() {
          'use strict';
          if (window.location.origin !== 'https://connect-js.stripe.com') return false;
          var record = window.__stripeConnectDocument;
          if (!record || record.id !== \(Self.quote(documentId))) return false;
          var beginUpdate = window.__stripeConnectBeginInitializationUpdate;
          if (typeof beginUpdate !== 'function') return false;
          var applyUpdate = beginUpdate(record.id);
          if (typeof applyUpdate !== 'function') return false;
          return applyUpdate(\(json), \(updateInstance ? "true" : "false"), \(updateComponentProps ? "true" : "false"));
        })();
        """
        return script
    }

    private func unbind(webView: WKWebView?) {
        guard let webView, boundWebView === webView else { return }
        cancelPendingRequests()
        clearPendingInitializationUpdate()
        if #available(iOS 14.0, *), let boundContentController {
            boundContentController.removeScriptMessageHandler(forName: Self.messageHandlerName, contentWorld: .page)
        }
        boundWebView = nil
        boundContentController = nil
        scriptHandler = nil
        attachmentId = nil
        currentDocumentId = nil
        onBridgeReady?("" as NSString)
    }

    private func reportError(_ error: String) {
        guard !errorReported else { return }
        errorReported = true
        onBridgeError?(error as NSString)
    }

    private static func descendantWebViews(of view: UIView) -> [WKWebView] {
        view.subviews.flatMap { child in
            (child as? WKWebView).map { [$0] } ?? descendantWebViews(of: child)
        }
    }

    private static func installBootstrap(_ script: String, in root: UIView) -> Bool {
        let scriptSelector = NSSelectorFromString("setInjectedJavaScriptBeforeContentLoaded:")
        let mainFrameSelector = NSSelectorFromString("setInjectedJavaScriptBeforeContentLoadedForMainFrameOnly:")
        guard let rncView = descendants(of: root).first(where: { $0.responds(to: scriptSelector) }) else {
            return false
        }
        rncView.perform(scriptSelector, with: script)
        if rncView.responds(to: mainFrameSelector) {
            guard let method = class_getInstanceMethod(type(of: rncView), mainFrameSelector) else {
                return false
            }
            typealias SetMainFrameOnly = @convention(c) (AnyObject, Selector, Bool) -> Void
            let implementation = method_getImplementation(method)
            unsafeBitCast(implementation, to: SetMainFrameOnly.self)(rncView, mainFrameSelector, true)
        }
        return true
    }

    private static func descendants(of view: UIView) -> [UIView] {
        [view] + view.subviews.flatMap(descendants)
    }

    static func bootstrapScript(initializationObjectJson: String, observeContentHeight: Bool) -> String {
        let initialization = quote(initializationObjectJson)
        let observesHeight = observeContentHeight ? "true" : "false"
        return """
        (function() {
          'use strict';
          var origin = 'https://connect-js.stripe.com';
          if (window.top !== window || window.location.origin !== origin) return;
          var randomBytes = new Uint8Array(16);
          window.crypto.getRandomValues(randomBytes);
          var documentId = Array.prototype.map.call(randomBytes, function(byte) { return byte.toString(16).padStart(2, '0'); }).join('');
          var record = Object.freeze({ id: documentId });
          var defineProperty = Object.defineProperty;
          var jsonParse = JSON.parse;
          var objectKeys = Object.keys;
          var initializationJson = \(initialization);
          var webView = window.ReactNativeWebView || (window.ReactNativeWebView = {});
          defineProperty(window, '__stripeConnectDocument', { value: record, configurable: false, writable: false });
          defineProperty(webView, 'injectedObjectJson', { value: function() { return initializationJson; }, configurable: false, writable: false });
          defineProperty(window, '__stripeConnectBeginInitializationUpdate', {
            value: function(expectedDocumentId) {
              if (window.location.origin !== origin || window.__stripeConnectDocument !== record || record.id !== expectedDocumentId) return null;
              return function(serialized, updateInstance, updateComponentProps) {
                if (window.location.origin !== origin || window.__stripeConnectDocument !== record || record.id !== expectedDocumentId) return false;
                var initialization = jsonParse(serialized);
                if (updateInstance && typeof window.updateConnectInstance !== 'function') return false;
                if (updateComponentProps && typeof window.callSetterWithSerializableValue !== 'function') return false;
                initializationJson = serialized;
                if (updateInstance) {
                  var params = initialization.initParams || {};
                  window.updateConnectInstance({ appearance: params.appearance, locale: params.locale });
                }
                if (updateComponentProps) {
                  var props = initialization.initComponentProps || {};
                  objectKeys(props).forEach(function(key) {
                    window.callSetterWithSerializableValue({ setter: key, value: props[key] });
                  });
                }
                return true;
              };
            },
            configurable: false,
            writable: false
          });
          defineProperty(webView, 'postMessage', {
            value: function(rawMessage) {
              return window.webkit.messageHandlers.StripeConnectBridge.postMessage({ documentId: documentId, rawMessage: String(rawMessage) }).then(function(reply) {
                if (!reply || reply.type !== 'connectBridgeReply') return;
                if (reply.action === 'clientSecret' && window.clientSecretDeferred) window.clientSecretDeferred.resolve(reply.data);
                else if (reply.action === 'authenticatedWebView' && typeof window.returnedFromAuthenticatedWebView === 'function') window.returnedFromAuthenticatedWebView(reply.data);
                else if (reply.action === 'financialConnections' && typeof window.callSetterWithSerializableValue === 'function') window.callSetterWithSerializableValue({ setter: 'setCollectMobileFinancialConnectionsResult', value: reply.data });
              });
            },
            configurable: false,
            writable: false
          });
          webView.postMessage(JSON.stringify({ type: 'nativeDocumentStart', data: { initializationObjectJson: initializationJson } }));
          var installHeightObserver = function() {
            if (!\(observesHeight) || window.__stripeConnectHeightObserver || !document.body || !window.ResizeObserver) return;
            window.__stripeConnectHeightObserver = true;
            var previousHeight = -1;
            var reportHeight = function() {
              var height = document.body.getBoundingClientRect().height;
              if (Math.abs(height - previousHeight) < 0.5) return;
              previousHeight = height;
              webView.postMessage(JSON.stringify({ type: 'contentHeightChanged', data: { height: height } }));
            };
            new ResizeObserver(reportHeight).observe(document.body);
            reportHeight();
          };
          if (document.body) installHeightObserver();
          else document.addEventListener('DOMContentLoaded', installHeightObserver, { once: true });
        })();
        """
    }

    private static func isTrustedOrigin(_ origin: WKSecurityOrigin) -> Bool {
        origin.`protocol`.lowercased() == "https" &&
            origin.host.lowercased() == "connect-js.stripe.com" &&
            (origin.port == 0 || origin.port == 443)
    }

    private static func isTrustedSource(_ source: String) -> Bool {
        guard let components = URLComponents(string: source) else { return false }
        return components.scheme?.lowercased() == "https" &&
            components.host?.lowercased() == "connect-js.stripe.com" &&
            components.user == nil && components.password == nil &&
            (components.port == nil || components.port == 443)
    }

    private static func isDocumentId(_ value: String) -> Bool {
        value.count == 32 && value.unicodeScalars.allSatisfy {
            CharacterSet(charactersIn: "0123456789abcdef").contains($0)
        }
    }

    private static func javaScriptString(_ value: String) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: [value]),
              let serialized = String(data: data, encoding: .utf8),
              serialized.count >= 2
        else { return nil }
        return String(serialized.dropFirst().dropLast())
    }

    private static func quote(_ value: String) -> String {
        let data = try! JSONSerialization.data(withJSONObject: [value])
        let serialized = String(data: data, encoding: .utf8)!
        return String(serialized.dropFirst().dropLast())
    }

    private static let messageHandlerName = "StripeConnectBridge"
}
