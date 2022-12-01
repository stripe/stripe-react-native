//
//  PKPaymentPassFinder.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 10/6/22.
//

import Foundation
import WatchConnectivity

internal class PaymentPassFinder: NSObject {
    enum PassLocation: String {
        case CURRENT_DEVICE
        case PAIRED_DEVICE
    }
    private var last4: String
    private var findPassOnWatchCompletion: ((Bool, [PassLocation]) -> Void)
    
    init(last4: String, completion: @escaping ((Bool, [PassLocation]) -> Void)) {
        self.last4 = last4
        self.findPassOnWatchCompletion = completion
        super.init()
    }
    
    func findPassWithLast4() {
    
        
        if WCSession.isSupported() { // check if the device support to handle an Apple Watch
            let session = WCSession.default
            session.delegate = self
            session.activate() // activate the session

            if session.isPaired { // Check if the iPhone is paired with the Apple Watch
                    // Do stuff
            }
        }
        
        
    }
}

extension PaymentPassFinder: WCSessionDelegate {

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {}

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        let existingPassOnDevice: PKPass? = {
            if #available(iOS 13.4, *) {
                let allpasses = PKPassLibrary().passes()
                print(allpasses)
                
                return PKPassLibrary().passes(of: PKPassType.secureElement)
                    .first(where: { $0.secureElementPass?.primaryAccountNumberSuffix == last4 && $0.secureElementPass?.passActivationState != .deactivated && !$0.isRemotePass })
            } else {
                return PKPassLibrary().passes(of: PKPassType.payment)
                    .first(where: { $0.paymentPass?.primaryAccountNumberSuffix == last4 && $0.paymentPass?.passActivationState != .deactivated && !$0.isRemotePass })
            }
        }()
        
        let existingPassOnPairedDevices: PKPass? = {
            if #available(iOS 13.4, *) {
                return PKPassLibrary().remoteSecureElementPasses
                    .first(where: { $0.secureElementPass?.primaryAccountNumberSuffix == last4 && $0.secureElementPass?.passActivationState != .deactivated })
            } else {
                return PKPassLibrary().remotePaymentPasses()
                    .first(where: { $0.paymentPass?.primaryAccountNumberSuffix == last4 && $0.paymentPass?.passActivationState != .deactivated })
            }
        }()
        
        var passLocations: [PassLocation] = []
        if (existingPassOnDevice != nil) {
            passLocations.append(.CURRENT_DEVICE)
        }
        if (existingPassOnPairedDevices != nil) {
            passLocations.append(.PAIRED_DEVICE)
        }
        
        if activationState == .activated && session.isPaired {
            findPassOnWatchCompletion(
                passLocations.count < 2,
                passLocations
            )
        } else {
            findPassOnWatchCompletion(
                passLocations.count < 1,
                passLocations
            )
        }
    }

}
