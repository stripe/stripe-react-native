import Foundation
import React
@_spi(PaymentMethodMessagingElementPreview) @_spi(InternalOnlyAPI) import StripePaymentSheet
import UIKit

@objc(PaymentMethodMessagingElementView)
class PaymentMethodMessagingElementView: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return PaymentMethodMessagingElementContainerView(frame: .zero)
    }
}

@objc(PaymentMethodMessagingElementContainerView)
public class PaymentMethodMessagingElementContainerView: UIView, UIGestureRecognizerDelegate {
    @objc public var onConfigureResult: RCTDirectEventBlock?
    @objc public var onHeightChanged: RCTDirectEventBlock?

    private var paymentMethodMessagingElementView: UIView?
    private var messagingInstance: PaymentMethodMessagingElement?
    private var appearanceConfig: PaymentMethodMessagingElement.Appearance?
    private var lastConfig: NSDictionary?

    // Used to track height updates
    private var previousHeight: CGFloat?

    // The in-flight initMessagingElement task, if any. Cancelled and replaced
    // whenever a newer `appearance`/`configuration` prop update arrives, since
    // those are independently-dispatched RN props that can race each other.
    private var pendingCreateTask: Task<Void, Never>?

    @objc public var appearance: NSDictionary? {
        didSet {
            if let appearance = appearance {
                appearanceConfig = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: appearance)
                // Re-initialize if configuration already exists
                if let config = lastConfig {
                    initMessagingElement(config: config)
                }
            }
        }
    }

    @objc public var configuration: NSDictionary? {
        didSet {
            if let configuration = configuration {
                lastConfig = configuration
                initMessagingElement(config: configuration)
            }
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        fatalError()
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            // Only attach when we have a valid window
            attachPaymentElementIfAvailable()
        }
    }

    public override func willMove(toWindow newWindow: UIWindow?) {
        super.willMove(toWindow: newWindow)
        if newWindow == nil {
            // Remove the view when moving away from window
            removePaymentMethodMessagingElement()
        }
    }

    public override func layoutSubviews() {
        super.layoutSubviews()

        // Calculate our natural height
        let desiredHeight = systemLayoutSizeFitting(CGSize(width: frame.width, height: UIView.layoutFittingCompressedSize.height)).height

        // Notify if changed
        if desiredHeight != previousHeight {
            emitHeightChanged(desiredHeight)
            self.previousHeight = desiredHeight
        }
    }

    private func attachPaymentElementIfAvailable() {
        removePaymentMethodMessagingElement()
        guard let messagingElement = messagingInstance else {
            return
        }

        let messagingElementView = messagingElement.view
        addSubview(messagingElementView)
        messagingElementView.translatesAutoresizingMaskIntoConstraints = false
        let height = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: self.messagingInstance?.view.bounds.width ?? 0, height: UIView.layoutFittingCompressedSize.height)).height
        self.previousHeight = height ?? 0

        emitHeightChanged(height ?? 0)
        NSLayoutConstraint.activate([
            messagingElementView.topAnchor.constraint(equalTo: topAnchor),
            messagingElementView.leadingAnchor.constraint(equalTo: leadingAnchor),
            messagingElementView.trailingAnchor.constraint(equalTo: trailingAnchor),
            messagingElementView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        self.paymentMethodMessagingElementView = messagingElementView
    }

    private func removePaymentMethodMessagingElement() {
        paymentMethodMessagingElementView?.removeFromSuperview()
        paymentMethodMessagingElementView = nil
    }

    private func initMessagingElement(config: NSDictionary) {
        // Cancel any in-flight request unconditionally, before validating the
        // new config. Otherwise an invalid update would return early without
        // cancelling an older, still-running (and now stale) request, letting
        // it complete and commit its result later.
        pendingCreateTask?.cancel()
        pendingCreateTask = nil

        let configResult = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: config)

        if let error = configResult.error {
            emitConfigureResult(status: "failed", message: error["message"] as? String, code: error["code"] as? String)
            return
        }

        guard var configuration = configResult.configuration else {
            return
        }

        // Add appearance if available
        if let appearance = appearanceConfig {
            configuration.appearance = appearance
        }

        var height: CGFloat? = 0

        pendingCreateTask = Task { @MainActor in
            // Bail out immediately if this task was already superseded before
            // it got a chance to run, so we don't emit a spurious "loading"
            // event or kick off an already-pointless create() call.
            guard !Task.isCancelled else { return }

            self.emitConfigureResult(status: "loading")
            let result = await PaymentMethodMessagingElement.create(configuration: configuration)

            // Discard results from a request that's been superseded by a more
            // recent `appearance` or `configuration` prop update.
            guard !Task.isCancelled else { return }

            switch result {
            case .success(let paymentMethodMessagingElement):
                self.messagingInstance = paymentMethodMessagingElement
                height = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: paymentMethodMessagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
                self.emitConfigureResult(status: "loaded")
            case .noContent:
                self.messagingInstance = nil
                self.emitConfigureResult(status: "no_content")
            case .failed(let error):
                self.messagingInstance = nil
                self.emitConfigureResult(status: "failed", message: error.localizedDescription)
            }

            self.emitHeightChanged(height ?? 0)
            attachPaymentElementIfAvailable()
        }
    }

    private func emitConfigureResult(status: String, message: String? = nil, code: String? = nil) {
        var payload: [String: Any] = ["status": status]
        if let message = message {
            payload["message"] = message
        }
        if let code = code {
            payload["code"] = code
        }
        onConfigureResult?(["result": payloadWithViewTag(payload)])
    }

    private func emitHeightChanged(_ height: CGFloat) {
        onHeightChanged?(payloadWithViewTag(["height": height]))
    }

    private func payloadWithViewTag(_ payload: [String: Any]) -> [String: Any] {
        var result = payload
        if let tag = reactTag {
            result["viewTag"] = tag.intValue
        }
        return result
    }

    /// Cancels in-flight create work and drops event callbacks so Fabric recycle
    /// cannot deliver a late completion into the next element's pending slots.
    @objc public func prepareForRecycle() {
        onConfigureResult = nil
        onHeightChanged = nil
        pendingCreateTask?.cancel()
        pendingCreateTask = nil
        removePaymentMethodMessagingElement()
        messagingInstance = nil
        previousHeight = nil
    }
}
