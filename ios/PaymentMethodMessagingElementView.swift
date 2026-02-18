import Foundation
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

    private func attachPaymentElementIfAvailable() {
        removePaymentMethodMessagingElement()
        guard let messagingElement = messagingInstance else {
            return
        }

        let messagingElementView = messagingElement.view
        addSubview(messagingElementView)
        messagingElementView.translatesAutoresizingMaskIntoConstraints = false

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

        Task {
            do {
                StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult(["status": "loading"])
                switch await PaymentMethodMessagingElement.create(configuration: configuration) {
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
}
