//
//  EmbeddedPaymentElementView.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/16/25.
//

import Foundation
import UIKit
@_spi(EmbeddedPaymentElementPrivateBeta) import StripePaymentSheet

@objc(EmbeddedPaymentElementView)
class EmbeddedPaymentElementView: RCTViewManager {
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return EmbeddedPaymentElementContainerView(frame: .zero)
    }
}

@objc(EmbeddedPaymentElementContainerView)
public class EmbeddedPaymentElementContainerView: UIView, UIGestureRecognizerDelegate {
    private var embeddedPaymentElementView: UIView?

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
            // Remove the embedded view when moving away from window
            removePaymentElement()
        }
    }

    private func attachPaymentElementIfAvailable() {
        // Don't attach if already attached
        guard embeddedPaymentElementView == nil,
              let embeddedElement = StripeSdkImpl.shared.embeddedInstance else {
            return
        }

        let paymentElementView = embeddedElement.view
        addSubview(paymentElementView)
        paymentElementView.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            paymentElementView.topAnchor.constraint(equalTo: topAnchor),
            paymentElementView.leadingAnchor.constraint(equalTo: leadingAnchor),
            paymentElementView.trailingAnchor.constraint(equalTo: trailingAnchor),
            paymentElementView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        self.embeddedPaymentElementView = paymentElementView

        // Update the presenting view controller whenever we attach
        updatePresentingViewController()
    }

    private func removePaymentElement() {
        embeddedPaymentElementView?.removeFromSuperview()
        embeddedPaymentElementView = nil
    }

    private func updatePresentingViewController() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            StripeSdkImpl.shared.embeddedInstance?.presentingViewController = RCTPresentedViewController()
        }
    }
}
