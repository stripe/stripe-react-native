import Foundation

@objc(StripeProviderManager)
class StripeProviderManager: RCTViewManager {
    override func view() -> UIView! {
        return StripeProviderView()
    }
        
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
