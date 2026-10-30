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

@MainActor
protocol PaymentMethodMessagingElementInstance {
    var view: UIView { get }
}

extension PaymentMethodMessagingElement: PaymentMethodMessagingElementInstance {}

enum PaymentMethodMessagingElementLoadResult {
    case success(PaymentMethodMessagingElementInstance)
    case noContent
    case failed(Error)
}

@objc(PaymentMethodMessagingElementContainerView)
public class PaymentMethodMessagingElementContainerView: UIView, UIGestureRecognizerDelegate {
    private var paymentMethodMessagingElementView: UIView?
    private var messagingInstance: PaymentMethodMessagingElementInstance?
    private var appearanceConfig: PaymentMethodMessagingElement.Appearance?
    private var lastConfig: NSDictionary?
    private var configurationGeneration = 0
    private(set) var configurationTask: Task<Void, Never>?

    var createMessagingElement: @MainActor (PaymentMethodMessagingElement.Configuration) async -> PaymentMethodMessagingElementLoadResult = { configuration in
        switch await PaymentMethodMessagingElement.create(configuration: configuration) {
        case .success(let element):
            return .success(element)
        case .noContent:
            return .noContent
        case .failed(let error):
            return .failed(error)
        }
    }
    var emitHeight: ([String: Any]) -> Void = {
        StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight($0)
    }
    var emitConfigureResult: ([String: Any]) -> Void = {
        StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult($0)
    }

    // Used to track height updates
    private var previousHeight: CGFloat?

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
            emitHeight(["height": desiredHeight])
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

        emitHeight(["height": height ?? 0])
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
        // Invalidate older loads even when the new configuration fails validation.
        configurationGeneration += 1
        let generation = configurationGeneration
        let configResult = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: config)

        if let error = configResult.error {
            emitConfigureResult([
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

        configurationTask = Task { @MainActor in
            guard generation == self.configurationGeneration else { return }
            self.emitConfigureResult(["status": "loading"])
            let result = await self.createMessagingElement(configuration)
            // Awaiting creation allows newer prop updates to start another load.
            guard generation == self.configurationGeneration else { return }

            var resultMap: [String: String] = [:]
            var height: CGFloat? = 0
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

            self.emitHeight(["height": height ?? 0])
            self.emitConfigureResult(resultMap)
            attachPaymentElementIfAvailable()
        }
    }
}
