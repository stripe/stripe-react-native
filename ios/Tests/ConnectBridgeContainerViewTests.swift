import Foundation
import ObjectiveC.runtime
@testable import stripe_react_native
import UIKit
import WebKit
import XCTest

@MainActor
final class ConnectBridgeContainerViewTests: XCTestCase {
    func test_rncWebViewUsesNativeRequestReplyWithInitializationObject() async throws {
        guard #available(iOS 14.0, *) else { throw XCTSkip("WKScriptMessageHandlerWithReply requires iOS 14") }

        let hostClass = try XCTUnwrap(NSClassFromString("ConnectBridgeContainerComponentView") as? UIView.Type)
        let host = hostClass.init(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let container = try XCTUnwrap(host.value(forKey: "contentView") as? ConnectBridgeContainerView)
        let initializationJson = #"{"initParams":{"locale":"en"}}"#
        let updatedInitializationJson = #"{"initParams":{"locale":"fr"},"initComponentProps":{"fixtureMarker":"updated"}}"#

        let rncComponentClass = try XCTUnwrap(NSClassFromString("RNCWebView") as? UIView.Type)
        let rncComponent = rncComponentClass.init(frame: host.bounds)
        let rncImplementationView = try XCTUnwrap(findView(named: "RNCWebViewImpl", in: rncComponent))
        rncImplementationView.setValue(false, forKey: "messagingEnabled")
        // This fixture has no Fabric event emitter to answer RNC's navigation
        // decisions. Keep its WKNavigationDelegate intact and bypass only the
        // event callback that would otherwise wait forever for a JS response.
        rncImplementationView.setValue(nil, forKey: "onShouldStartLoadWithRequest")
        mount(rncComponent, in: host, at: 0)

        let fixtureHTML = """
        <!doctype html><html><head><title>ConnectBridgeFixture</title><script>
          window.clientSecretDeferred = { resolve: function(value) { document.body.dataset.result = value; } };
          window.updateConnectInstance = function(value) { window.__connectInstanceUpdate = value; };
          window.callSetterWithSerializableValue = function(value) { window.__componentPropUpdate = value; };
        </script></head><body><div id="resize-target" style="height:10px"></div><script>
          window.setTimeout(function() { document.getElementById('resize-target').style.height = '96px'; }, 100);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fetchClientSecret' }));
        </script></body></html>
        """
        container.loadSourceForTesting = { webView, sourceURL in
            XCTAssertEqual(sourceURL.host, "connect-js.stripe.com")
            webView.loadHTMLString(fixtureHTML, baseURL: sourceURL)
        }
        container.updateConfiguration(
            contextId: "context-test",
            connectSource: "https://connect-js.stripe.com/test-fixture",
            initializationObjectJson: initializationJson,
            observeContentHeight: true
        )

        let bridgeReady = expectation(description: "native handler is installed before fixture load")
        let firstRequestReceived = expectation(description: "first RNC document request reaches the adapter")
        let secondRequestReceived = expectation(description: "replacement RNC document request reaches the adapter")
        let initialHeightReceived = expectation(description: "initial document height reaches the adapter")
        let changedHeightReceived = expectation(description: "updated document height reaches the adapter")
        var firstRequest: [String: Any]?
        var requestCount = 0
        var reportedHeights: [Double] = []
        var changedHeightFulfilled = false
        container.onBridgeReady = { value in
            if value.length > 0 { bridgeReady.fulfill() }
        }
        container.onBridgeRequest = { event in
            XCTAssertEqual(event["contextId"] as? String, "context-test")
            guard let rawMessage = event["rawMessage"] as? String,
                  let data = rawMessage.data(using: .utf8),
                  let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = message["type"] as? String
            else {
                XCTFail("Native bridge request was not valid JSON")
                return
            }
            if type == "contentHeightChanged" {
                guard let payload = message["data"] as? [String: Any],
                      let height = payload["height"] as? Double
                else {
                    XCTFail("Height observer payload was invalid")
                    return
                }
                reportedHeights.append(height)
                if reportedHeights.count == 1 { initialHeightReceived.fulfill() }
                if !changedHeightFulfilled,
                   reportedHeights.count >= 2,
                   reportedHeights[reportedHeights.count - 1] != reportedHeights[reportedHeights.count - 2] {
                    changedHeightFulfilled = true
                    changedHeightReceived.fulfill()
                }
                return
            }
            XCTAssertEqual(type, "fetchClientSecret")
            requestCount += 1
            if requestCount == 1 {
                firstRequest = event as? [String: Any]
                firstRequestReceived.fulfill()
                return
            }

            guard let firstRequest else {
                XCTFail("Replacement request arrived before the first request was captured")
                return
            }
            container.reply(
                firstRequest["attachmentId"] as! String,
                requestHandle: firstRequest["requestHandle"] as! String,
                payload: #"{"type":"connectBridgeReply","action":"clientSecret","data":"stale"}"#
            )
            container.reply(
                event["attachmentId"] as! String,
                requestHandle: "unknown-request-handle",
                payload: #"{"type":"connectBridgeReply","action":"clientSecret","data":"unknown"}"#
            )
            container.reply(
                event["attachmentId"] as! String,
                requestHandle: event["requestHandle"] as! String,
                payload: #"{"type":"connectBridgeReply","action":"clientSecret","data":"fresh"}"#
            )
            container.reply(
                event["attachmentId"] as! String,
                requestHandle: event["requestHandle"] as! String,
                payload: #"{"type":"connectBridgeReply","action":"clientSecret","data":"duplicate"}"#
            )
            secondRequestReceived.fulfill()
        }

        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let root = UIViewController()
        window.rootViewController = root
        root.view.addSubview(host)
        window.makeKeyAndVisible()
        root.view.layoutIfNeeded()
        host.layoutIfNeeded()
        defer {
            container.dispose()
            window.isHidden = true
        }

        let hitView = try XCTUnwrap(host.hitTest(CGPoint(x: 24, y: 24), with: nil))
        XCTAssertTrue(
            hitView === rncComponent || hitView.isDescendant(of: rncComponent),
            "Fabric host must pass touches through its invisible content view to the mounted RNCWebView"
        )

        await fulfillment(of: [bridgeReady], timeout: 3)

        let webView = try XCTUnwrap(findView(of: WKWebView.self, in: host))
        try await waitForJavaScriptValue("document.title", in: webView) {
            $0 as? String == "ConnectBridgeFixture"
        }
        XCTAssertEqual(webView.url?.host, "connect-js.stripe.com")
        let documentId = try await evaluateJavaScript("window.__stripeConnectDocument.id", in: webView) as? String
        XCTAssertFalse(try XCTUnwrap(documentId).isEmpty)
        let injectedObjectJson = try await evaluateJavaScript("window.ReactNativeWebView.injectedObjectJson()", in: webView) as? String
        XCTAssertEqual(injectedObjectJson, initializationJson)

        await fulfillment(of: [firstRequestReceived], timeout: 3)
        await fulfillment(of: [initialHeightReceived, changedHeightReceived], timeout: 3)
        XCTAssertGreaterThan(Set(reportedHeights).count, 1)
        let firstDocumentId = try await evaluateJavaScript("window.__stripeConnectDocument.id", in: webView) as? String

        container.updateConfiguration(
            contextId: "context-test",
            connectSource: "https://connect-js.stripe.com/test-fixture",
            initializationObjectJson: updatedInitializationJson,
            observeContentHeight: true
        )
        try await waitForJavaScriptValue("window.ReactNativeWebView.injectedObjectJson()", in: webView) {
            $0 as? String == updatedInitializationJson
        }
        let documentAfterConfigurationUpdate = try await evaluateJavaScript("window.__stripeConnectDocument.id", in: webView) as? String
        XCTAssertEqual(documentAfterConfigurationUpdate, firstDocumentId)
        let updatedLocale = try await evaluateJavaScript("window.__connectInstanceUpdate.locale", in: webView) as? String
        XCTAssertEqual(updatedLocale, "fr")
        let updatedComponentProp = try await evaluateJavaScript("window.__componentPropUpdate.value", in: webView) as? String
        XCTAssertEqual(updatedComponentProp, "updated")

        let sourceURL = URL(string: "https://connect-js.stripe.com/test-fixture")!
        webView.loadHTMLString(fixtureHTML, baseURL: sourceURL)
        await fulfillment(of: [secondRequestReceived], timeout: 3)
        let replacementDocumentId = try await evaluateJavaScript("window.__stripeConnectDocument.id", in: webView) as? String
        XCTAssertNotEqual(firstDocumentId, replacementDocumentId)
        XCTAssertEqual(webView.url?.absoluteString, sourceURL.absoluteString)
        let replacementInitializationJson = try await evaluateJavaScript("window.ReactNativeWebView.injectedObjectJson()", in: webView) as? String
        XCTAssertEqual(replacementInitializationJson, updatedInitializationJson)
        try await waitForJavaScriptValue("document.body.dataset.result", in: webView) {
            $0 as? String == "fresh"
        }
        let result = try await evaluateJavaScript("document.body.dataset.result", in: webView) as? String
        XCTAssertEqual(result, "fresh")
        XCTAssertEqual(rncImplementationView.value(forKey: "messagingEnabled") as? Bool, false)
    }

    func test_onlyTrustedMainFrameOriginsCanSendBridgeMessages() async throws {
        guard #available(iOS 14.0, *) else { throw XCTSkip("WKScriptMessageHandlerWithReply requires iOS 14") }

        let hostClass = try XCTUnwrap(NSClassFromString("ConnectBridgeContainerComponentView") as? UIView.Type)
        let host = hostClass.init(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let container = try XCTUnwrap(host.value(forKey: "contentView") as? ConnectBridgeContainerView)
        let rncComponentClass = try XCTUnwrap(NSClassFromString("RNCWebView") as? UIView.Type)
        let rncComponent = rncComponentClass.init(frame: host.bounds)
        let rncImplementationView = try XCTUnwrap(findView(named: "RNCWebViewImpl", in: rncComponent))
        rncImplementationView.setValue(false, forKey: "messagingEnabled")
        rncImplementationView.setValue(nil, forKey: "onShouldStartLoadWithRequest")
        mount(rncComponent, in: host, at: 0)

        let requests = NSMutableArray()
        container.onBridgeRequest = { event in
            let rawMessage = event["rawMessage"] as? String ?? "{}"
            guard let data = rawMessage.data(using: .utf8),
                  let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = message["type"] as? String
            else { return }
            requests.add(type)
        }
        let fixtureHTML = """
        <!doctype html><html><body><script>
          window.__matrixSentinels = [];
          window.addEventListener('message', function(event) {
            window.__matrixSentinels.push(event.data);
          });
          var sameOriginFrame = document.createElement('iframe');
          sameOriginFrame.srcdoc = "<script>window.webkit.messageHandlers.StripeConnectBridge.postMessage({documentId:'11111111111111111111111111111111',rawMessage:JSON.stringify({type:'matrix-same-origin-child'})}).then(function(){parent.postMessage('same-origin-child-replied','*')}).catch(function(){parent.postMessage('same-origin-child-rejected','*')});<\\/script>";
          document.body.appendChild(sameOriginFrame);
          var opaqueFrame = document.createElement('iframe');
          opaqueFrame.sandbox = 'allow-scripts';
          opaqueFrame.srcdoc = "<script>try{window.webkit.messageHandlers.StripeConnectBridge.postMessage({documentId:'22222222222222222222222222222222',rawMessage:JSON.stringify({type:'matrix-opaque-child'})}).then(function(){parent.postMessage('opaque-child-replied','*')}).catch(function(){parent.postMessage('opaque-child-rejected','*')})}catch(error){parent.postMessage('opaque-child-handler-unavailable','*')};<\\/script>";
          document.body.appendChild(opaqueFrame);
          window.webkit.messageHandlers.StripeConnectBridge.postMessage({
            documentId: window.__stripeConnectDocument.id,
            rawMessage: JSON.stringify({ type: 'matrix-top' })
          }).then(function() { window.__matrixTopAcknowledged = true; });
        </script></body></html>
        """
        container.loadSourceForTesting = { webView, sourceURL in
            webView.loadHTMLString(fixtureHTML, baseURL: sourceURL)
        }
        container.updateConfiguration(
            contextId: "matrix-context",
            connectSource: "https://connect-js.stripe.com/test-fixture",
            initializationObjectJson: #"{"initParams":{"locale":"en"}}"#,
            observeContentHeight: false
        )

        let ready = expectation(description: "trusted document bridge is installed")
        container.onBridgeReady = { attachmentId in
            if attachmentId.length > 0 { ready.fulfill() }
        }
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let root = UIViewController()
        window.rootViewController = root
        root.view.addSubview(host)
        window.makeKeyAndVisible()
        root.view.layoutIfNeeded()
        host.layoutIfNeeded()
        defer {
            container.dispose()
            window.isHidden = true
        }

        await fulfillment(of: [ready], timeout: 3)
        let webView = try XCTUnwrap(findView(of: WKWebView.self, in: host))
        try await waitForJavaScriptValue("window.__matrixTopAcknowledged", in: webView) { $0 as? Bool == true }
        try await waitForJavaScriptValue("window.__matrixSentinels.join('|')", in: webView) {
            guard let sentinels = $0 as? String else { return false }
            return sentinels.contains("same-origin-child-replied") && sentinels.contains("opaque-child-")
        }
        XCTAssertEqual(requests as? [String], ["matrix-top"])

        let originCases: [(String, Bool)] = [
            ("https://connect-js.stripe.com:443", true),
            ("http://connect-js.stripe.com", false),
            ("https://connect-js.stripe.com:444", false),
            ("https://connect-js.stripe.com.attacker.test", false),
            ("https://attacker.test", false),
        ]
        for (index, (origin, shouldDeliver)) in originCases.enumerated() {
            let requestType = "matrix-origin-\(index)"
            let probeHTML = """
            <!doctype html><html><body><script>
              document.body.dataset.attempted = location.origin;
              window.webkit.messageHandlers.StripeConnectBridge.postMessage({
                documentId: '33333333333333333333333333333333',
                rawMessage: JSON.stringify({ type: '\(requestType)' })
              }).then(function(reply) {
                document.body.dataset.reply = JSON.stringify(reply);
              }).catch(function() {
                document.body.dataset.reply = 'rejected';
              });
            </script></body></html>
            """
            webView.loadHTMLString(probeHTML, baseURL: try XCTUnwrap(URL(string: origin)))
            try await waitForJavaScriptValue("document.body.dataset.reply", in: webView) { $0 != nil }
            let attemptedOrigin = try await evaluateJavaScript("document.body.dataset.attempted", in: webView) as? String
            XCTAssertEqual(attemptedOrigin?.isEmpty, false, "Probe page did not execute for \(origin)")
            if shouldDeliver {
                for _ in 0..<100 where !requests.contains(requestType) {
                    try await Task.sleep(nanoseconds: 50_000_000)
                }
            }
            XCTAssertEqual(
                requests.contains(requestType),
                shouldDeliver,
                "Unexpected native callback decision for \(origin)"
            )
        }
        XCTAssertEqual(requests as? [String], ["matrix-top", "matrix-origin-0"])
    }

    func test_detachCancelsPendingReplyAndDisposePreventsRebinding() async throws {
        guard #available(iOS 14.0, *) else { throw XCTSkip("WKScriptMessageHandlerWithReply requires iOS 14") }

        let hostClass = try XCTUnwrap(NSClassFromString("ConnectBridgeContainerComponentView") as? UIView.Type)
        let host = hostClass.init(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let container = try XCTUnwrap(host.value(forKey: "contentView") as? ConnectBridgeContainerView)
        let rncComponentClass = try XCTUnwrap(NSClassFromString("RNCWebView") as? UIView.Type)
        let rncComponent = rncComponentClass.init(frame: host.bounds)
        let rncImplementationView = try XCTUnwrap(findView(named: "RNCWebViewImpl", in: rncComponent))
        rncImplementationView.setValue(false, forKey: "messagingEnabled")
        rncImplementationView.setValue(nil, forKey: "onShouldStartLoadWithRequest")
        mount(rncComponent, in: host, at: 0)

        let requests = NSMutableArray()
        var requestExpectation: XCTestExpectation?
        container.onBridgeRequest = { event in
            guard let rawMessage = event["rawMessage"] as? String,
                  let data = rawMessage.data(using: .utf8),
                  let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = message["type"] as? String
            else { return }
            requests.add(type)
            if type == "fetchClientSecret" {
                requestExpectation?.fulfill()
                requestExpectation = nil
            }
        }

        let pendingHTML = """
        <!doctype html><html><body><script>
          window.webkit.messageHandlers.StripeConnectBridge.postMessage({
            documentId: window.__stripeConnectDocument.id,
            rawMessage: JSON.stringify({ type: 'fetchClientSecret' })
          }).then(function(reply) {
            document.body.dataset.pendingResult = reply.type;
          });
        </script></body></html>
        """
        let source = "https://connect-js.stripe.com/test-fixture"
        container.loadSourceForTesting = { webView, sourceURL in
            webView.loadHTMLString(pendingHTML, baseURL: sourceURL)
        }
        container.updateConfiguration(
            contextId: "lifecycle-context",
            connectSource: source,
            initializationObjectJson: #"{"initParams":{"locale":"en"}}"#,
            observeContentHeight: false
        )

        let firstAttachmentReady = expectation(description: "first attachment is ready")
        var attachmentExpectation: XCTestExpectation? = firstAttachmentReady
        var detachExpectation: XCTestExpectation?
        var attachmentIds: [String] = []
        container.onBridgeReady = { attachmentId in
            if attachmentId.length > 0 {
                attachmentIds.append(attachmentId as String)
                attachmentExpectation?.fulfill()
                attachmentExpectation = nil
            } else {
                detachExpectation?.fulfill()
                detachExpectation = nil
            }
        }

        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let root = UIViewController()
        window.rootViewController = root
        root.view.addSubview(host)
        window.makeKeyAndVisible()
        root.view.layoutIfNeeded()
        host.layoutIfNeeded()
        defer {
            container.dispose()
            window.isHidden = true
        }

        await fulfillment(of: [firstAttachmentReady], timeout: 3)
        let webView = try XCTUnwrap(findView(of: WKWebView.self, in: host))
        let firstRequestPending = expectation(description: "first document request is pending")
        requestExpectation = firstRequestPending
        await fulfillment(of: [firstRequestPending], timeout: 3)
        let firstDetach = expectation(description: "detaching the host unbinds the adapter")
        detachExpectation = firstDetach
        host.removeFromSuperview()
        await fulfillment(of: [firstDetach], timeout: 3)
        try await waitForJavaScriptValue("document.body.dataset.pendingResult", in: webView) {
            $0 as? String == "cancelled"
        }

        let secondAttachmentReady = expectation(description: "reattachment installs a new handler")
        attachmentExpectation = secondAttachmentReady
        let secondRequestPending = expectation(description: "reattached document request reaches the adapter")
        requestExpectation = secondRequestPending
        root.view.addSubview(host)
        root.view.layoutIfNeeded()
        host.layoutIfNeeded()
        await fulfillment(of: [secondAttachmentReady, secondRequestPending], timeout: 3)
        XCTAssertEqual(attachmentIds.count, 2)
        XCTAssertNotEqual(attachmentIds[0], attachmentIds[1])

        let disposed = expectation(description: "dispose unbinds the adapter")
        detachExpectation = disposed
        container.dispose()
        await fulfillment(of: [disposed], timeout: 3)
        try await waitForJavaScriptValue("document.body.dataset.pendingResult", in: webView) {
            $0 as? String == "cancelled"
        }

        let requestCountBeforeDisposeProbe = requests.count
        webView.loadHTMLString("""
          <!doctype html><html><body><script>
            document.body.dataset.disposeProbe = 'executed';
            try {
              window.webkit.messageHandlers.StripeConnectBridge.postMessage({
                documentId: '44444444444444444444444444444444',
                rawMessage: JSON.stringify({ type: 'after-dispose' })
              });
            } catch(error) {}
          </script></body></html>
          """, baseURL: URL(string: source))
        try await waitForJavaScriptValue("document.body.dataset.disposeProbe", in: webView) {
            $0 as? String == "executed"
        }
        XCTAssertEqual(requests.count, requestCountBeforeDisposeProbe)
    }

    func test_initializationUpdateRejectsReplacementBeforeReadingPageGetter() async throws {
        guard #available(iOS 14.0, *) else { throw XCTSkip("WKContentWorld requires iOS 14") }

        let origin = URL(string: "https://connect-js.stripe.com/test-fixture")!
        let initializationJson = #"{"initParams":{"locale":"fr"}}"#
        let contentController = WKUserContentController()
        let replyHandler = ConnectBridgeTestReplyHandler()
        contentController.addScriptMessageHandler(replyHandler, contentWorld: .page, name: "StripeConnectBridge")
        contentController.addUserScript(WKUserScript(
            source: ConnectBridgeContainerView.bootstrapScript(
                initializationObjectJson: #"{"initParams":{"locale":"en"}}"#,
                observeContentHeight: false
            ),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true,
            in: .page
        ))
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        let webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 320, height: 240), configuration: configuration)
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 240))
        let root = UIViewController()
        window.rootViewController = root
        root.view.addSubview(webView)
        window.makeKeyAndVisible()
        defer {
            webView.stopLoading()
            window.isHidden = true
        }

