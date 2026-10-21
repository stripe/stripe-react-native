import Foundation
import UIKit
import WebKit

private final class WeakConnectBridgeScriptHandler: NSObject, WKScriptMessageHandlerWithReply {
    weak var owner: ConnectBridgeContainerView?
    private let attachmentId: String
    private let contextId: String

    init(owner: ConnectBridgeContainerView, attachmentId: String, contextId: String) {
        self.owner = owner
        self.attachmentId = attachmentId
        self.contextId = contextId
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
            replyHandler: replyHandler
        )
            ?? replyHandler(["type": "ack"], nil)
    }
}

@objc(ConnectBridgeContainerView)
public final class ConnectBridgeContainerView: UIView {
    @objc public var onBridgeRequest: ((NSDictionary) -> Void)?
    @objc public var onBridgeError: ((NSString) -> Void)?
    @objc public var onBridgeReady: ((NSString) -> Void)?

    private struct PendingReply {
        let attachmentId: String
        let contextId: String
        let documentId: String
        let completion: (Any?, String?) -> Void
    }

    private weak var boundWebView: WKWebView?
    private weak var discoveryRoot: UIView?
    private var boundContentController: WKUserContentController?
    private var scriptHandler: WeakConnectBridgeScriptHandler?
    private var attachmentId: String?
    private var currentDocumentId: String?
    private var contextId = ""
    private var connectSource = ""
    private var initializationObjectJson = "{}"
    private var observeContentHeight = false
    private var pendingReplies: [String: PendingReply] = [:]
    private var scanTimer: Timer?
    private var errorReported = false
    private var invalidated = false
    var loadSourceForTesting: ((WKWebView, URL) -> Void)?

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

    @objc(updateConfigurationWithContextId:connectSource:initializationObjectJson:observeContentHeight:)
    public func updateConfiguration(
        contextId: String,
        connectSource: String,
        initializationObjectJson: String,
        observeContentHeight: Bool
    ) {
        let contextChanged = self.contextId != contextId
        let sourceChanged = self.connectSource != connectSource
        let initializationChanged = self.initializationObjectJson != initializationObjectJson
        let heightChanged = self.observeContentHeight != observeContentHeight

        self.contextId = contextId
        self.connectSource = connectSource
        self.initializationObjectJson = initializationObjectJson
        self.observeContentHeight = observeContentHeight

        guard contextChanged || sourceChanged || initializationChanged || heightChanged else { return }
        guard !contextChanged, !sourceChanged, !heightChanged else {
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
              let pending = pendingReplies.removeValue(forKey: requestHandle),
              pending.attachmentId == expectedAttachmentId,
              pending.contextId == contextId,
              pending.documentId == currentDocumentId,
              let data = payload.data(using: .utf8),
              let value = try? JSONSerialization.jsonObject(with: data)
        else { return }

        pending.completion(value, nil)
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
        let contentController = webView.configuration.userContentController
        let handler = WeakConnectBridgeScriptHandler(
            owner: self,
            attachmentId: newAttachmentId,
            contextId: bindingContextId
        )
        contentController.addScriptMessageHandler(handler, contentWorld: .page, name: Self.messageHandlerName)
        boundWebView = webView
        boundContentController = contentController
        scriptHandler = handler
        attachmentId = newAttachmentId
        currentDocumentId = nil
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
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard !invalidated,
              window != nil,
              attachmentId == expectedAttachmentId,
              contextId == expectedContextId,
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
            cancelPendingReplies()
            currentDocumentId = documentId
        }

        guard let rawData = rawMessage.data(using: .utf8),
              let envelope = try? JSONSerialization.jsonObject(with: rawData) as? [String: Any],
              let type = envelope["type"] as? String
        else {
            replyHandler(["type": "ack"], nil)
            return
        }

        if type == "nativeDocumentStart" {
            replyHandler(["type": "ack"], nil)
            return
        }

        let requestHandle = UUID().uuidString
        let asynchronous = ["fetchClientSecret", "openAuthenticatedWebView", "openFinancialConnections"].contains(type)
        if asynchronous {
            pendingReplies[requestHandle] = PendingReply(
                attachmentId: attachmentId,
                contextId: contextId,
                documentId: documentId,
                completion: replyHandler
            )
        }
        onBridgeRequest?([
            "attachmentId": attachmentId,
            "requestHandle": requestHandle,
            "documentId": documentId,
            "contextId": contextId,
            "rawMessage": rawMessage,
        ])
        if !asynchronous { replyHandler(["type": "ack"], nil) }
    }

    private func updateCurrentDocumentInitialization() {
        guard let webView = boundWebView, let documentId = currentDocumentId else { return }
        let bootstrap = Self.bootstrapScript(
            initializationObjectJson: initializationObjectJson,
            observeContentHeight: observeContentHeight
        )
        guard Self.installBootstrap(bootstrap, in: discoveryRoot ?? self) else {
            reportError("unsupported_web_view")
            return
        }
        guard let script = Self.initializationUpdateScript(
                documentId: documentId,
                initializationObjectJson: initializationObjectJson
              )
        else { return }

        // The Objective-C WebKit API evaluates in the page world. Avoid the
        // content-world Swift overlay here because it adds a libswiftWebKit
        // runtime dependency unavailable on supported older iOS versions.
        webView.evaluateJavaScript(script, completionHandler: { _, _ in })
    }

    static func initializationUpdateScript(documentId: String, initializationObjectJson: String) -> String? {
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
          return applyUpdate(\(json));
        })();
        """
        return script
    }

    private func unbind(webView: WKWebView?) {
        guard let webView, boundWebView === webView else { return }
        cancelPendingReplies()
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

    private func cancelPendingReplies() {
        let replies = pendingReplies.values
        pendingReplies.removeAll()
        replies.forEach { $0.completion(["type": "cancelled"], nil) }
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
              return function(serialized) {
                if (window.location.origin !== origin || window.__stripeConnectDocument !== record || record.id !== expectedDocumentId) return false;
                var initialization = jsonParse(serialized);
                initializationJson = serialized;
                if (typeof window.updateConnectInstance === 'function') {
                  var params = initialization.initParams || {};
                  window.updateConnectInstance({ appearance: params.appearance, locale: params.locale });
                }
                if (typeof window.callSetterWithSerializableValue === 'function') {
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
          webView.postMessage(JSON.stringify({ type: 'nativeDocumentStart' }));
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
