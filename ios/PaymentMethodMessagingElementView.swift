
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
        // Don't attach if already attached
        guard paymentMethodMessagingElementView == nil,
        // TODO UPDATE
              let messagingElement = StripeSdkImpl.shared.messagingInstance else {
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
        updatePresentingViewController()
    }

    private func removePaymentMethodMessagingElement() {
        paymentMethodMessagingElementView?.removeFromSuperview()
        paymentMethodMessagingElementView = nil
    }

    private func updatePresentingViewController() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            StripeSdkImpl.shared.embeddedInstance?.presentingViewController = RCTPresentedViewController()
        }
    }
}
