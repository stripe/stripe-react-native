import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

enum CheckoutSessionSerializer {
    static func serialize(_ session: Checkout.Session) -> [String: Any] {
        var result: [String: Any] = [
            "id": session.id,
            "livemode": session.livemode,
            "orderSummaryItems": session.orderSummaryItems.map(serialize),
            "discountAmounts": session.discountAmounts.map(serialize),
            "totals": serialize(session.totals),
            "status": serialize(session.status),
        ]

        result.setIfPresent("businessName", session.businessName)
        result.setIfPresent("currency", session.currency)
        result.setIfPresent("minorUnitsAmountDivisor", session.minorUnitsAmountDivisor)
        // TODO(porter): Serialize presentmentDetails when the reviewed native field ships.
        result.setIfPresent("email", session.email)
        result.setIfPresent("paymentOption", session.paymentOption.map(serialize))
        result.setIfPresent("shippingAddress", session.shippingAddress.map(serialize))
        result.setIfPresent("tax", serialize(session.tax.status))
        result.setIfPresent("taxAmounts", session.tax.taxAmounts?.map(serialize))
        // TODO(porter): Uncomment when the reviewed native field ships.
        // result.setIfPresent("lastPaymentError", session.lastPaymentError.map(serialize))
        return result
    }

    private static func serialize(
        _ item: Checkout.Session.OrderSummaryItem
    ) -> [String: Any] {
        switch item {
        case .oneTimePrice(let oneTimePrice):
            var result: [String: Any] = [
                "type": "one_time_price",
                "key": oneTimePrice.key,
                "items": oneTimePrice.items.map(serialize),
                "amountDetails": serialize(oneTimePrice.amountDetails),
            ]
            result.setIfPresent("description", oneTimePrice.description)
            return result
        }
    }

    private static func serialize(
        _ item: Checkout.Session.OrderSummaryItem.OneTimePrice.Item
    ) -> [String: Any] {
        var result: [String: Any] = [
            "key": item.key,
            "displayName": item.displayName,
            "images": item.images,
            "unitAmount": serialize(item.unitAmount),
            "quantity": item.quantity,
        ]
        result.setIfPresent("unitAmountDecimal", item.unitAmountDecimal.map(serialize))
        result.setIfPresent("unitLabel", item.unitLabel)
        result.setIfPresent("adjustableQuantity", item.adjustableQuantity.map {
            ["minimum": $0.minimum, "maximum": $0.maximum]
        })
        return result
    }

    private static func serialize(
        _ details: Checkout.Session.OrderSummaryItem.OneTimePrice.AmountDetails
    ) -> [String: Any] {
        var result: [String: Any] = [
            "total": serialize(details.total),
            "subtotal": serialize(details.subtotal),
            "discount": serialize(details.discount),
            "taxInclusive": serialize(details.taxInclusive),
            "taxExclusive": serialize(details.taxExclusive),
        ]
        result.setIfPresent("taxAmounts", details.taxAmounts?.map(serialize))
        return result
    }

    private static func serialize(_ amount: Checkout.Session.Amount) -> [String: Any] {
        [
            "amount": amount.amount,
            "minorUnitsAmount": amount.minorUnitsAmount,
        ]
    }

    private static func serialize(_ amount: Checkout.Session.TaxAmount) -> [String: Any] {
        var result: [String: Any] = [
            "amount": amount.amount,
            "minorUnitsAmount": amount.minorUnitsAmount,
            "inclusive": amount.inclusive,
            "displayName": amount.displayName,
        ]
        result.setIfPresent("percentage", amount.percentage)
        return result
    }

    private static func serialize(_ amount: Checkout.TaxAmount) -> [String: Any] {
        [
            "amount": amount.amount.amount,
            "minorUnitsAmount": amount.amount.minorUnitsAmount,
            "inclusive": amount.inclusive,
            "displayName": amount.displayName,
        ]
    }

    private static func serialize(_ amount: Checkout.DiscountAmount) -> [String: Any] {
        var result: [String: Any] = [
            "amount": amount.amount.amount,
            "minorUnitsAmount": amount.amount.minorUnitsAmount,
            "displayName": amount.displayName,
        ]
        result.setIfPresent("promotionCode", amount.promotionCode)
        // TODO(porter): Uncomment when the reviewed native field ships.
        // result.setIfPresent("percentOff", amount.percentOff)
        return result
    }

