import Foundation
@_spi(InternalOnlyAPI) @_spi(ReactNativeSDK) import StripeCore
@_spi(InternalOnlyAPI) @_spi(ReactNativeSDK) import StripePaymentSheet

/// Builds one Checkout controller against a fixture response so the harness can
/// mount and destroy it without calling api.stripe.com.
@objc(HarnessCheckoutSession)
public final class HarnessCheckoutSession: NSObject {
    @objc(registerFixtureControllerWithResolve:reject:)
    public static func registerFixtureController(
        resolve: @escaping (NSString) -> Void,
        reject: @escaping (NSString) -> Void
    ) {
        Task { @MainActor in
            do {
                let controllerId = UUID().uuidString
                let checkout = try await makeCheckout()
                let instance = NativeCheckoutControllerInstance(checkout: checkout) { _ in }
                instance.start(controllerId: controllerId)
                StripeSdkImpl.shared.checkoutControllers[controllerId] = instance
                resolve(controllerId as NSString)
            } catch {
                reject(error.localizedDescription as NSString)
            }
        }
    }

    @MainActor
    private static func makeCheckout() async throws -> CheckoutElementsController {
        let sessionConfiguration = URLSessionConfiguration.ephemeral
        sessionConfiguration.protocolClasses = [HarnessCheckoutURLProtocol.self]
        let apiClient = STPAPIClient(publishableKey: "pk_test_123")
        apiClient.apiURL = URL(string: "https://checkout.test")!
        apiClient.urlSession = URLSession(configuration: sessionConfiguration)
        var configuration = CheckoutElementsController.Configuration(
            clientSecret: "cs_test_secret_123",
            returnURL: "https://example.com/checkout"
        )
        configuration.apiClient = apiClient
        configuration.paymentElement = .init()
        return try await CheckoutElementsController(configuration: configuration)
    }
}

private final class HarnessCheckoutURLProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool {
        request.url?.host == "checkout.test"
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        do {
            let data = try JSONSerialization.data(withJSONObject: Self.sessionBody())
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}

    private static func sessionBody() -> [String: Any] {
        [
            "id": "cs_test",
            "ui_mode": "mobile_elements",
            "livemode": false,
            "status": "open",
            "payment_status": "unpaid",
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
                            "product": [
                                "name": "Test item",
                                "images": ["https://example.com/item.png"],
                            ],
                        ],
                    ]],
                    "subtotal": 2100,
                    "total": 2250,
                ],
            ]],
            "merchant_info": ["country": "US"],
            "elements_session_id": "es_test",
            "ordered_payment_method_types_and_wallets": ["card"],
        ]
    }
}
