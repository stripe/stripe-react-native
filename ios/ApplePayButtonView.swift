import Foundation
import UIKit

@objc(ApplePayButtonView)
class ApplePayButtonView: UIView {
    var applePayButton: PKPaymentButton?
    var stripeSdk: StripeSdk?
    
    @objc var onPressAction: RCTDirectEventBlock?
    @objc var onShippingMethodSelectedAction: RCTDirectEventBlock?
    @objc var onShippingContactSelectedAction: RCTDirectEventBlock?
    @objc var onCouponCodeEnteredAction: RCTDirectEventBlock?
    @objc var onOrderTrackingAction: RCTDirectEventBlock?
    
    @objc var type: NSNumber?
    @objc var buttonStyle: NSNumber?
    @objc var borderRadius: NSNumber?
    @objc var disabled = false
    
    @objc func handleApplePayButtonTapped() {
        stripeSdk?.shippingMethodUpdateJSCallback = onShippingMethodSelectedAction
        stripeSdk?.shippingContactUpdateJSCallback = onShippingContactSelectedAction
        stripeSdk?.couponCodeEnteredJSCallback = onCouponCodeEnteredAction
        stripeSdk?.platformPayOrderTrackingJSCallback = onOrderTrackingAction
    }
    
    override func didSetProps(_ changedProps: [String]!) {
        if let applePayButton = self.applePayButton {
            applePayButton.removeFromSuperview()
        }
        let paymentButtonType = PKPaymentButtonType(rawValue: self.type as? Int ?? 0) ?? .plain
        let paymentButtonStyle = PKPaymentButtonStyle(rawValue: self.buttonStyle as? Int ?? 2) ?? .black
        self.applePayButton = PKPaymentButton(paymentButtonType: paymentButtonType, paymentButtonStyle: paymentButtonStyle)
        if #available(iOS 12.0, *) {
            self.applePayButton?.cornerRadius = self.borderRadius as? CGFloat ?? 4.0
        }

        // Apply corner radius to the button's layer for better visual effect
        if let borderRadius = self.borderRadius as? CGFloat {
            self.applePayButton?.layer.cornerRadius = borderRadius
            self.applePayButton?.layer.masksToBounds = true
        }
        
        if let applePayButton = self.applePayButton {
            applePayButton.isEnabled = !disabled
            applePayButton.addTarget(self, action: #selector(handleApplePayButtonTapped), for: .touchUpInside)
            self.addSubview(applePayButton)
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
    }
    
    override func layoutSubviews() {
        if let applePayButton = self.applePayButton {
            applePayButton.frame = self.bounds
        }
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
