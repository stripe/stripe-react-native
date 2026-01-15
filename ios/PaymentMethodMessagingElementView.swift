
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
                // Configuration is now accessible here
                print("Configuration received:", configuration)
                initMessagingElement(config: configuration)
                // You can use the configuration to customize the view or pass it to native methods
            }
        }
    }

    @objc var appearance: NSDictionary? {
        didSet {
            if let appearance = appearance {
                // Appearance is now accessible here
                print("Appearance received:", appearance)
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

        // Update the presenting view controller whenever we attach
        //updatePresentingViewController()
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
        
        Task {
            do {
                switch await PaymentMethodMessagingElement.create(configuration: configuration) {
                case .success(let paymentMethodMessagingElement):
                    self.messagingInstance = paymentMethodMessagingElement
                    
                    // success: resolve promise
                    let newHeight = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: paymentMethodMessagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
                    StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": newHeight ?? 0])
                    
                    // publish initial state
                case .noContent:
                    // No element is available to display with this configuration
                    // You may want to adapt your UI accordingly
                    // ...
                    self.messagingInstance = nil
                case .failed(let error):
                    // An unrecoverable error has occurred while attempting to load the element
                    // You may want to log the error or take other action
                    // ...
                    self.messagingInstance = nil
                }
                attachPaymentElementIfAvailable()
            } catch {
                
                // 2) emit a loading‐failed event with the error message
                let msg = error.localizedDescription
                //self.emitter?.emitEmbeddedPaymentElementLoadingFailed(["message": msg])
            }
        }
    }
}
