//
//  PKPaymentPassFinder.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 10/6/22.
//

import Foundation

internal class PaymentPassFinder {
    enum PassLocation: String {
        case CURRENT_DEVICE
        case PAIRED_DEVICE
    }
    
    class func findPassWithLast4(last4: String, completion: @escaping ((Bool, [PassLocation]) -> Void)) {
        let existingPassOnDevice: PKPass? = {
            if #available(iOS 13.4, *) {
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
        
        completion(
            passLocations.count < 2,
            passLocations
        )
    }
}
