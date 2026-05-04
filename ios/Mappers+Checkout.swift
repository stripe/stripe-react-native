//
//  Mappers+Checkout.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/29/26.
//

import Foundation
@_spi(CheckoutSessionsPreview) import StripePaymentSheet

extension Mappers {
    class func mapFromCheckoutState(_ state: Checkout.State) -> NSDictionary {
        return [
            "status": state.isLoading ? "loading" : "loaded",
            "session": mapFromCheckoutSession(state.session),
        ]
    }

    class func mapFromCheckoutSession(_ session: any Checkout.Session) -> NSDictionary {
        let result = NSMutableDictionary()
        result["id"] = session.id
        result["paymentStatus"] = mapFromCheckoutPaymentStatus(session.paymentStatus)
        result["livemode"] = session.livemode
        result["lineItems"] = session.lineItems.map(mapFromCheckoutLineItem)
        result["shippingOptions"] = session.shippingOptions.map(mapFromCheckoutShippingOption)
        result["discounts"] = session.discounts.map(mapFromCheckoutDiscount)

        if let status = mapFromCheckoutStatus(session.status) {
            result["status"] = status
        }

        if let currency = session.currency {
            result["currency"] = currency
        }

        if let totals = session.totals {
            result["totals"] = mapFromCheckoutTotals(totals)
        }

        if let customerId = session.customerId {
            result["customerId"] = customerId
        }

        if let customerEmail = session.customerEmail {
            result["customerEmail"] = customerEmail
        }

        if let billingAddress = session.billingAddress {
            result["billingAddress"] = mapFromCheckoutAddressUpdate(billingAddress)
        }

        if let shippingAddress = session.shippingAddress {
            result["shippingAddress"] = mapFromCheckoutAddressUpdate(shippingAddress)
        }

        return result
    }

    class func mapFromCheckoutAddressUpdate(_ addressUpdate: Checkout.AddressUpdate) -> NSDictionary {
        let result = NSMutableDictionary()
        result["address"] = mapFromCheckoutAddress(addressUpdate.address)

        if let name = addressUpdate.name {
            result["name"] = name
        }

        if let phone = addressUpdate.phone {
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

    private class func mapFromCheckoutTotals(_ totals: Checkout.Totals) -> NSDictionary {
        return [
            "subtotal": totals.subtotal,
            "total": totals.total,
            "due": totals.due,
            "discount": totals.discount,
            "shipping": totals.shipping,
            "tax": totals.tax,
        ]
    }

    private class func mapFromCheckoutLineItem(_ lineItem: Checkout.LineItem) -> NSDictionary {
        return [
            "id": lineItem.id,
            "name": lineItem.name,
            "quantity": lineItem.quantity,
            "unitAmount": lineItem.unitAmount,
            "currency": lineItem.currency,
        ]
    }

    private class func mapFromCheckoutShippingOption(_ shippingOption: Checkout.ShippingOption) -> NSDictionary {
        return [
            "id": shippingOption.id,
            "displayName": shippingOption.displayName,
            "amount": shippingOption.amount,
            "currency": shippingOption.currency,
        ]
    }

    private class func mapFromCheckoutDiscount(_ discount: Checkout.Discount) -> NSDictionary {
        let result = NSMutableDictionary()
        result["coupon"] = mapFromCheckoutCoupon(discount.coupon)
        result["amount"] = discount.amount

        if let promotionCode = discount.promotionCode {
            result["promotionCode"] = promotionCode
        }

        return result
    }

    private class func mapFromCheckoutCoupon(_ coupon: Checkout.Coupon) -> NSDictionary {
        let result = NSMutableDictionary()
        result["id"] = coupon.id

        if let name = coupon.name {
            result["name"] = name
        }

        if let percentOff = coupon.percentOff {
            result["percentOff"] = percentOff
        }

        if let amountOff = coupon.amountOff {
            result["amountOff"] = amountOff
        }

        return result
    }

    private class func mapFromCheckoutStatus(_ status: Checkout.Status?) -> String? {
        switch status {
        case .open:
            return "open"
        case .complete:
            return "complete"
        case .expired:
            return "expired"
        case .unknown:
            return "unknown"
        case nil:
            return nil
        @unknown default:
            return "unknown"
        }
    }

    private class func mapFromCheckoutPaymentStatus(_ paymentStatus: Checkout.PaymentStatus) -> String {
        switch paymentStatus {
        case .paid:
            return "paid"
        case .unpaid:
            return "unpaid"
        case .noPaymentRequired:
            return "noPaymentRequired"
        case .unknown:
            return "unknown"
        @unknown default:
            return "unknown"
        }
    }
}
