import PassKit
@testable import stripe_react_native
@_spi(ReactNativeSDK) import StripePaymentSheet
import XCTest

@MainActor
final class CheckoutConfigurationMapperTests: XCTestCase {
    func test_map_mapsExpressCheckoutConfigurationAndCompletion() throws {
        var completed = false
        let configuration = try CheckoutConfigurationMapper.map(
            params: ["expressCheckoutElement": [
                "applePay": ["buttonType": "checkout"],
                "googlePay": ["display": "never"],
                "link": ["display": "never"],
                "appearance": [
                    "buttonTheme": "dark",
                    "buttonLayout": ["maxColumns": 2, "maxRows": 10],
                    "borderRadius": 12,
                ],
            ], ],
            merchantIdentifier: "merchant.com.example",
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { result in
                if case .canceled = result { completed = true }
            }
        )
        let element = try XCTUnwrap(configuration.expressCheckoutElement)
        XCTAssertEqual(element.applePayConfiguration.buttonType, .checkout)
        XCTAssertEqual(element.linkConfiguration.display, .never)
        XCTAssertEqual(element.appearance.buttonTheme, .dark)
        XCTAssertEqual(element.appearance.buttonLayout.maxColumns, 2)
        XCTAssertEqual(element.appearance.buttonLayout.maxRows, 10)
        XCTAssertEqual(element.appearance.cornerRadius, 12)
        XCTAssertEqual(configuration.applePayMerchantId, "merchant.com.example")
        // Payment Element's own ApplePayConfiguration.display is untouched by Express
        // Checkout Element's configuration; it defaults to .automatic.
        XCTAssertEqual(configuration.paymentElement?.applePayConfiguration.display, .automatic)
        element.completion(.canceled)
        XCTAssertTrue(completed)
    }

    func test_map_sharesMerchantIdentifier() throws {
        for isExpressConfigured in [false, true] {
            for merchantIdentifier: String? in [nil, "", "merchant.com.example"] {
                for display: String? in [nil, "automatic", "never"] {
                    var paymentElement: [String: Any] = [:]
                    if let display { paymentElement["applePay"] = ["display": display] }
                    var params: [String: Any] = ["paymentElement": paymentElement]
                    if isExpressConfigured { params["expressCheckoutElement"] = [:] }
                    let configuration = try CheckoutConfigurationMapper.map(
                        params: params as NSDictionary,
                        merchantIdentifier: merchantIdentifier,
                        didSelectPaymentOption: {},
                        expressCheckoutCompletion: { _ in }
                    )
                    let context = "express: \(isExpressConfigured), merchant: \(merchantIdentifier ?? "nil"), display: \(display ?? "nil")"
                    // The merchant ID is shared checkout-wide whenever one is provided; it is never
                    // an error to omit it.
                    XCTAssertEqual(
                        configuration.applePayMerchantId,
                        merchantIdentifier?.isEmpty == false ? merchantIdentifier : nil,
                        context
                    )
                    // Payment Element hides Apple Pay through its own display option.
                    XCTAssertEqual(
                        configuration.paymentElement?.applePayConfiguration.display,
                        display == "never" ? .never : .automatic,
                        context
                    )
                    XCTAssertEqual(configuration.expressCheckoutElement != nil, isExpressConfigured, context)
                }
            }
        }
    }

    func test_map_expressCheckoutDefaultsAndValidLayoutLimits() throws {
        for theme in ["automatic", "light", "dark"] {
            let configuration = try CheckoutConfigurationMapper.map(
                params: ["expressCheckoutElement": ["appearance": [
                    "buttonTheme": theme,
                    "buttonLayout": ["maxRows": 1, "maxColumns": 10],
                ], ], ],
                merchantIdentifier: nil,
                didSelectPaymentOption: {},
                expressCheckoutCompletion: { _ in }
            )
            let element = try XCTUnwrap(configuration.expressCheckoutElement)
            XCTAssertEqual(element.appearance.buttonTheme.rawValue, theme)
            XCTAssertEqual(element.appearance.buttonLayout.maxRows, 1)
            XCTAssertEqual(element.appearance.buttonLayout.maxColumns, 10)
        }
        let configuration = try CheckoutConfigurationMapper.map(
            params: ["expressCheckoutElement": [:]],
            merchantIdentifier: nil,
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        )
        let element = try XCTUnwrap(configuration.expressCheckoutElement)
        XCTAssertEqual(element.appearance.buttonTheme, .automatic)
        XCTAssertNil(element.appearance.buttonLayout.maxRows)
        XCTAssertNil(element.appearance.buttonLayout.maxColumns)
        XCTAssertEqual(element.linkConfiguration.display, .automatic)
        XCTAssertNil(element.applePayConfiguration.buttonType)
        XCTAssertNil(element.appearance.cornerRadius)
    }