        let firstDocumentLoaded = expectation(description: "first Connect document loaded")
        let firstDelegate = WebViewLoadDelegate(expectation: firstDocumentLoaded)
        webView.navigationDelegate = firstDelegate
        webView.loadHTMLString("<script>window.updateConnectInstance = function(params) { window.appliedLocale = params.locale; };</script>", baseURL: origin)
        await fulfillment(of: [firstDocumentLoaded], timeout: 5)

        let firstDocumentIdValue = try await evaluateJavaScript("window.__stripeConnectDocument.id", in: webView) as? String
        let firstDocumentId = try XCTUnwrap(firstDocumentIdValue)
        let updateScript = try XCTUnwrap(ConnectBridgeContainerView.initializationUpdateScript(
            documentId: firstDocumentId,
            initializationObjectJson: initializationJson
        ))
        let updateResult = try await evaluateJavaScript(updateScript, in: webView) as? Bool
        XCTAssertEqual(updateResult, true)
        let appliedLocale = try await evaluateJavaScript("window.appliedLocale", in: webView) as? String
        XCTAssertEqual(appliedLocale, "fr")

        let replacementLoaded = expectation(description: "same-origin replacement loaded")
        let replacementDelegate = WebViewLoadDelegate(expectation: replacementLoaded)
        webView.navigationDelegate = replacementDelegate
        webView.loadHTMLString("""
          <script>
            window.beginGetterReadCount = 0;
            try {
              Object.defineProperty(window, '__stripeConnectBeginInitializationUpdate', {
                configurable: true,
                get: function() {
                  window.beginGetterReadCount += 1;
                  return function() { return function(payload) { window.capturedPayload = payload; return true; }; };
                }
              });
            } catch (error) {
              window.shadowDefinitionFailed = true;
            }
          </script>
        """, baseURL: origin)
        await fulfillment(of: [replacementLoaded], timeout: 5)

