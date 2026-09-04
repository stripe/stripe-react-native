import Foundation
import React

@objc(ApplePayButtonManager)
class ApplePayButtonManager: RCTViewManager {
    override func view() -> UIView! {
        return ApplePayButtonView(frame: CGRect.init())
    }

    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
}
