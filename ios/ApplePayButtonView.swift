import Foundation
import UIKit

@objc(ApplePayButtonView)
class ApplePayButtonView: UIView {
    let applePayButton: PKPaymentButton = PKPaymentButton(paymentButtonType: .plain, paymentButtonStyle: .black)
    
    @objc var onPay: RCTDirectEventBlock?
    
    @objc func handleApplePayButtonTapped() {
        if onPay != nil {
            onPay!(["true": true])
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        applePayButton.addTarget(self, action: #selector(handleApplePayButtonTapped), for: .touchUpInside)
        self.addSubview(applePayButton)
    }
    
    override func layoutSubviews() {
        applePayButton.frame = self.bounds
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
