import Foundation
@_spi(STP) import StripeCore
@testable @_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

/// Uses the native decoder so bridge tests exercise real Checkout session models.
enum CheckoutTestFixtures {
    static func session(
        status: String = "open",
        paymentStatus: String = "unpaid"
    ) throws -> CheckoutController.Session {
        let data = try JSONSerialization.data(withJSONObject: response(
            status: status,
            paymentStatus: paymentStatus
        ))
        let response = try StripeJSONDecoder().decode(PaymentPagesAPIResponse.self, from: data)
        return CheckoutController.Session(apiResponse: response, localState: .empty)
    }

    static func response(
        status: String = "open",
        paymentStatus: String = "unpaid"
    ) -> [String: Any] {
        [
            "session_id": "cs_test",
            "livemode": false,
            "mode": "modeless",
            "status": status,
            "payment_status": paymentStatus,
            "currency": "usd",
            "checkout_items": [[
                "key": "group_1",
                "type": "one_time_price",
                "one_time_price": ["items": [[
                    "inner_item_key": "item_1",
                    "quantity": 2,
                    "subtotal": 2100,
                    "total": 2250,
                    "unit_amount": 1050,
                    "unit_amount_decimal": "1050.25",
                    "tax_amounts": [],
                    "tax_inclusive": 0,
                    "tax_exclusive": 150,
                    "adjustable_quantity": ["enabled": true, "minimum": 1, "maximum": 5],
                    "price": [
                        "id": "price_1",
                        "currency": "usd",
                        "unit_amount": 1050,
                        "product": ["name": "Test item", "images": ["https://example.com/item.png"]],
                    ],
                ], ], ],
            ], ],
            "elements_session": [
                "session_id": "es_test",
                "merchant_country": "US",
                "payment_method_preference": ["ordered_payment_method_types": ["card"]],
            ],
        ]
    }
}
