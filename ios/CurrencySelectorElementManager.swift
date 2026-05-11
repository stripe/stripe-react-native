import Foundation

@objc(StripeCurrencySelectorElementManager)
class StripeCurrencySelectorElementManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return StripeCurrencySelectorElementContainerView(frame: .zero)
    }
}