        let replacementDocumentIdValue = try await evaluateJavaScript("window.__stripeConnectDocument.id", in: webView) as? String
        let replacementDocumentId = try XCTUnwrap(replacementDocumentIdValue)
        XCTAssertNotEqual(replacementDocumentId, firstDocumentId)
        let staleUpdateScript = try XCTUnwrap(ConnectBridgeContainerView.initializationUpdateScript(
            documentId: firstDocumentId,
            initializationObjectJson: initializationJson
        ))
        let staleUpdateResult = try await evaluateJavaScript(staleUpdateScript, in: webView) as? Bool
        let beginGetterReadCount = try await evaluateJavaScript("window.beginGetterReadCount", in: webView) as? Int
        let shadowDefinitionFailed = try await evaluateJavaScript("window.shadowDefinitionFailed", in: webView) as? Bool
        XCTAssertEqual(staleUpdateResult, false)
        XCTAssertEqual(beginGetterReadCount, 0)
        XCTAssertEqual(shadowDefinitionFailed, true)

        let attackerController = WKUserContentController()
        let attackerConfiguration = WKWebViewConfiguration()
        attackerConfiguration.userContentController = attackerController
        let attackerWebView = WKWebView(frame: .zero, configuration: attackerConfiguration)
        let attackerLoaded = expectation(description: "replacement page with a hostile updater getter loaded")
        let attackerDelegate = WebViewLoadDelegate(expectation: attackerLoaded)
        attackerWebView.navigationDelegate = attackerDelegate
        attackerWebView.loadHTMLString("""
          <script>
            Object.defineProperty(window, '__stripeConnectDocument', {
              value: Object.freeze({ id: 'replacement-document' }), configurable: false
            });
            window.beginGetterReadCount = 0;
            window.updaterInvocationCount = 0;
            Object.defineProperty(window, '__stripeConnectBeginInitializationUpdate', {
              configurable: false,
              get: function() {
                window.beginGetterReadCount += 1;
                return function() {
                  window.updaterInvocationCount += 1;
                  return function(payload) { window.capturedPayload = payload; return true; };
                };
              }
            });
          </script>
        """, baseURL: origin)
        await fulfillment(of: [attackerLoaded], timeout: 5)

