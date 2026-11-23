//
//  ConnectInlineSheetViewController.swift
//  stripe-react-native
//

import UIKit
import WebKit

/// Shows a window that an inline Connect component opened in a native sheet.
///
/// The sheet's web view has no bridge of its own: Connect.js in the component's web view reports on it. It stays on
/// the page it was opened with, and its links open outside the app. A sheet that isn't dismissible stays until
/// Connect.js closes its window.
final class ConnectInlineSheetViewController: UIViewController {
    private static let minimumHeight: CGFloat = 120

    let sheetId: String
    let webView: WKWebView

    /// The user swiped a dismissible sheet away or tapped outside it, or the app dismissed the screen behind it.
    var onDismissed: (() -> Void)?
    /// The user tried to dismiss a sheet that isn't dismissible.
    var onCloseRequested: (() -> Void)?
    /// The sheet's page called `window.close()`, or its web content went away.
    var onWindowClosed: (() -> Void)?
    var onOpenUrl: ((URL) -> Void)?

    private let windowURL: URL
    private let sheetBackgroundColor: UIColor
    private var contentHeight: CGFloat = minimumHeight
    private var isDismissible = true {
        didSet { isModalInPresentation = !isDismissible }
    }
    private var didStartFirstNavigation = false
    private var isStaged = false
    private var isPresentedByUs = false
    private var didFinishPresenting = false
    private var isDismissingProgrammatically = false
    private var didWaitForDismissal = false

    init(configuration: WKWebViewConfiguration, sheetId: String, windowURL: URL, backgroundColor: UIColor) {
        self.sheetId = sheetId
        self.windowURL = windowURL
        sheetBackgroundColor = backgroundColor
        // WebKit links the window to the page that opened it only if the web view uses the configuration it supplied.
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init(nibName: nil, bundle: nil)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        // The sheet already sits below the status bar, so safe-area insets would only push the content down.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func loadView() {
        let containerView = UIView()
        containerView.backgroundColor = sheetBackgroundColor
        webView.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: containerView.topAnchor),
            webView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
        ])
        view = containerView
    }

    // MARK: - Presentation

    /// Lays the page out offscreen at the screen's width, so it renders and Connect.js can report its height before
    /// the sheet appears.
    func stage(in host: UIView) {
        view.frame = CGRect(x: 0, y: host.bounds.maxY + 40, width: host.bounds.width, height: host.bounds.height * 0.6)
        view.accessibilityElementsHidden = true
        host.addSubview(view)
        view.layoutIfNeeded()
        isStaged = true
    }

    func present(height: Int, dismissible: Bool, presenter: @escaping () -> UIViewController?) {
        update(height: height, dismissible: dismissible)
        guard !isPresentedByUs else { return }
        didWaitForDismissal = false
        presentWhenPossible(presenter)
    }

    func update(height: Int, dismissible: Bool) {
        isDismissible = dismissible
        contentHeight = max(CGFloat(height), Self.minimumHeight)
        guard isPresentedByUs, #available(iOS 16.0, *) else { return }
        sheetPresentationController?.animateChanges {
            sheetPresentationController?.invalidateDetents()
        }
    }

    func dismissProgrammatically() {
        guard isPresentedByUs else { return }
        isDismissingProgrammatically = true
        isPresentedByUs = false
        didFinishPresenting = false
        // Dismissing from the presenter also dismisses any sheet stacked above this one.
        (presentingViewController ?? self).dismiss(animated: true)
    }

    func release() {
        webView.stopLoading()
        webView.uiDelegate = nil
        webView.navigationDelegate = nil
        if isStaged {
            isStaged = false
            view.removeFromSuperview()
        }
    }

    private func presentWhenPossible(_ presenter: @escaping () -> UIViewController?) {
        // Without a screen to show it over, the sheet is gone, so Connect.js gets sheetClosed.
        guard let presentingController = presenter() else {
            onDismissed?()
            return
        }
        // A sheet that's still animating away, like a menu that opened this dialog, can't be presented over until
        // it's gone.
        let dismissing = presentingController.isBeingDismissed
            ? presentingController : presentingController.presentedViewController
        if let dismissing {
            guard !didWaitForDismissal, let transition = dismissing.transitionCoordinator else {
                onDismissed?()
                return
            }
            didWaitForDismissal = true
            transition.animate(alongsideTransition: nil) { [weak self] _ in
                self?.presentWhenPossible(presenter)
            }
            return
        }
        if isStaged {
            isStaged = false
            view.removeFromSuperview()
            view.accessibilityElementsHidden = false
        }
        modalPresentationStyle = .pageSheet
        configureSheet()
        presentationController?.delegate = self
        isDismissingProgrammatically = false
        isPresentedByUs = true
        presentingController.present(self, animated: true) { [weak self] in
            self?.didFinishPresenting = true
        }
    }

    private func configureSheet() {
        guard let sheet = sheetPresentationController else { return }
        sheet.prefersGrabberVisible = true
        sheet.prefersScrollingExpandsWhenScrolledToEdge = false
        if #available(iOS 16.0, *) {
            let identifier = UISheetPresentationController.Detent.Identifier("stripe-connect-inline-content")
            sheet.detents = [
                .custom(identifier: identifier) { [weak self] context in
                    min(self?.contentHeight ?? Self.minimumHeight, context.maximumDetentValue)
                },
            ]
            sheet.selectedDetentIdentifier = identifier
        } else {
            sheet.detents = [.medium()]
            sheet.selectedDetentIdentifier = .medium
        }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        // Also covers the sheet going away with the screen behind it.
        let isGone = isBeingDismissed || presentingViewController == nil
            || presentingViewController?.isBeingDismissed == true
        // Moving the staged view into the sheet also reports a disappearance, before the sheet has appeared.
        guard isGone, didFinishPresenting, isPresentedByUs, !isDismissingProgrammatically else { return }
        isPresentedByUs = false
        didFinishPresenting = false
        onDismissed?()
    }
}

extension ConnectInlineSheetViewController: UIAdaptivePresentationControllerDelegate {
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard isPresentedByUs else { return }
        isPresentedByUs = false
        didFinishPresenting = false
        onDismissed?()
    }

    func presentationControllerDidAttemptToDismiss(_ presentationController: UIPresentationController) {
        onCloseRequested?()
    }
}

extension ConnectInlineSheetViewController: WKUIDelegate {
    func webViewDidClose(_ webView: WKWebView) {
        onWindowClosed?()
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url {
            onOpenUrl?(url)
        }
        return nil
    }
}

extension ConnectInlineSheetViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard navigationAction.targetFrame?.isMainFrame != false else {
            decisionHandler(.allow)
            return
        }
        let url = navigationAction.request.url
        // A new window can start out on about:blank before it loads the page it was opened with.
        if !didStartFirstNavigation, url?.absoluteString == "about:blank" {
            decisionHandler(.allow)
            return
        }
        let decision = ConnectInlineSheetRules.decideSheetNavigation(
            url: url,
            windowURL: windowURL,
            isFirstNavigation: !didStartFirstNavigation,
            isLinkActivated: navigationAction.navigationType == .linkActivated
        )
        didStartFirstNavigation = true
        switch decision {
        case .allow:
            decisionHandler(.allow)
        case .block:
            decisionHandler(.cancel)
        case .blockAndOpenOutside:
            decisionHandler(.cancel)
            url.map { onOpenUrl?($0) }
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        onWindowClosed?()
    }
}
