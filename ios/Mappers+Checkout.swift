//
//  Mappers+Checkout.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/29/26.
//

import Foundation
@_spi(ReactNativeSDK) import StripePaymentSheet

extension Mappers {

    // MARK: - State & Session

    class func mapFromCheckoutState(_ state: Checkout.State) -> NSDictionary {
        [
            "status": state.isLoading ? "loading" : "loaded",
            "session": mapFromCheckoutSession(state.session),
        ]
    }

    class func mapFromCheckoutSession(_ session: Checkout.Session) -> NSDictionary {
        let result = NSMutableDictionary()
        result["id"] = session.id
        result["livemode"] = session.livemode
        result["lineItems"] = session.lineItems.map(mapFromLineItem)
        result["shippingOptions"] = session.shippingOptions.map(mapFromShippingOption)
        result["discountAmounts"] = session.discountAmounts.map(mapFromDiscountAmount)
        result["currencyOptions"] = session.currencyOptions.map(mapFromCurrencyOption)
        result["tax"] = mapFromTax(session.tax)

        if let businessName = session.businessName {
            result["businessName"] = businessName
        }
        if let currency = session.currency {
            result["currency"] = currency
        }
        if let email = session.email {
            result["email"] = email
        }
        if let minorUnitsAmountDivisor = session.minorUnitsAmountDivisor {
            result["minorUnitsAmountDivisor"] = minorUnitsAmountDivisor
        }
        if let status = session.status {
            result["status"] = mapFromStatus(status)
        }
        if let total = session.total {
            result["total"] = mapFromTotal(total)
        }
        if let shipping = session.shipping {
            result["shipping"] = mapFromSelectedShipping(shipping)
        }
        if let billingAddress = session.billingAddress {
            result["billingAddress"] = mapFromContactAddress(billingAddress)
        }
        if let shippingAddress = session.shippingAddress {
            result["shippingAddress"] = mapFromContactAddress(shippingAddress)
        }

        return result
    }

    // MARK: - Amount

    class func mapFromAmount(_ amount: Checkout.Amount) -> NSDictionary {
        [
            "amount": amount.amount,
            "minorUnitsAmount": amount.minorUnitsAmount,
        ]
    }

    class func mapFromDecimalAmount(_ decimalAmount: Checkout.DecimalAmount) -> NSDictionary {
        [
            "amount": decimalAmount.amount,
            "minorUnitsAmount": NSDecimalNumber(decimal: decimalAmount.minorUnitsAmount).doubleValue,
        ]
    }

    // MARK: - Status

    class func mapFromStatus(_ status: Checkout.Status) -> NSDictionary {
        let result = NSMutableDictionary()
        result["type"] = mapFromStatusType(status.type)

        if let paymentStatus = status.paymentStatus {
            result["paymentStatus"] = mapFromPaymentStatus(paymentStatus)
        }

        return result
    }

    private class func mapFromStatusType(_ type: Checkout.StatusType) -> String {
        switch type {
        case .open: return "open"
        case .complete: return "complete"
        case .expired: return "expired"
        case .unknown: return "unknown"
        @unknown default: return "unknown"
        }
    }

    private class func mapFromPaymentStatus(_ paymentStatus: Checkout.PaymentStatus) -> String {
        switch paymentStatus {
        case .paid: return "paid"
        case .unpaid: return "unpaid"
        case .noPaymentRequired: return "noPaymentRequired"
        case .unknown: return "unknown"
        @unknown default: return "unknown"
        }
    }

    // MARK: - Total

    class func mapFromTotal(_ total: Checkout.Total) -> NSDictionary {
        [
            "subtotal": mapFromAmount(total.subtotal),
            "taxExclusive": mapFromAmount(total.taxExclusive),
            "taxInclusive": mapFromAmount(total.taxInclusive),
            "shippingRate": mapFromAmount(total.shippingRate),
            "discount": mapFromAmount(total.discount),
            "total": mapFromAmount(total.total),
            "appliedBalance": mapFromAmount(total.appliedBalance),
            "balanceAppliedToNextInvoice": total.balanceAppliedToNextInvoice,
        ]
    }

    // MARK: - Tax

    class func mapFromTax(_ tax: Checkout.Tax) -> NSDictionary {
        let result = NSMutableDictionary()
        result["status"] = mapFromTaxStatus(tax.status)

        if let taxAmounts = tax.taxAmounts {
            result["taxAmounts"] = taxAmounts.map(mapFromTaxAmount)
        }

        return result
    }

    private class func mapFromTaxStatus(_ status: Checkout.TaxStatus) -> String {
        switch status {
        case .ready: return "ready"
        case .requiresShippingAddress: return "requiresShippingAddress"
        case .requiresBillingAddress: return "requiresBillingAddress"
        case .unknown: return "unknown"
        @unknown default: return "unknown"
        }
    }

    private class func mapFromTaxAmount(_ taxAmount: Checkout.TaxAmount) -> NSDictionary {
        [
            "amount": mapFromAmount(taxAmount.amount),
            "inclusive": taxAmount.inclusive,
            "displayName": taxAmount.displayName,
        ]
    }

    // MARK: - Line Items

    class func mapFromLineItem(_ lineItem: Checkout.LineItem) -> NSDictionary {
        let result = NSMutableDictionary()
        result["id"] = lineItem.id
        result["name"] = lineItem.name
        result["images"] = lineItem.images
        result["quantity"] = lineItem.quantity
        result["discountAmounts"] = lineItem.discountAmounts.map(mapFromDiscountAmount)
        result["taxAmounts"] = lineItem.taxAmounts.map(mapFromTaxAmount)