    func test_map_rejectsInvalidExpressCheckoutLayoutWithoutNativeAssertions() {
        let invalidValues: [Any] = [0, 11, -1, 1.5, Double.nan, Double.infinity, true, "2", NSNull()]
        for key in ["maxRows", "maxColumns"] {
            for value in invalidValues {
                XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
                    params: ["expressCheckoutElement": ["appearance": ["buttonLayout": [key: value]]]],
                    merchantIdentifier: nil,
                    didSelectPaymentOption: {},
                    expressCheckoutCompletion: { _ in }
                )) { error in
                    guard case .unsupportedValue(let path, _) = error as? CheckoutConfigurationMapperError else {
                        return XCTFail("Expected an unsupported layout value")
                    }
                    XCTAssertEqual(path, "expressCheckoutElement.appearance.buttonLayout.\(key)")
                }
            }
        }
    }

    func test_map_rejectsInvalidExpressCheckoutEnumsWithCorrectPaths() {
        let cases: [(NSDictionary, String)] = [
            (["applePay": ["buttonType": "invalid"]], "applePay.buttonType"),
            (["link": ["display": "invalid"]], "link.display"),
            (["appearance": ["buttonTheme": "invalid"]], "appearance.buttonTheme"),
        ]
        for (params, path) in cases {
            XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
                params: ["expressCheckoutElement": params],
                merchantIdentifier: nil,
                didSelectPaymentOption: {},
                expressCheckoutCompletion: { _ in }
            )) { error in
                XCTAssertEqual(
                    error as? CheckoutConfigurationMapperError,
                    .unsupportedValue(path: "expressCheckoutElement.\(path)", value: "invalid")
                )
            }
        }
    }

    func test_map_mapsCurrencySelectorElementAppearance() throws {
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
                "currencySelectorElement": [
                    "appearance": [
                        "contentVerticalPadding": 8,
                        "shapes": ["cornerRadius": 12, "borderWidth": 2],
                        "font": ["family": "Helvetica", "scale": 1.2],
                        "colors": [
                            "light": ["background": "#FFFFFF"],
                            "dark": ["background": "#000000"],
                        ],
                        "labelContent": "amount",
                    ],
                ],
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        )

        let appearance = try XCTUnwrap(configuration.currencySelectorElement?.appearance)
        XCTAssertEqual(appearance.contentVerticalPadding, 8)
        XCTAssertEqual(appearance.cornerRadius, 12)
        XCTAssertEqual(appearance.borderWidth, 2)
        XCTAssertEqual(appearance.font.fontName, "Helvetica")
        XCTAssertEqual(appearance.sizeScaleFactor, 1.2)
        if case .amount = appearance.labelContent {} else {
            XCTFail("Expected amount label content")
        }
        XCTAssertEqual(
            appearance.background.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)),
            UIColor(hexString: "#FFFFFF")
        )
        XCTAssertEqual(
            appearance.background.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)),
            UIColor(hexString: "#000000")
        )
    }

    func test_map_mapsSupportedConfiguration() throws {
        var selectionCount = 0
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
                "merchantDisplayName": "Example Store",
                "style": "alwaysDark",
                "defaults": [
                    "email": "jenny@example.com",
                    "phone": "+15555555555",
                    "billingDetails": [
                        "name": "Jenny Rosen",
                        "address": address(country: "US"),
                    ],
                    "shippingDetails": [
                        "name": "Jenny Rosen",
                        "address": address(country: "CA"),
                    ],
                ],
                "paymentElement": [
                    "appearance": ["shapes": ["borderRadius": 12.0]],
                    "preferredNetworks": [7, 5],
                    "removeSavedPaymentMethodMessage": "Remove this payment method?",
                    "paymentMethodOrder": ["card", "link"],
                    "opensCardScannerAutomatically": true,
                    "termsDisplay": [
                        "card": "never",
                        "us_bank_account": "automatic",
                    ],
                    "paymentMethodLayout": "Vertical",
                    "displaysMandateText": true,
                    "rowSelectionBehavior": ["type": "immediateAction"],
                    "applePay": [
                        "buttonType": "checkout",
                    ],
                    "link": ["display": "never"],
                ],
            ],
            merchantIdentifier: "merchant.com.example",
            didSelectPaymentOption: { selectionCount += 1 },
            expressCheckoutCompletion: { _ in }
        )

        XCTAssertEqual(configuration.clientSecret, "cs_test_secret_123")
        XCTAssertEqual(configuration.returnURL, "example://checkout")
        XCTAssertEqual(configuration.merchantDisplayName, "Example Store")
        XCTAssertEqual(configuration.userInterfaceStyle, .alwaysDark)
        XCTAssertEqual(configuration.defaults.email, "jenny@example.com")
        XCTAssertEqual(configuration.defaults.phone, "+15555555555")
        XCTAssertEqual(configuration.defaults.billingDetails?.name, "Jenny Rosen")
        XCTAssertEqual(configuration.defaults.billingDetails?.address?.country, "US")
        XCTAssertEqual(configuration.defaults.shippingDetails?.address?.country, "CA")
        let paymentElement = try XCTUnwrap(configuration.paymentElement)
        XCTAssertEqual(paymentElement.appearance.cornerRadius, 12.0)
        XCTAssertEqual(paymentElement.preferredNetworks, [.visa, .mastercard])
        XCTAssertEqual(
            paymentElement.removeSavedPaymentMethodMessage,
            "Remove this payment method?"
        )
        XCTAssertEqual(paymentElement.paymentMethodOrder, ["card", "link"])
        XCTAssertTrue(paymentElement.opensCardScannerAutomatically)
        XCTAssertEqual(paymentElement.termsDisplay[.card], .never)
        XCTAssertEqual(paymentElement.termsDisplay[.USBankAccount], .automatic)
        XCTAssertTrue(paymentElement.displaysMandateText)
        XCTAssertEqual(configuration.applePayMerchantId, "merchant.com.example")
        XCTAssertEqual(paymentElement.applePayConfiguration.buttonType, .checkout)
        XCTAssertEqual(paymentElement.linkConfiguration?.display, .never)

        if case .vertical = paymentElement.paymentMethodLayout {
            // Expected.
        } else {
            XCTFail("Expected vertical")
        }
        if case .immediateAction(let callback) = paymentElement.rowSelectionBehavior {
            callback()
        } else {
            XCTFail("Expected immediateAction")
        }
        XCTAssertEqual(selectionCount, 1)
    }

    func test_map_usesNativeDefaultsForMissingOptionalValues() throws {
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        )

        XCTAssertNil(configuration.merchantDisplayName)
        XCTAssertNil(configuration.defaults.billingDetails)
        XCTAssertNil(configuration.defaults.shippingDetails)
        XCTAssertNil(configuration.defaults.email)
        XCTAssertNil(configuration.defaults.phone)
        XCTAssertEqual(configuration.userInterfaceStyle, .automatic)
        let paymentElement = try XCTUnwrap(configuration.paymentElement)
        XCTAssertFalse(paymentElement.opensCardScannerAutomatically)
        XCTAssertTrue(paymentElement.displaysMandateText)
        XCTAssertNil(configuration.applePayMerchantId)
        XCTAssertNil(paymentElement.linkConfiguration)
    }

    func test_map_mapsApplePayDisplay() throws {
        let cases: [(display: String?, merchantIdentifier: String?, expectedDisplay: PaymentElement.Configuration.ApplePayConfiguration.Display)] = [
            (nil, "merchant.com.example", .automatic),
            ("automatic", "merchant.com.example", .automatic),
            // The shared merchant ID stays set; Payment Element hides Apple Pay through `display`.
            ("never", "merchant.com.example", .never),
            ("never", nil, .never),
        ]
        for testCase in cases {
            var applePay = ["buttonType": "checkout"]
            applePay["display"] = testCase.display
            let configuration = try CheckoutConfigurationMapper.map(
                params: [
                    "paymentElement": [
                        "applePay": applePay,
                        "link": ["display": "never"],
                        "paymentMethodOrder": ["card"],
                    ],
                ],
                merchantIdentifier: testCase.merchantIdentifier,
                didSelectPaymentOption: {},
                expressCheckoutCompletion: { _ in }
            )

            let paymentElement = try XCTUnwrap(configuration.paymentElement)
            XCTAssertEqual(configuration.applePayMerchantId, testCase.merchantIdentifier)
            XCTAssertEqual(paymentElement.applePayConfiguration.display, testCase.expectedDisplay)
            XCTAssertEqual(paymentElement.applePayConfiguration.buttonType, .checkout)
            XCTAssertEqual(paymentElement.linkConfiguration?.display, .never)
            XCTAssertEqual(paymentElement.paymentMethodOrder, ["card"])
        }
    }

    func test_map_rejectsUnsupportedApplePayDisplay() {
        XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
            params: ["paymentElement": ["applePay": ["display": "invalid"]]],
            merchantIdentifier: "merchant.com.example",
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        )) { error in
            XCTAssertEqual(
                error as? CheckoutConfigurationMapperError,
                .unsupportedValue(path: "paymentElement.applePay.display", value: "invalid")
            )
        }
    }

    func test_map_leavesConfigurationValidationToNativeCheckout() throws {
        let configuration = try CheckoutConfigurationMapper.map(
            params: [:],
            merchantIdentifier: nil,
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        )

        XCTAssertEqual(configuration.clientSecret, "")
        XCTAssertEqual(configuration.returnURL, "")
    }

    func test_map_rejectsUnsupportedEnumValues() {
        XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
                "paymentElement": [
                    "termsDisplay": ["card": "invalid"],
                ],
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        ))
    }

    private func address(country: String) -> [String: String] {
        [
            "country": country,
            "line1": "510 Townsend Street",
            "line2": "Suite 100",
            "city": "San Francisco",
            "state": "CA",
            "postalCode": "94103",
        ]
    }

}