        let attackerUpdateResult = try await evaluateJavaScript(staleUpdateScript, in: attackerWebView) as? Bool
        let attackerGetterReadCount = try await evaluateJavaScript("window.beginGetterReadCount", in: attackerWebView) as? Int
        let attackerInvocationCount = try await evaluateJavaScript("window.updaterInvocationCount", in: attackerWebView) as? Int
        let payloadWasCaptured = try await evaluateJavaScript("typeof window.capturedPayload !== 'undefined'", in: attackerWebView) as? Bool
        XCTAssertEqual(attackerUpdateResult, false)
        XCTAssertEqual(attackerGetterReadCount, 0)
        XCTAssertEqual(attackerInvocationCount, 0)
        XCTAssertEqual(payloadWasCaptured, false)
    }

    private func findView(named className: String, in view: UIView) -> UIView? {
        if NSStringFromClass(type(of: view)).contains(className) { return view }
        return view.subviews.lazy.compactMap { self.findView(named: className, in: $0) }.first
    }

    private func findView<T: UIView>(of type: T.Type, in view: UIView) -> T? {
        if let match = view as? T { return match }
        return view.subviews.lazy.compactMap { self.findView(of: type, in: $0) }.first
    }

    private func mount(_ child: UIView, in parent: UIView, at index: Int) {
        let selector = NSSelectorFromString("mountChildComponentView:index:")
        let implementation = class_getMethodImplementation(type(of: parent), selector)
        typealias MountChild = @convention(c) (AnyObject, Selector, AnyObject, Int) -> Void
        unsafeBitCast(implementation, to: MountChild.self)(parent, selector, child, index)
    }

    private func evaluateJavaScript(_ script: String, in webView: WKWebView) async throws -> Any? {
        try await withCheckedThrowingContinuation { continuation in
            webView.evaluateJavaScript(script, completionHandler: { value, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: value)
                }
            })
        }
    }

    private func waitForJavaScriptValue(
        _ script: String,
        in webView: WKWebView,
        matches predicate: (Any?) -> Bool
    ) async throws {
        for _ in 0..<100 {
            if predicate(try await evaluateJavaScript(script, in: webView)) { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("JavaScript condition did not become true: \(script)")
    }
}

@available(iOS 14.0, *)
private final class ConnectBridgeTestReplyHandler: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        replyHandler(["type": "ack"], nil)
    }
}

private final class WebViewLoadDelegate: NSObject, WKNavigationDelegate {
    private let expectation: XCTestExpectation

    init(expectation: XCTestExpectation) {
        self.expectation = expectation
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        expectation.fulfill()
    }
}