        if let description = lineItem.description {
            result["description"] = description
        }
        if let unitAmount = lineItem.unitAmount {
            result["unitAmount"] = mapFromAmount(unitAmount)
        }
        if let unitAmountDecimal = lineItem.unitAmountDecimal {
            result["unitAmountDecimal"] = mapFromDecimalAmount(unitAmountDecimal)
        }
        if let subtotal = lineItem.subtotal {
            result["subtotal"] = mapFromAmount(subtotal)
        }
        if let discount = lineItem.discount {
            result["discount"] = mapFromAmount(discount)
        }
        if let taxExclusive = lineItem.taxExclusive {
            result["taxExclusive"] = mapFromAmount(taxExclusive)
        }
        if let taxInclusive = lineItem.taxInclusive {
            result["taxInclusive"] = mapFromAmount(taxInclusive)
        }
        if let total = lineItem.total {
            result["total"] = mapFromAmount(total)
        }
        if let adjustableQuantity = lineItem.adjustableQuantity {
            result["adjustableQuantity"] = mapFromAdjustableQuantity(adjustableQuantity)
        }

        return result
    }

    private class func mapFromAdjustableQuantity(_ adjustableQuantity: Checkout.AdjustableQuantity) -> NSDictionary {
        [
            "minimum": adjustableQuantity.minimum,
            "maximum": adjustableQuantity.maximum,
        ]
    }

    // MARK: - Shipping

    class func mapFromShippingOption(_ shippingOption: Checkout.ShippingOption) -> NSDictionary {
        let result = NSMutableDictionary()
        result["id"] = shippingOption.id
        result["amount"] = mapFromAmount(shippingOption.amount)
        result["currency"] = shippingOption.currency

        if let displayName = shippingOption.displayName {
            result["displayName"] = displayName
        }
        if let deliveryEstimate = shippingOption.deliveryEstimate {
            result["deliveryEstimate"] = mapFromDeliveryEstimate(deliveryEstimate)
        }

        return result
    }

    private class func mapFromDeliveryEstimate(_ estimate: Checkout.DeliveryEstimate) -> NSDictionary {
        let result = NSMutableDictionary()

        if let minimum = estimate.minimum {
            result["minimum"] = mapFromDeliveryEstimateBound(minimum)
        }
        if let maximum = estimate.maximum {
            result["maximum"] = mapFromDeliveryEstimateBound(maximum)
        }

        return result
    }

    private class func mapFromDeliveryEstimateBound(_ bound: Checkout.DeliveryEstimate.Bound) -> NSDictionary {
        [
            "unit": mapFromDeliveryEstimateUnit(bound.unit),
            "value": bound.value,
        ]
    }

    private class func mapFromDeliveryEstimateUnit(_ unit: Checkout.DeliveryEstimate.Bound.Unit) -> String {
        switch unit {
        case .hour: return "hour"
        case .day: return "day"
        case .businessDay: return "businessDay"
        case .week: return "week"
        case .month: return "month"
        case .unknown: return "unknown"
        @unknown default: return "unknown"
        }
    }

    class func mapFromSelectedShipping(_ selectedShipping: Checkout.SelectedShipping) -> NSDictionary {
        [
            "shippingOption": mapFromShippingOption(selectedShipping.shippingOption),
            "taxAmounts": selectedShipping.taxAmounts.map(mapFromTaxAmount),
        ]
    }

    // MARK: - Discounts

    class func mapFromDiscountAmount(_ discountAmount: Checkout.DiscountAmount) -> NSDictionary {
        let result = NSMutableDictionary()
        result["amount"] = mapFromAmount(discountAmount.amount)
        result["displayName"] = discountAmount.displayName

        if let promotionCode = discountAmount.promotionCode {
            result["promotionCode"] = promotionCode
        }

        return result
    }

    // MARK: - Currency Options

    class func mapFromCurrencyOption(_ currencyOption: Checkout.CurrencyOption) -> NSDictionary {
        let result = NSMutableDictionary()
        result["amount"] = mapFromAmount(currencyOption.amount)
        result["currency"] = currencyOption.currency

        if let currencyConversion = currencyOption.currencyConversion {
            result["currencyConversion"] = mapFromCurrencyConversion(currencyConversion)
        }

        return result
    }

    private class func mapFromCurrencyConversion(_ conversion: Checkout.CurrencyConversion) -> NSDictionary {
        [
            "fxRate": conversion.fxRate,
            "sourceCurrency": conversion.sourceCurrency,
        ]
    }

    // MARK: - Address

    class func mapFromContactAddress(_ contactAddress: Checkout.ContactAddress) -> NSDictionary {
        let result = NSMutableDictionary()
        result["address"] = mapFromCheckoutAddress(contactAddress.address)

        if let name = contactAddress.name {
            result["name"] = name
        }
        if let phone = contactAddress.phone {
            result["phone"] = phone
        }

        return result
    }

    private class func mapFromCheckoutAddress(_ address: Checkout.Address) -> NSDictionary {
        let result = NSMutableDictionary()
        result["country"] = address.country

        if let line1 = address.line1 {
            result["line1"] = line1
        }
        if let line2 = address.line2 {
            result["line2"] = line2
        }
        if let city = address.city {
            result["city"] = city
        }
        if let state = address.state {
            result["state"] = state
        }
        if let postalCode = address.postalCode {
            result["postalCode"] = postalCode
        }

        return result
    }
}
