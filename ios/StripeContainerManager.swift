import Foundation

@objc(StripeContainerManager)
class StripeContainerManager: RCTViewManager {
    override func view() -> UIView! {
        return StripeContainerView()
    }

    @objc func updateFromManager(_ node: NSNumber) {
//        DispatchQueue.main.async {
//            let cardFieldManager = self.bridge.module(forName: "CardFieldManager") as? CardFieldManager
//            cardFieldManager?.blur()
//        }
    }
        
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
