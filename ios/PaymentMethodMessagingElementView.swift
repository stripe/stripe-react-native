
import Foundation
@_spi(PaymentMethodMessagingElementPreview) import StripePaymentSheet
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

    @objc var configuration: NSDictionary? {
        didSet {
            if let configuration = configuration {
                print("Configuration received:", configuration)
                initMessagingElement(config: configuration)
            }
        }
    }

    @objc var onLoadComplete: RCTDirectEventBlock?

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
        // remove previous view
        //removePaymentMethodMessagingElement()
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
    

    private func buildPaymentMethodMessagingElementConfiguration(
        params: NSDictionary
    ) -> (error: NSDictionary?, configuration: PaymentMethodMessagingElement.Configuration?) {
        
        let amount = params["amount"] as? Int ?? 0
        
        let configuration = PaymentMethodMessagingElement.Configuration(
            amount: amount, currency: "usd"
        )
        
        return (nil, configuration)
    }
    
    private func initMessagingElement(config: NSDictionary) {
        guard let configuration = buildPaymentMethodMessagingElementConfiguration(params: config).configuration else {
            return
        }
        
        var result: String?
        var height: CGFloat? = 0
        
        Task {
            do {
                switch await PaymentMethodMessagingElement.create(configuration: configuration) {
                case .success(let paymentMethodMessagingElement):
                    self.messagingInstance = paymentMethodMessagingElement
                    height = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: paymentMethodMessagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
                    result = "success"
                case .noContent:
                    result = "no_content"
                    self.messagingInstance = nil
                case .failed(let error):
                    self.messagingInstance = nil
                    result = "failed"
                }
                StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": height ?? 0])
                StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult(["result": result ?? "unknown"])
                attachPaymentElementIfAvailable()
            }
        }
    }
}
