import Foundation
@_spi(InternalOnlyAPI) import StripeCore
@testable @_spi(ReactNativeSDK) @_spi(InternalOnlyAPI) import StripePaymentSheet

/// Uses the native decoder so bridge tests exercise real Checkout session models.
enum CheckoutTestFixtures {
    static func session(
        status: String = "open",
        paymentStatus: String = "unpaid"
    ) throws -> CheckoutElementsController.Session {
        let data = try JSONSerialization.data(withJSONObject: response(
            status: status,
            paymentStatus: paymentStatus
        ))
        let response = try StripeJSONDecoder().decode(CheckoutClientAPIResponse.self, from: data)
        return CheckoutElementsController.Session(
            apiResponse: response,
            clientSecret: "cs_test_secret",
            localState: .empty
        )
    }

    static func response(
        status: String = "open",
        paymentStatus: String = "unpaid",
        adaptivePricing: Bool = false
    ) -> [String: Any] {
        var response: [String: Any] = [
            "id": "cs_test",
            "ui_mode": "mobile_elements",
            "livemode": false,
            "status": status,
            "payment_status": paymentStatus,
            "presentment_currency": "usd",
            "integration_currency": "usd",
            "items": [[
                "key": "group_1",
                "type": "one_time_price",
                "one_time_price": [
                    "items": [[
                        "inner_item_key": "item_1",
                        "quantity": 2,
                        "unit_amount": 1050,
                        "unit_amount_decimal": "1050.25",
                        "amount_details": [
                            "subtotal": 2100,
                            "total": 2250,
                            "tax_amounts": [],
                            "tax_inclusive": 0,
                            "tax_exclusive": 150,
                        ],
                        "adjustable_quantity": ["enabled": true, "minimum": 1, "maximum": 5],
                        "price": [
                            "id": "price_1",
                            "currency": "usd",
                            "unit_amount": 1050,
                            "product": ["name": "Test item", "images": ["https://example.com/item.png"]],
                        ],
                    ], ],
                    "subtotal": 2100,
                    "total": 2250,
                ],
            ], ],
            "merchant_info": ["country": "US"],
            "elements_session_id": "es_test",
            "ordered_payment_method_types_and_wallets": ["card"],
        ]
        if adaptivePricing {
            response["adaptive_pricing_info"] = [
                "integration_currency_option": ["currency": "usd", "amount": 2250],
                "local_currency_options": [
                    [
                        "currency": "eur",
                        "amount": 2000,
                        "disclosure": ["caption": "1 EUR = 1.125 USD", "details": "Currency conversion details"],
                    ],
                ],
            ]
        }
        return response
    }
}