    private static func serialize(_ totals: Checkout.Session.Totals) -> [String: Any] {
        [
            "subtotal": serialize(totals.subtotal),
            "taxExclusive": serialize(totals.taxExclusive),
            "taxInclusive": serialize(totals.taxInclusive),
            "discount": serialize(totals.discount),
            "total": serialize(totals.total),
        ]
    }

    private static func serialize(_ status: Checkout.Session.Status) -> [String: Any] {
        switch status {
        case .open:
            return ["type": "open"]
        case .expired:
            return ["type": "expired"]
        case .complete(let paymentStatus):
            return [
                "type": "complete",
                "paymentStatus": serialize(paymentStatus),
            ]
        }
    }

    private static func serialize(
        _ paymentStatus: Checkout.Session.Status.PaymentStatus
    ) -> String {
        switch paymentStatus {
        case .paid: return "paid"
        case .unpaid: return "unpaid"
        case .noPaymentRequired: return "noPaymentRequired"
        }
    }

    private static func serialize(_ taxStatus: Checkout.TaxStatus) -> [String: Any]? {
        switch taxStatus {
        case .ready:
            return ["status": "ready"]
        case .requiresShippingAddress:
            return ["status": "requiresShippingAddress"]
        case .requiresBillingAddress:
            return ["status": "requiresBillingAddress"]
        case .unknown:
            return nil
        }
    }

    private static func serialize(
        _ paymentOption: Checkout.Session.PaymentOptionDisplayData
    ) -> [String: Any] {
        var result: [String: Any] = [
            "image": paymentOption.image.pngData()?.base64EncodedString() ?? "",
            "label": paymentOption.label,
            "paymentMethodType": paymentOption.paymentMethodType,
        ]
        result.setIfPresent("billingDetails", paymentOption.billingDetails.map(serialize))
        result.setIfPresent("mandateHTML", paymentOption.mandateText.map(html))
        return result
    }

    private static func serialize(_ billingDetails: PaymentSheet.BillingDetails) -> [String: Any] {
        var result: [String: Any] = [:]
        result.setIfPresent("name", billingDetails.name)
        result.setIfPresent("email", billingDetails.email)
        result.setIfPresent("phone", billingDetails.phone)
        result.setIfPresent("address", serialize(billingDetails.address))
        return result
    }

    private static func serialize(_ address: PaymentSheet.Address) -> [String: Any]? {
        guard let country = address.country else {
            return nil
        }
        var result: [String: Any] = ["country": country]
        result.setIfPresent("line1", address.line1)
        result.setIfPresent("line2", address.line2)
        result.setIfPresent("city", address.city)
        result.setIfPresent("state", address.state)
        result.setIfPresent("postalCode", address.postalCode)
        return result
    }

    private static func serialize(_ shippingAddress: Checkout.Session.ShippingAddress) -> [String: Any] {
        var result: [String: Any] = ["address": serialize(shippingAddress.address)]
        result.setIfPresent("name", shippingAddress.name)
        return result
    }

    private static func serialize(_ address: Checkout.Address) -> [String: Any] {
        var result: [String: Any] = ["country": address.country]
        result.setIfPresent("line1", address.line1)
        result.setIfPresent("line2", address.line2)
        result.setIfPresent("city", address.city)
        result.setIfPresent("state", address.state)
        result.setIfPresent("postalCode", address.postalCode)
        return result
    }

    private static func html(_ attributedString: NSAttributedString) -> String {
        do {
            let data = try attributedString.data(
                from: NSRange(location: 0, length: attributedString.length),
                documentAttributes: [
                    .documentType: NSAttributedString.DocumentType.html,
                    .characterEncoding: String.Encoding.utf8.rawValue,
                ]
            )
            return String(data: data, encoding: .utf8) ?? attributedString.string
        } catch {
            return attributedString.string
        }
    }
}

private extension Dictionary where Key == String, Value == Any {
    mutating func setIfPresent(_ key: String, _ value: Any?) {
        if let value {
            self[key] = value
        }
    }
}
