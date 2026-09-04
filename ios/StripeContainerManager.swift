import Foundation
import React

@objc(StripeContainerManager)
class StripeContainerManager: RCTViewManager {
    override func view() -> UIView! {
        return StripeContainerView()
    }

    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
