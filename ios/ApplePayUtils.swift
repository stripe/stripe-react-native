//
//  ApplePayUtils.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 6/27/22.
//

import Foundation
import Stripe

class ApplePayUtils {
    
    private class func createDeferredPaymentSummaryItem(item: [String : Any]) throws -> PKPaymentSummaryItem {
        let label = item["label"] as? String ?? ""
        let amount = NSDecimalNumber(string: item["amount"] as? String ?? "")
        
        if #available(iOS 15.0, *) {
            let deferredItem = PKDeferredPaymentSummaryItem(
                label: label,
                amount: amount
            )
            guard let date = item["deferredDate"] as? Double else {
                throw ApplePayUtilsError.missingParameter(label, "deferredDate")
            }
            deferredItem.deferredDate = Date(timeIntervalSince1970: date)
            return deferredItem
        } else {
            return createImmediatePaymentSummaryItem(item: item)
        }
    }
    
    private class func createRecurringPaymentSummaryItem(item: [String : Any]) throws -> PKPaymentSummaryItem {
        let label = item["label"] as? String ?? ""
        let amount = NSDecimalNumber(string: item["amount"] as? String ?? "")
        
        if #available(iOS 15.0, *) {
            let recurringItem = PKRecurringPaymentSummaryItem(
                label: label,
                amount: amount
            )
            guard let intervalCount = item["intervalCount"] as? Int else {
                throw ApplePayUtilsError.missingParameter(label, "intervalCount")
            }
            recurringItem.intervalCount = intervalCount
            recurringItem.intervalUnit = try mapToIntervalUnit(intervalString: item["intervalUnit"] as? String)
            if let startDate = item["startDate"] as? Double {
                recurringItem.startDate = Date(timeIntervalSince1970: startDate)
            }
            if let endDate = item["endDate"] as? Double {
                recurringItem.endDate = Date(timeIntervalSince1970: endDate)
            }
            return recurringItem
        } else {
            return createImmediatePaymentSummaryItem(item: item)
        }
    }
    
    private class func mapToIntervalUnit(intervalString: String?) throws -> NSCalendar.Unit {
        switch intervalString {
        case "minute":
            return NSCalendar.Unit.minute
        case "hour":
            return NSCalendar.Unit.hour
        case "day":
            return NSCalendar.Unit.day
        case "month":
            return NSCalendar.Unit.month
        case "year":
            return NSCalendar.Unit.year
        default:
            throw ApplePayUtilsError.invalidTimeInterval(intervalString ?? "null")
        }
    }
    
    private class func createImmediatePaymentSummaryItem(item: [String : Any]) -> PKPaymentSummaryItem {
        let label = item["label"] as? String ?? ""
        let amount = NSDecimalNumber(string: item["amount"] as? String ?? "")
        
        return PKPaymentSummaryItem(
            label: label,
            amount: amount,
            type: item["isPending"] as? Bool ?? false ?
                PKPaymentSummaryItemType.pending : PKPaymentSummaryItemType.final
        )
    }
    
    public class func buildPaymentSummaryItems(items: [[String : Any]]?) throws -> [PKPaymentSummaryItem] {
        var paymentSummaryItems: [PKPaymentSummaryItem] = []
        if let items = items {
            for item in items {
                let paymentSummaryItem: PKPaymentSummaryItem = try {
                    switch item["type"] as? String {
                    case "Deferred":
                        return try createDeferredPaymentSummaryItem(item: item)
                    case "Recurring":
                        return try createRecurringPaymentSummaryItem(item: item)
                    case "Immediate":
                        fallthrough
                    default:
                        return createImmediatePaymentSummaryItem(item: item)
                    }
                }()
                paymentSummaryItems.append(paymentSummaryItem)
            }
        }
        
        return paymentSummaryItems
    }
    
    public class func buildPaymentSheetApplePayConfig(
        merchantIdentifier: String?,
        merchantCountryCode: String?,
        paymentSummaryItems: [[String : Any]]?
    ) throws -> PaymentSheet.ApplePayConfiguration {
        guard let merchantId = merchantIdentifier else {
            throw ApplePayUtilsError.missingMerchantId
        }
        guard let countryCode = merchantCountryCode else {
            throw ApplePayUtilsError.missingCountryCode
        }
        let paymentSummaryItems = try ApplePayUtils.buildPaymentSummaryItems(
            items: paymentSummaryItems
        )
        return PaymentSheet.ApplePayConfiguration.init(
            merchantId: merchantId,
            merchantCountryCode: countryCode,
            paymentSummaryItems:paymentSummaryItems.count > 0 ? paymentSummaryItems : nil
        )
    }
}

enum ApplePayUtilsError : Error {
    case missingParameter(String, String)
    case invalidTimeInterval(String)
    case missingMerchantId
    case missingCountryCode
}
    
extension ApplePayUtilsError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .missingParameter(let label, let parameter):
            return "Failed to create Apple Pay summary item with label: \(label). The \(parameter) item parameter is required, but none was provided."
        case .invalidTimeInterval(let providedInterval):
            return "Failed to create Apple Pay summary item. \(providedInterval) is not a valid timeInterval, must be one of: minute, hour, day, month, or year."
        case .missingMerchantId:
            return "`merchantIdentifier` is required, but none was found. Ensure you are passing this to initStripe your StripeProvider."
        case .missingCountryCode:
            return "`merchantCountryCode` is a required param, but was not provided."
        }
    }
}