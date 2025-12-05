//
//  ConnectAccountOnboardingViewManager.swift
//  stripe-react-native
//

import Foundation

@objc(ConnectAccountOnboardingViewManager)
class ConnectAccountOnboardingViewManager: RCTViewManager {
    override func view() -> UIView! {
        return ConnectAccountOnboardingView()
    }

    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
}
