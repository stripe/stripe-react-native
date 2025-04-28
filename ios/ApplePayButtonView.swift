import Foundation
import UIKit

@objc(ApplePayButtonView)
public class ApplePayButtonView: UIView {
    var applePayButton: PKPaymentButton?

    @objc public var onShippingMethodSelectedAction: RCTDirectEventBlock?
    @objc public var onShippingContactSelectedAction: RCTDirectEventBlock?
    @objc public var onCouponCodeEnteredAction: RCTDirectEventBlock?
    @objc public var onOrderTrackingAction: RCTDirectEventBlock?
    
    @objc public var type: NSNumber?
    @objc public var buttonStyle: NSNumber?
    @objc public var borderRadius: NSNumber?
    @objc public var disabled = false
    
    @objc func handleApplePayButtonTapped() {
        StripeSdkImpl.shared.shippingMethodUpdateJSCallback = onShippingMethodSelectedAction
        StripeSdkImpl.shared.shippingContactUpdateJSCallback = onShippingContactSelectedAction
        StripeSdkImpl.shared.couponCodeEnteredJSCallback = onCouponCodeEnteredAction
        StripeSdkImpl.shared.platformPayOrderTrackingJSCallback = onOrderTrackingAction
    }
  
    @objc public func didSetProps() {
        if let applePayButton = self.applePayButton {
            applePayButton.removeFromSuperview()
        }
        let paymentButtonType = PKPaymentButtonType(rawValue: self.type as? Int ?? 0) ?? .plain
        let paymentButtonStyle = PKPaymentButtonStyle(rawValue: self.buttonStyle as? Int ?? 2) ?? .black
        self.applePayButton = PKPaymentButton(paymentButtonType: paymentButtonType, paymentButtonStyle: paymentButtonStyle)
        if #available(iOS 12.0, *) {
            self.applePayButton?.cornerRadius = self.borderRadius as? CGFloat ?? 4.0
        }
        
        if let applePayButton = self.applePayButton {
            applePayButton.isEnabled = !disabled
            applePayButton.addTarget(self, action: #selector(handleApplePayButtonTapped), for: .touchUpInside)
            self.addSubview(applePayButton)
        }
    }
    
    override public func didSetProps(_ changedProps: [String]!) {
        // This is only called on old arch, for new arch didSetProps() will be called
        // by the view component.
        self.didSetProps()
    }
      
    
    override public init(frame: CGRect) {
        super.init(frame: frame)
    }
    
    override public func layoutSubviews() {
        if let applePayButton = self.applePayButton {
            applePayButton.frame = self.bounds
        }
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
