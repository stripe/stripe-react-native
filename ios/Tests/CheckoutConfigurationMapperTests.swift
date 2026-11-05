import PassKit
@testable import stripe_react_native
@_spi(ReactNativeSDK) @_spi(InternalOnlyAPI) import StripePaymentSheet
import XCTest

@MainActor
final class CheckoutConfigurationMapperTests: XCTestCase {
    func test_map_mapsExpressCheckoutConfigurationAndCompletion() throws {
        var didComplete = false
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "expressCheckoutElement": [
                    "applePay": ["buttonType": "checkout"],
                    "link": ["display": "never"],
                    "appearance": [
                        "buttonTheme": "dark",
                        "buttonLayout": ["maxColumns": 2, "maxRows": 1],
                        "borderRadius": 12,
                    ],
                ],
            ],
            merchantIdentifier: "merchant.com.example",
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { result in
                if case .canceled = result { didComplete = true }
            }
        )
        let express = try XCTUnwrap(configuration.expressCheckoutElement)
        XCTAssertEqual(express.applePayConfiguration?.merchantId, "merchant.com.example")
        XCTAssertEqual(express.applePayConfiguration?.buttonType, .checkout)
        XCTAssertEqual(express.linkConfiguration.display, .never)
        XCTAssertEqual(express.appearance.buttonTheme, .dark)
        XCTAssertEqual(express.appearance.buttonLayout.maxColumns, 2)
        XCTAssertEqual(express.appearance.buttonLayout.maxRows, 1)
        XCTAssertEqual(express.appearance.cornerRadius, 12)
        express.completion(.canceled)
        XCTAssertTrue(didComplete)
    }

    func test_map_expressCheckoutUsesNativeDefaults() throws {
        for merchantIdentifier: String? in [nil, "", "merchant.com.example"] {
            let configuration = try CheckoutConfigurationMapper.map(
                params: ["expressCheckoutElement": [:]],
                merchantIdentifier: merchantIdentifier,
                didSelectPaymentOption: {},
                expressCheckoutCompletion: { _ in }
            )
            let express = try XCTUnwrap(configuration.expressCheckoutElement)
            XCTAssertEqual(express.applePayConfiguration != nil, merchantIdentifier == "merchant.com.example")
            XCTAssertEqual(express.linkConfiguration.display, .automatic)
            XCTAssertEqual(express.appearance.buttonTheme, .automatic)
            XCTAssertNil(express.appearance.buttonLayout.maxColumns)
            XCTAssertNil(express.appearance.buttonLayout.maxRows)
            XCTAssertNil(express.appearance.cornerRadius)
        }
    }

    func test_map_rejectsInvalidExpressCheckoutConfiguration() {
        let cases: [(NSDictionary, String, String)] = [
            (["link": ["display": "invalid"]], "link.display", "invalid"),
            (["applePay": ["buttonType": "invalid"]], "applePay.buttonType", "invalid"),
            (["appearance": ["buttonTheme": "invalid"]], "appearance.buttonTheme", "invalid"),
            (["appearance": ["buttonLayout": ["maxRows": 0]]], "appearance.buttonLayout.maxRows", "0"),
            (["appearance": ["buttonLayout": ["maxColumns": 11]]], "appearance.buttonLayout.maxColumns", "11"),
            (["appearance": ["buttonLayout": ["maxRows": 1.5]]], "appearance.buttonLayout.maxRows", "1.5"),
            (["appearance": ["borderRadius": -1]], "appearance.borderRadius", "-1"),
        ]
        for (params, path, value) in cases {
            XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
                params: ["expressCheckoutElement": params],
                merchantIdentifier: "merchant.com.example",
                didSelectPaymentOption: {},
                expressCheckoutCompletion: { _ in }
            )) { error in
                XCTAssertEqual(
                    error as? CheckoutConfigurationMapperError,
                    .unsupportedValue(path: "expressCheckoutElement.\(path)", value: value)
                )
            }
        }
        XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
            params: ["expressCheckoutElement": ["applePay": [:]]],
            merchantIdentifier: nil,
            didSelectPaymentOption: {},
            expressCheckoutCompletion: { _ in }
        )) { error in
            XCTAssertEqual(error as? CheckoutConfigurationMapperError, .missingMerchantIdentifier)
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
        XCTAssertEqual(paymentElement.applePayConfiguration?.merchantId, "merchant.com.example")
        XCTAssertEqual(paymentElement.applePayConfiguration?.buttonType, .checkout)
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
        XCTAssertNil(configuration.expressCheckoutElement)
        XCTAssertEqual(configuration.userInterfaceStyle, .automatic)
        let paymentElement = try XCTUnwrap(configuration.paymentElement)
        XCTAssertFalse(paymentElement.opensCardScannerAutomatically)
        XCTAssertTrue(paymentElement.displaysMandateText)
        XCTAssertNil(paymentElement.applePayConfiguration)
        XCTAssertNil(paymentElement.linkConfiguration)
    }

    func test_map_requiresNonEmptyMerchantIdentifierWhenApplePayIsConfigured() {
        for merchantIdentifier: String? in [nil, ""] {
            XCTAssertThrowsError(
                try CheckoutConfigurationMapper.map(
                    params: [
                        "clientSecret": "cs_test_secret_123",
                        "returnURL": "example://checkout",
                        "paymentElement": [
                            "applePay": [:],
                        ],
                    ],
                    merchantIdentifier: merchantIdentifier,
                    didSelectPaymentOption: {},
                    expressCheckoutCompletion: { _ in }
                )
            ) { error in
                XCTAssertEqual(
                    error as? CheckoutConfigurationMapperError,
                    .missingMerchantIdentifier
                )
            }
        }
    }

    func test_map_mapsApplePayDisplay() throws {
        let cases: [(display: String?, merchantIdentifier: String?, enabled: Bool)] = [
            (nil, "merchant.com.example", true),
            ("automatic", "merchant.com.example", true),
            ("never", "merchant.com.example", false),
            ("never", nil, false),
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
            if testCase.enabled {
                let applePay = try XCTUnwrap(paymentElement.applePayConfiguration)
                XCTAssertEqual(applePay.merchantId, testCase.merchantIdentifier)
                XCTAssertEqual(applePay.buttonType, .checkout)
            } else {
                XCTAssertNil(paymentElement.applePayConfiguration)
            }
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
