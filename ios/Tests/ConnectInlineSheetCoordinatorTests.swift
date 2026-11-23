@testable import stripe_react_native
import WebKit
import XCTest

/// Stands in for react-native-webview's view: it hosts the `WKWebView`, handles `ReactNativeWebView` messages, and
/// cancels every new window, as react-native-webview does.
private final class FakeReactNativeWebView: UIView, WKScriptMessageHandler, WKNavigationDelegate {
    let webView: WKWebView
    private(set) var messages: [String] = []

    init(configuration: WKWebViewConfiguration) {
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 200), configuration: configuration)
        super.init(frame: webView.frame)
        addSubview(webView)
        webView.navigationDelegate = self
        webView.configuration.userContentController.add(WeakMessageHandler(self), name: "ReactNativeWebView")
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        messages.append(message.body as? String ?? "")
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(navigationAction.targetFrame == nil ? .cancel : .allow)
    }
}

private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

final class ConnectInlineSheetCoordinatorTests: XCTestCase {
    // A local address that refuses connections, so no test page reaches the network.
    private let origin = "http://127.0.0.1:9"
    private let pageURL = URL(string: "http://127.0.0.1:9/v1.0/react_native_webview.html")!
    private let sheetURL = "http://127.0.0.1:9/accessory_layer_test.html#layer_type=overlay&os_sheet=true&os_sheet_id=sheet-1"

    private var window: UIWindow!
    private var reactNativeWebView: FakeReactNativeWebView!
    private var coordinator: ConnectInlineSheetCoordinator!
    private var attached: Bool?

    override func setUp() {
        super.setUp()
        window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        window.rootViewController = UIViewController()
        window.makeKeyAndVisible()
        let host = UIView(frame: window.bounds)
        window.rootViewController?.view.addSubview(host)

        let configuration = WKWebViewConfiguration()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        reactNativeWebView = FakeReactNativeWebView(configuration: configuration)
        host.addSubview(reactNativeWebView)

        coordinator = ConnectInlineSheetCoordinator(hostView: host)
        coordinator.connectJsOrigin = origin
        coordinator.onAttach = { [weak self] in self?.attached = $0 }
        coordinator.setNeedsAttach()
        waitUntil { self.attached == true }
    }

    override func tearDown() {
        coordinator.detach()
        window.rootViewController?.dismiss(animated: false)
        window.isHidden = true
        window = nil
        super.tearDown()
    }

    // MARK: - Helpers

    private func waitUntil(timeout: TimeInterval = 5, _ condition: () -> Bool, file: StaticString = #filePath, line: UInt = #line) {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() && Date() < deadline {
            RunLoop.main.run(until: Date().addingTimeInterval(0.02))
        }
        XCTAssertTrue(condition(), "Timed out waiting", file: file, line: line)
    }

    private func loadPage(_ body: String) {
        let html = """
        <html><body><script>
        function post(message) { window.webkit.messageHandlers.ReactNativeWebView.postMessage(message); }
        window.sheetClosed = function (message) { post('sheetClosed:' + message.sheetId); };
        window.sheetCloseRequested = function (message) { post('sheetCloseRequested:' + message.sheetId); };
        </script>\(body)<script>post('loaded');</script></body></html>
        """
        reactNativeWebView.webView.loadHTMLString(html, baseURL: pageURL)
        waitUntil { self.reactNativeWebView.messages.contains("loaded") }
    }

    private func openSheet() -> ConnectInlineSheetViewController? {
        loadPage("<script>window.sheetWindow = window.open('\(sheetURL)', 'sheet-1');</script>")
        return coordinator.sheets["sheet-1"]
    }

    private func presentSheet(dismissible: Bool = true) -> ConnectInlineSheetViewController? {
        let sheet = openSheet()
        coordinator.sheetChanged(sheetId: "sheet-1", height: 300, dismissible: dismissible)
        waitUntil { self.window.rootViewController?.presentedViewController === sheet }
        return sheet
    }

    private func evaluateInPage(_ script: String) {
        reactNativeWebView.webView.evaluateJavaScript(script)
    }

    // MARK: - Tests

    func test_presentsSheetOnlyAfterSheetChanged() {
        let sheet = openSheet()
        XCTAssertNotNil(sheet)
        XCTAssertNil(window.rootViewController?.presentedViewController)

        coordinator.sheetChanged(sheetId: "sheet-1", height: 300, dismissible: true)

        waitUntil { self.window.rootViewController?.presentedViewController === sheet }
    }

    func test_dismissibleSheet_sendsSheetClosedWhenTheUserDismissesIt() {
        guard let sheet = presentSheet(), let presentationController = sheet.presentationController else {
            return XCTFail("The sheet isn't presented")
        }

        sheet.presentationControllerDidDismiss(presentationController)

        waitUntil { self.reactNativeWebView.messages.contains("sheetClosed:sheet-1") }
    }

    func test_nonDismissibleSheet_sendsSheetCloseRequestedAndStays() {
        guard let sheet = presentSheet(dismissible: false), let presentationController = sheet.presentationController else {
            return XCTFail("The sheet isn't presented")
        }
        XCTAssertTrue(sheet.isModalInPresentation)

        sheet.presentationControllerDidAttemptToDismiss(presentationController)

        waitUntil { self.reactNativeWebView.messages.contains("sheetCloseRequested:sheet-1") }
        XCTAssertFalse(reactNativeWebView.messages.contains("sheetClosed:sheet-1"))
        XCTAssertTrue(window.rootViewController?.presentedViewController === sheet)
    }

    func test_windowClose_dismissesAndReleasesTheSheet() {
        _ = presentSheet(dismissible: false)

        evaluateInPage("window.sheetWindow.close();")

        waitUntil { self.coordinator.sheets.isEmpty }
        waitUntil { self.reactNativeWebView.messages.contains("sheetClosed:sheet-1") }
    }

    func test_reload_tearsDownSheets() {
        _ = presentSheet()

        loadPage("<p>Reloaded</p>")

        waitUntil { self.coordinator.sheets.isEmpty }
    }

    func test_bridge_acceptsTheComponentPage() {
        loadPage("<script>post('from-page');</script>")

        XCTAssertTrue(reactNativeWebView.messages.contains("from-page"))
    }

    func test_bridge_rejectsAnotherOrigin() {
        reactNativeWebView.webView.loadHTMLString(
            "<script>window.webkit.messageHandlers.ReactNativeWebView.postMessage('from-other-origin');</script>",
            baseURL: URL(string: "http://127.0.0.2:9/v1.0/react_native_webview.html")
        )
        RunLoop.main.run(until: Date().addingTimeInterval(1))

        XCTAssertFalse(reactNativeWebView.messages.contains("from-other-origin"))
    }

    func test_bridge_rejectsASheet() {
        let sheet = openSheet()

        sheet?.webView.evaluateJavaScript("window.webkit.messageHandlers.ReactNativeWebView.postMessage('from-sheet');")
        evaluateInPage("setTimeout(function () { post('done'); }, 300);")

        waitUntil { self.reactNativeWebView.messages.contains("done") }
        XCTAssertFalse(reactNativeWebView.messages.contains("from-sheet"))
    }
}
