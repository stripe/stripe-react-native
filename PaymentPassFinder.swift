//
//  PKPaymentPassFinder.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 10/6/22.
//

import Foundation
import WatchConnectivity

internal class PaymentPassFinder: NSObject, WCSessionDelegate {
    enum PassLocation: String {
        case CURRENT_DEVICE
        case PAIRED_DEVICE
    }
    
    private var last4: String
    private var findPassOnWatchCompletion: ((Bool, [PassLocation]) -> Void)
    private var isPassOnCurrentDevice: Bool = false

    init(last4: String, completion: @escaping ((Bool, [PassLocation]) -> Void)) {
        self.last4 = last4
        self.findPassOnWatchCompletion = completion
        super.init()
        
        let existingPassOnDevice: PKPass? = {
            if #available(iOS 13.4, *) {
                return PKPassLibrary().passes(of: PKPassType.secureElement)
                    .first(where: { $0.secureElementPass?.primaryAccountNumberSuffix == last4 && $0.secureElementPass?.passActivationState != .suspended && !$0.isRemotePass })
            } else {
                return PKPassLibrary().passes(of: PKPassType.payment)
                    .first(where: { $0.paymentPass?.primaryAccountNumberSuffix == last4 && $0.paymentPass?.passActivationState != .suspended && !$0.isRemotePass })
            }
        }()
        
        self.isPassOnCurrentDevice = existingPassOnDevice != nil
        
        if WCSession.isSupported() {
            findPassOnWatchCompletion = completion
            let session = WCSession.default
            session.delegate = self
            session.activate()
        } else {
            completion(!isPassOnCurrentDevice, isPassOnCurrentDevice ? [PassLocation.CURRENT_DEVICE] : [])
        }
    }
    
    // no paired device: return pass on device (if exists), canAddPass = !ifExists
    // paired device, no pass: return pass on device, canAddPass = true
    // paried device, pass: return pass on paired device, return pass on device (if exists) canAddPass = !ifExists
    
    
    // START: WCSessionDelegate methods
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            let existingPassOnPairedDevices: PKPass? = {
                if #available(iOS 13.4, *) {
                    return PKPassLibrary().remoteSecureElementPasses
                        .first(where: { $0.secureElementPass?.primaryAccountNumberSuffix == last4 && $0.secureElementPass?.passActivationState != .suspended })
                } else {
                    return PKPassLibrary().remotePaymentPasses()
                        .first(where: { $0.paymentPass?.primaryAccountNumberSuffix == last4 && $0.paymentPass?.passActivationState != .suspended })
                }
            }()
            
            var passLocations: [PassLocation] = []
            if (isPassOnCurrentDevice) {
                passLocations.append(.CURRENT_DEVICE)
            }
            if (existingPassOnPairedDevices != nil) {
                passLocations.append(.PAIRED_DEVICE)
            }
            
            findPassOnWatchCompletion(
                passLocations.count < 2,
                passLocations
            )
        } else {
            findPassOnWatchCompletion(!isPassOnCurrentDevice, isPassOnCurrentDevice ? [PassLocation.CURRENT_DEVICE] : [])
        }
    }
    
    func sessionDidBecomeInactive(_ session: WCSession) {}
    
    func sessionDidDeactivate(_ session: WCSession) {}
    
    // END: WCSessionDelegate methods
}
