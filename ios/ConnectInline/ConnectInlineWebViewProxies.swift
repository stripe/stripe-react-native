//
//  ConnectInlineWebViewProxies.swift
//  stripe-react-native
//

import Foundation
import WebKit

/// Takes over new windows for react-native-webview's `WKUIDelegate`, which never returns a web view for them, and
/// forwards everything else.
final class ConnectInlineUIDelegateProxy: NSObject, WKUIDelegate {
    weak var original: WKUIDelegate?
    var createWindow: ((WKWebView, WKWebViewConfiguration, WKNavigationAction) -> WKWebView?)?

    init(original: WKUIDelegate?) {
        self.original = original
    }

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || original?.responds(to: aSelector) == true
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        original?.responds(to: aSelector) == true ? original : nil
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        createWindow?(webView, configuration, navigationAction)
    }
}

/// Lets sheet windows open and reports when the component's page goes away, and forwards everything else to
/// react-native-webview's `WKNavigationDelegate`.
final class ConnectInlineNavigationDelegateProxy: NSObject, WKNavigationDelegate {
    weak var original: WKNavigationDelegate?
    var opensSheet: ((WKNavigationAction) -> Bool)?
    var pageWillChange: (() -> Void)?

    init(original: WKNavigationDelegate?) {
        self.original = original
    }

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || original?.responds(to: aSelector) == true
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        original?.responds(to: aSelector) == true ? original : nil
    }

    // react-native-webview cancels every new window it's asked about, which would lose the sheet.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if opensSheet?(navigationAction) == true {
            decisionHandler(.allow)
        } else if let original, original.responds(to: #selector(webView(_:decidePolicyFor:decisionHandler:))) {
            original.webView?(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        preferences: WKWebpagePreferences,
        decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void
    ) {
        if opensSheet?(navigationAction) == true {
            decisionHandler(.allow, preferences)
        } else if let original,
                  original.responds(to: #selector(webView(_:decidePolicyFor:preferences:decisionHandler:))) {
            original.webView?(webView, decidePolicyFor: navigationAction, preferences: preferences, decisionHandler: decisionHandler)
        } else {
            self.webView(webView, decidePolicyFor: navigationAction) { decisionHandler($0, preferences) }
        }
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        pageWillChange?()
        original?.webView?(webView, didCommit: navigation)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        pageWillChange?()
        original?.webViewWebContentProcessDidTerminate?(webView)
    }
}

/// Replaces react-native-webview's `ReactNativeWebView` message handler, so only the component's own page reaches
/// it. Sheets share the component's configuration, and with it this handler.
final class ConnectInlineScriptMessageFilter: NSObject, WKScriptMessageHandler {
    static let handlerName = "ReactNativeWebView"

    private weak var target: WKScriptMessageHandler?
    private let accepts: (WKScriptMessage) -> Bool

    init(target: WKScriptMessageHandler, accepts: @escaping (WKScriptMessage) -> Bool) {
        self.target = target
        self.accepts = accepts
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard accepts(message) else { return }
        target?.userContentController(userContentController, didReceive: message)
    }
}
