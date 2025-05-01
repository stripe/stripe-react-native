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
  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    attachPaymentElementIfAvailable()
  }

  required init?(coder: NSCoder) {
    fatalError()
  }

  private func attachPaymentElementIfAvailable() {
    guard let embeddedElement = StripeSdkImpl.shared.embeddedInstance else { return }
    let paymentElementView = embeddedElement.view
    addSubview(paymentElementView)
    paymentElementView.translatesAutoresizingMaskIntoConstraints = false

    NSLayoutConstraint.activate([
      paymentElementView.topAnchor.constraint(equalTo: topAnchor),
      paymentElementView.leadingAnchor.constraint(equalTo: leadingAnchor),
      paymentElementView.trailingAnchor.constraint(equalTo: trailingAnchor),
      paymentElementView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }
}
