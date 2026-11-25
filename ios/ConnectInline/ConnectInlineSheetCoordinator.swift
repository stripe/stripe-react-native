//
//  ConnectInlineSheetCoordinator.swift
//  stripe-react-native
//

import UIKit
import WebKit

/// Presents the windows an inline Connect component opens as native sheets.
///
/// react-native-webview never returns a web view for a new window, so a window Connect.js opens for a dialog would
/// be lost. This finds the `WKWebView` inside the host view, takes over its new windows, and lets only the
/// component's own page message the SDK.
@objc(ConnectInlineSheetCoordinator)
public final class ConnectInlineSheetCoordinator: NSObject {
    private static let maxAttachAttempts = 40

    @objc public var connectJsOrigin: String? {
        didSet { connectJsOriginURL = connectJsOrigin.flatMap(URL.init(string:)) }
    }
    @objc public var sheetBackgroundColor: UIColor?
    @objc public var onAttach: ((Bool) -> Void)?
    @objc public var onOpenUrl: ((String) -> Void)?

    private weak var hostView: UIView?
    private weak var webView: WKWebView?
    private var connectJsOriginURL: URL?
    private var uiDelegateProxy: ConnectInlineUIDelegateProxy?
    private var navigationDelegateProxy: ConnectInlineNavigationDelegateProxy?
    private var lifecycle = ConnectInlineSheetLifecycle()
    private(set) var sheets: [String: ConnectInlineSheetViewController] = [:]
    private var isAttachScheduled = false
    private var attachAttempts = 0
    private var didReportAttach = false
    private var isDetached = false

    @objc public init(hostView: UIView) {
        self.hostView = hostView
        super.init()
    }

    @objc public func setNeedsAttach() {
        guard !isAttachScheduled, !isDetached else { return }
        isAttachScheduled = true
        // Runs after the whole mount transaction, so react-native-webview has applied its own props first.
        DispatchQueue.main.async { [weak self] in
            self?.isAttachScheduled = false
            self?.attachIfPossible()
        }
    }

    @objc(sheetChangedWithSheetId:height:dismissible:)
    public func sheetChanged(sheetId: String, height: Double, dismissible: Bool) {
        perform(lifecycle.sheetChanged(sheetId: sheetId, height: height, dismissible: dismissible))
    }

    @objc public func resetSheets() {
        perform(lifecycle.reset())
    }

    @objc public func detach() {
        isDetached = true
        resetSheets()
        if let webView {
            if webView.uiDelegate === uiDelegateProxy { webView.uiDelegate = uiDelegateProxy?.original }
            if webView.navigationDelegate === navigationDelegateProxy {
                webView.navigationDelegate = navigationDelegateProxy?.original
            }
        }
        webView = nil
    }

    // MARK: - Attaching

