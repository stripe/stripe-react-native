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
    return EmbeddedPaymentElementContainerView(frame: .zero, stripeSdk: bridge.module(forName: "StripeSdk") as! StripeSdk)
  }
}

class EmbeddedPaymentElementContainerView: UIView, UIGestureRecognizerDelegate {
  private let tapGesture = UITapGestureRecognizer()
  private let stripeSdk: StripeSdk

  init(frame: CGRect, stripeSdk: StripeSdk) {
    self.stripeSdk = stripeSdk
    super.init(frame: frame)
    backgroundColor = .clear
    attachPaymentElementIfAvailable()
  }

  required init?(coder: NSCoder) {
    fatalError()
  }

  private func attachPaymentElementIfAvailable() {
    guard let embeddedElement = stripeSdk.embeddedInstance else { return }
    let paymentElementView = embeddedElement.view
    addSubview(paymentElementView)
    paymentElementView.translatesAutoresizingMaskIntoConstraints = false

    NSLayoutConstraint.activate([
      paymentElementView.topAnchor.constraint(equalTo: topAnchor),
      paymentElementView.leftAnchor.constraint(equalTo: leftAnchor),
      paymentElementView.rightAnchor.constraint(equalTo: rightAnchor),
      paymentElementView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }
}
