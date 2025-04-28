//
//  PaymentOptionDisplayData+ReactNative.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/16/25.
//

import Foundation
@_spi(EmbeddedPaymentElementPrivateBeta) import StripePaymentSheet

extension EmbeddedPaymentElement.PaymentOptionDisplayData {
    /// Convert `PaymentOptionDisplayData` into a dictionary compatible with React Native bridge.
    func toDictionary() -> [String: Any] {
        // Convert UIImage to Base64
        let imageBase64: String = {
            guard let data = image.pngData() else { return "" }
            return data.base64EncodedString()
        }()
        
        // Convert BillingDetails to a dictionary
        let billingDetailsDict: [String: Any] = {
            guard let billing = billingDetails else {
                return [:]
            }
            
            // Extract address
            let addressDict: [String: Any] = {
                let addr = billing.address
                return [
                    "city": addr.city ?? "",
                    "country": addr.country ?? "",
                    "line1": addr.line1 ?? "",
                    "line2": addr.line2 ?? "",
                    "postalCode": addr.postalCode ?? "",
                    "state": addr.state ?? ""
                ]
            }()
            
            return [
                "name": billing.name ?? "",
                "email": billing.email ?? "",
                "phone": billing.phone ?? "",
                "address": addressDict
            ]
        }()
        
        // Return as a dictionary
        return [
            "image": imageBase64,
            "label": label,
            "billingDetails": billingDetailsDict,
            "paymentMethodType": paymentMethodType
        ]
    }
}