    private func attachIfPossible() {
        guard !isDetached, let hostView, hostView.window != nil else { return }
        guard let found = Self.findWebView(in: hostView) else {
            // react-native-webview creates its web view once it's in a window, which can be after this runs.
            if attachAttempts < Self.maxAttachAttempts {
                attachAttempts += 1
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in self?.setNeedsAttach() }
            } else {
                reportAttach(false)
            }
            return
        }
        guard installMessageFilter(on: found) else {
            reportAttach(false)
            return
        }
        if found !== webView || found.uiDelegate !== uiDelegateProxy || found.navigationDelegate !== navigationDelegateProxy {
            wrapDelegates(of: found)
        }
        reportAttach(true)
    }

    private func reportAttach(_ attached: Bool) {
        guard !didReportAttach else { return }
        didReportAttach = true
        onAttach?(attached)
    }

    /// react-native-webview reinstalls its handler whenever it resets its scripts, so this runs on every attach.
    private func installMessageFilter(on webView: WKWebView) -> Bool {
        guard let target = webView.superview as? WKScriptMessageHandler else { return false }
        let filter = ConnectInlineScriptMessageFilter(target: target) { [weak self, weak webView] message in
            guard let self, let webView, let origin = self.connectJsOriginURL else { return false }
            let securityOrigin = message.frameInfo.securityOrigin
            return ConnectInlineSheetRules.acceptsBridgeMessage(
                isFromComponentWebView: message.webView === webView,
                isMainFrame: message.frameInfo.isMainFrame,
                scheme: securityOrigin.protocol,
                host: securityOrigin.host,
                port: securityOrigin.port,
                connectJsOrigin: origin
            )
        }
        let userContentController = webView.configuration.userContentController
        userContentController.removeScriptMessageHandler(forName: ConnectInlineScriptMessageFilter.handlerName)
        userContentController.add(filter, name: ConnectInlineScriptMessageFilter.handlerName)
        return true
    }

    private func wrapDelegates(of webView: WKWebView) {
        let originalUIDelegate = webView.uiDelegate === uiDelegateProxy ? uiDelegateProxy?.original : webView.uiDelegate
        let originalNavigationDelegate = webView.navigationDelegate === navigationDelegateProxy
            ? navigationDelegateProxy?.original : webView.navigationDelegate

        let uiProxy = ConnectInlineUIDelegateProxy(original: originalUIDelegate)
        uiProxy.createWindow = { [weak self] opener, configuration, navigationAction in
            self?.createWindow(opener: opener, configuration: configuration, navigationAction: navigationAction)
        }
        let navigationProxy = ConnectInlineNavigationDelegateProxy(original: originalNavigationDelegate)
        navigationProxy.opensSheet = { [weak self, weak webView] navigationAction in
            guard let self, let webView else { return false }
            return self.newSheetId(opener: webView, navigationAction: navigationAction) != nil
        }
        navigationProxy.pageWillChange = { [weak self] in
            self?.resetSheets()
        }

        uiDelegateProxy = uiProxy
        navigationDelegateProxy = navigationProxy
        self.webView = webView
        // WebKit reads which methods a delegate implements when it's set, so set these after the originals.
        webView.uiDelegate = uiProxy
        webView.navigationDelegate = navigationProxy
    }

    private static func findWebView(in root: UIView) -> WKWebView? {
        var queue: [UIView] = [root]
        while !queue.isEmpty {
            let view = queue.removeFirst()
            if let webView = view as? WKWebView {
                return webView
            }
            queue.append(contentsOf: view.subviews)
        }
        return nil
    }

    // MARK: - Windows

    private func createWindow(
        opener: WKWebView,
        configuration: WKWebViewConfiguration,
        navigationAction: WKNavigationAction
    ) -> WKWebView? {
        // Windows that aren't sheets keep react-native-webview's handling, which never gets this far.
        guard let hostView, let url = navigationAction.request.url,
              let sheetId = newSheetId(opener: opener, navigationAction: navigationAction),
              lifecycle.windowOpened(sheetId: sheetId) else {
            return nil
        }
        return openSheet(sheetId: sheetId, windowURL: url, configuration: configuration, stagingHost: hostView)
    }

    private func newSheetId(opener: WKWebView, navigationAction: WKNavigationAction) -> String? {
        guard !isDetached, navigationAction.targetFrame == nil, let origin = connectJsOriginURL else { return nil }
        let sourceOrigin = navigationAction.sourceFrame.securityOrigin
        let sheetId = ConnectInlineSheetRules.sheetId(
            forNewWindowURL: navigationAction.request.url,
            isFromComponentWebView: opener === webView,
            isFromConnectJs: ConnectInlineSheetRules.isSameOrigin(
                scheme: sourceOrigin.protocol,
                host: sourceOrigin.host,
                port: sourceOrigin.port,
                as: origin
            ),
            connectJsOrigin: origin
        )
        return sheetId.flatMap { lifecycle.phases[$0] == nil ? $0 : nil }
    }

    private func openSheet(
        sheetId: String,
        windowURL: URL,
        configuration: WKWebViewConfiguration,
        stagingHost: UIView
    ) -> WKWebView {
        let sheet = ConnectInlineSheetViewController(
            configuration: configuration,
            sheetId: sheetId,
            windowURL: windowURL,
            backgroundColor: sheetBackgroundColor ?? .systemBackground
        )
        sheet.onDismissed = { [weak self, weak sheet] in
            guard let self, let sheet, self.sheets[sheetId] === sheet else { return }
            self.perform(self.lifecycle.sheetDismissed(sheetId: sheetId))
        }
        sheet.onCloseRequested = { [weak self, weak sheet] in
            guard let self, let sheet, self.sheets[sheetId] === sheet else { return }
            self.perform(self.lifecycle.closeRequested(sheetId: sheetId))
        }
        sheet.onWindowClosed = { [weak self, weak sheet] in
            guard let self, let sheet, self.sheets[sheetId] === sheet else { return }
            self.perform(self.lifecycle.windowClosed(sheetId: sheetId))
        }
        sheet.onOpenUrl = { [weak self] url in
            self?.onOpenUrl?(url.absoluteString)
        }
        sheets[sheetId] = sheet
        sheet.stage(in: stagingHost.window ?? stagingHost)
        return sheet.webView
    }

    private func perform(_ actions: [ConnectInlineSheetLifecycle.Action]) {
        for action in actions {
            switch action {
            case .present(let sheetId, let height, let dismissible):
                sheets[sheetId]?.present(height: height, dismissible: dismissible) { [weak self] in
                    self?.topmostPresenter()
                }
            case .update(let sheetId, let height, let dismissible):
                sheets[sheetId]?.update(height: height, dismissible: dismissible)
            case .dismiss(let sheetId):
                sheets[sheetId]?.dismissProgrammatically()
            case .sendSheetClosed(let sheetId):
                callPage("sheetClosed", sheetId: sheetId)
            case .sendSheetCloseRequested(let sheetId):
                callPage("sheetCloseRequested", sheetId: sheetId)
            case .release(let sheetId):
                sheets.removeValue(forKey: sheetId)?.release()
            }
        }
    }

    private func topmostPresenter() -> UIViewController? {
        guard var top = hostView?.window?.rootViewController else { return nil }
        while let presented = top.presentedViewController, !presented.isBeingDismissed {
            top = presented
        }
        return top
    }

    private func callPage(_ function: String, sheetId: String) {
        guard let webView,
              let data = try? JSONSerialization.data(withJSONObject: ["sheetId": sheetId]),
              let json = String(data: data, encoding: .utf8) else {
            return
        }
        webView.evaluateJavaScript("window.\(function) && window.\(function)(\(json)); true;")
    }
}
