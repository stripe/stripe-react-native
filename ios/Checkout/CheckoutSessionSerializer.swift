import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

@MainActor
enum CheckoutSessionSerializer {
    static func serialize(_ session: CheckoutController.Session) -> [String: Any] {
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
        result.setIfPresent("presentmentDetails", session.presentmentDetails.map {
            ["presentmentCurrency": $0.presentmentCurrency]
        })
        result.setIfPresent("email", session.email)
        result.setIfPresent("paymentOption", session.paymentOption.map(serialize))
        result.setIfPresent("shippingAddress", session.shippingAddress.map(serialize))
        result.setIfPresent("tax", session.tax.map { serialize($0.status) })
        result.setIfPresent("taxAmounts", session.taxAmounts?.map(serialize))
        return result
    }

    private static func serialize(
        _ item: CheckoutController.Session.OrderSummaryItem
    ) -> [String: Any] {
        switch item {
        case .oneTimePrice(let oneTimePrice):
            var result: [String: Any] = [
                "type": "one_time_price",
                "key": oneTimePrice.key,
                "items": oneTimePrice.items.map(serialize),
            ]
            result.setIfPresent("description", oneTimePrice.description)
            return result
        }
    }

    private static func serialize(
        _ item: CheckoutController.Session.OrderSummaryItem.OneTimePrice.Item
    ) -> [String: Any] {
        var result: [String: Any] = [
            "key": item.key,
            "displayName": item.displayName,
            "images": item.images,
            "unitAmount": serialize(item.unitAmount),
            "quantity": item.quantity,
            "amountDetails": serialize(item.amountDetails),
        ]
        result.setIfPresent("unitAmountDecimal", item.unitAmountDecimal.map(serialize))
        result.setIfPresent("unitLabel", item.unitLabel)
        result.setIfPresent("adjustableQuantity", item.adjustableQuantity.map {
            ["enabled": $0.enabled, "minimum": $0.minimum, "maximum": $0.maximum]
        })
        return result
    }

    private static func serialize(
        _ details: CheckoutController.Session.OrderSummaryItem.OneTimePrice.Item.AmountDetails
    ) -> [String: Any] {
        var result: [String: Any] = [
            "total": serialize(details.total),
            "subtotal": serialize(details.subtotal),
            "taxInclusive": serialize(details.taxInclusive),
            "taxExclusive": serialize(details.taxExclusive),
        ]
        result.setIfPresent("taxAmounts", details.taxAmounts?.map(serialize))
        return result
    }

    private static func serialize(_ amount: CheckoutController.Session.Amount) -> [String: Any] {
        [
            "amount": amount.amount,
            "minorUnitsAmount": amount.minorUnitsAmount,
        ]
    }

    private static func serialize(_ amount: CheckoutController.Session.TaxAmount) -> [String: Any] {
        var result: [String: Any] = [
            "amount": amount.amount,
            "minorUnitsAmount": amount.minorUnitsAmount,
            "inclusive": amount.inclusive,
            "displayName": amount.displayName,
        ]
        result.setIfPresent("percentage", amount.percentage)
        return result
    }

    private static func serialize(_ amount: CheckoutController.Session.DiscountAmount) -> [String: Any] {
        var result: [String: Any] = [
            "amount": amount.amount,
            "minorUnitsAmount": amount.minorUnitsAmount,
            "displayName": amount.displayName,
        ]
        result.setIfPresent("promotionCode", amount.promotionCode)
        result.setIfPresent("percentOff", amount.percentOff)
        return result
    }

    private static func serialize(_ totals: CheckoutController.Session.Totals) -> [String: Any] {
        [
            "subtotal": serialize(totals.subtotal),
            "taxExclusive": serialize(totals.taxExclusive),
            "taxInclusive": serialize(totals.taxInclusive),
            "discount": serialize(totals.discount),
            "total": serialize(totals.total),
        ]
    }

    private static func serialize(_ status: CheckoutController.Session.Status) -> [String: Any] {
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
        _ paymentStatus: CheckoutController.Session.Status.PaymentStatus
    ) -> String {
        switch paymentStatus {
        case .paid: return "paid"
        case .unpaid: return "unpaid"
        case .noPaymentRequired: return "noPaymentRequired"
        }
    }

    private static func serialize(_ taxStatus: CheckoutController.Session.Tax.Status) -> [String: Any] {
        switch taxStatus {
        case .ready:
            return ["status": "ready"]
        case .requiresShippingAddress:
            return ["status": "requiresShippingAddress"]
        case .requiresBillingAddress:
            return ["status": "requiresBillingAddress"]
        }
    }

    private static func serialize(
        _ paymentOption: CheckoutController.Session.PaymentOptionDisplayData
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

    private static func serialize(
        _ billingDetails: CheckoutController.Session.PaymentOptionDisplayData.BillingDetails
    ) -> [String: Any] {
        var result: [String: Any] = [:]
        result.setIfPresent("name", billingDetails.name)
        result.setIfPresent("email", billingDetails.email)
        result.setIfPresent("phone", billingDetails.phone)
        result.setIfPresent("address", billingDetails.address.map(serialize))
        return result
    }

    private static func serialize(
        _ address: CheckoutController.Session.PaymentOptionDisplayData.BillingDetails.Address
    ) -> [String: Any] {
        var result: [String: Any] = [:]
        result.setIfPresent("country", address.country)
        result.setIfPresent("line1", address.line1)
        result.setIfPresent("line2", address.line2)
        result.setIfPresent("city", address.city)
        result.setIfPresent("state", address.state)
        result.setIfPresent("postalCode", address.postalCode)
        return result
    }

    private static func serialize(_ shippingAddress: CheckoutController.Session.ShippingAddress) -> [String: Any] {
        var result: [String: Any] = ["address": serialize(shippingAddress.address)]
        result.setIfPresent("name", shippingAddress.name)
        return result
    }

    private static func serialize(_ address: CheckoutController.Address) -> [String: Any] {
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
