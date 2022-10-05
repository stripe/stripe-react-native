//
//  PushProvisioningUtils.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 6/9/22.
//

import Foundation
import Stripe

internal class PushProvisioningUtils {
    class func canAddCardToWallet(
        last4: String,
        primaryAccountIdentifier: String,
        testEnv: Bool
    ) -> (canAddCard: Bool, status: AddCardToWalletStatus?) {
        if (!PKAddPassesViewController.canAddPasses()) {
            return (false, AddCardToWalletStatus.UNSUPPORTED_DEVICE)
        }
        
        var status : AddCardToWalletStatus? = nil
        var canAddCard = PushProvisioningUtils.canAddPaymentPass(
            primaryAccountIdentifier: primaryAccountIdentifier,
            isTestMode: testEnv)
        
        if (!canAddCard) {
            status = AddCardToWalletStatus.MISSING_CONFIGURATION
        } else {
            switch PushProvisioningUtils.getPassLocation(last4: last4) {
            case .CURRENT_DEVICE:
                canAddCard = false
                status = AddCardToWalletStatus.CARD_ALREADY_EXISTS
            case .PAIRED_DEVICE:
                canAddCard = true
                status = AddCardToWalletStatus.CARD_EXISTS_ON_PAIRED_DEVICE
            case .NONE:
               break
            }
        }

        return (canAddCard, status)
    }
    
    class func canAddPaymentPass(primaryAccountIdentifier: String, isTestMode: Bool) -> Bool {
        if (isTestMode) {
            return STPFakeAddPaymentPassViewController.canAddPaymentPass()
        }
        
        if #available(iOS 13.4, *) {
            return PKPassLibrary().canAddSecureElementPass(primaryAccountIdentifier: primaryAccountIdentifier)
        } else {
            return PKAddPaymentPassViewController.canAddPaymentPass()
        }
    }
    
    class func getPassLocation(last4: String) -> PassLocation {
        let existingPassOnDevice: PKPass? = {
            if #available(iOS 13.4, *) {
                return PKPassLibrary().passes(of: PKPassType.secureElement)
                    .first(where: { $0.secureElementPass?.primaryAccountNumberSuffix == last4 && $0.secureElementPass?.passActivationState != .suspended && !$0.isRemotePass })
            } else {
                return PKPassLibrary().passes(of: PKPassType.payment)
                    .first(where: { $0.paymentPass?.primaryAccountNumberSuffix == last4 && $0.paymentPass?.passActivationState != .suspended && !$0.isRemotePass })
            }
        }()
        
        let existingPassOnPairedDevices: PKPass? = {
            if #available(iOS 13.4, *) {
                return PKPassLibrary().remoteSecureElementPasses
                    .first(where: { $0.secureElementPass?.primaryAccountNumberSuffix == last4 && $0.secureElementPass?.passActivationState != .suspended })
            } else {
                return PKPassLibrary().remotePaymentPasses()
                    .first(where: { $0.paymentPass?.primaryAccountNumberSuffix == last4 && $0.paymentPass?.passActivationState != .suspended })
            }
        }()
        
        return existingPassOnDevice != nil ? PassLocation.CURRENT_DEVICE : (existingPassOnPairedDevices != nil ? PassLocation.PAIRED_DEVICE : PassLocation.NONE)
    }
    
    enum AddCardToWalletStatus: String {
        case UNSUPPORTED_DEVICE
        case MISSING_CONFIGURATION
        case CARD_ALREADY_EXISTS
        case CARD_EXISTS_ON_PAIRED_DEVICE
    }
    
    enum PassLocation: String {
        case CURRENT_DEVICE
        case PAIRED_DEVICE
        case NONE
    }
}
