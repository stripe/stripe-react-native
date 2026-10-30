import Foundation
import React
@_spi(PaymentMethodMessagingElementPreview) @_spi(STP) import StripePaymentSheet
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

    @objc var appearance: NSDictionary? {
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

    @objc var configuration: NSDictionary? {
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
            StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": desiredHeight])
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

        StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": height ?? 0])
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
        let configResult = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: config)

        if let error = configResult.error {
            StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult([
                "status": "failed",
                "error": error,
            ])
            return
        }

        guard var configuration = configResult.configuration else {
            return
        }

        // Add appearance if available
        if let appearance = appearanceConfig {
            configuration.appearance = appearance
        }

        var resultMap: [String: String] = [:]
        var height: CGFloat? = 0

        pendingCreateTask?.cancel()
        pendingCreateTask = Task { @MainActor in
            StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult(["status": "loading"])
            let result = await PaymentMethodMessagingElement.create(configuration: configuration)

            // Discard results from a request that's been superseded by a more
            // recent `appearance` or `configuration` prop update.
            guard !Task.isCancelled else { return }

            switch result {
            case .success(let paymentMethodMessagingElement):
                self.messagingInstance = paymentMethodMessagingElement
                height = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: paymentMethodMessagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
                resultMap["status"] = "loaded"
            case .noContent:
                resultMap["status"] = "no_content"
                self.messagingInstance = nil
            case .failed(let error):
                self.messagingInstance = nil
                resultMap["status"] = "failed"
                resultMap["message"] = error.localizedDescription
            }

            StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": height ?? 0])
            StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult(resultMap)
            attachPaymentElementIfAvailable()
        }
    }
}
