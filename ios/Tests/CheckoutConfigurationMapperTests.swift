import PassKit
@testable import stripe_react_native
@_spi(ReactNativeSDK) import StripePaymentSheet
import XCTest

@MainActor
final class CheckoutConfigurationMapperTests: XCTestCase {
    func test_map_mapsExpressCheckoutConfiguration() throws {
        let configuration = try CheckoutConfigurationMapper.map(
            params: ["expressCheckoutElement": [
                "applePay": ["buttonType": "checkout"],
                "googlePay": ["display": "never"],
                "link": ["display": "never"],
            ], ],
            merchantIdentifier: "merchant.com.example",
            didSelectPaymentOption: {}
        )
        let element = try XCTUnwrap(configuration.expressCheckoutElement)
        XCTAssertEqual(element.applePayConfiguration.buttonType, .checkout)
        XCTAssertEqual(element.linkConfiguration.display, .never)
        XCTAssertEqual(configuration.applePayMerchantId, "merchant.com.example")
        // Payment Element's own ApplePayConfiguration.display is untouched by Express
        // Checkout Element's configuration; it defaults to .automatic.
        XCTAssertEqual(configuration.paymentElement?.applePayConfiguration.display, .automatic)
    }

    func test_map_expressCheckoutOmitsApplePayWithoutMerchantIdentifierInsteadOfErroring() throws {
        for merchantIdentifier: String? in [nil, ""] {
            let configuration = try CheckoutConfigurationMapper.map(
                params: ["expressCheckoutElement": ["applePay": ["buttonType": "checkout"]]],
                merchantIdentifier: merchantIdentifier,
                didSelectPaymentOption: {}
            )
            XCTAssertNotNil(configuration.expressCheckoutElement)
            XCTAssertNil(configuration.applePayMerchantId)
        }
    }

    func test_map_omitsApplePayWithoutMerchantIdentifierEvenWhenExplicitlyConfigured() throws {
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "paymentElement": ["applePay": [:]],
                "expressCheckoutElement": [:],
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {}
        )
        XCTAssertNil(configuration.applePayMerchantId)
    }

    func test_map_expressCheckoutEnablesApplePayWithoutExplicitOptionsAndAllowsLinkOnly() throws {
        for merchantIdentifier: String? in [nil, "", "merchant.com.example"] {
            for paymentApplePay: NSDictionary? in [nil, ["display": "never"], ["display": "automatic"]] {
                var params: [String: Any] = ["expressCheckoutElement": [:]]
                if let paymentApplePay { params["paymentElement"] = ["applePay": paymentApplePay] }
                let configuration = try CheckoutConfigurationMapper.map(
                    params: params as NSDictionary,
                    merchantIdentifier: merchantIdentifier,
                    didSelectPaymentOption: {}
                )
                XCTAssertNotNil(configuration.expressCheckoutElement)
                XCTAssertEqual(configuration.applePayMerchantId, merchantIdentifier?.isEmpty == false ? merchantIdentifier : nil)
                // Payment Element's own display is unaffected by Express's configuration;
                // it's only ever .never when explicitly set that way.
                XCTAssertEqual(
                    configuration.paymentElement?.applePayConfiguration.display,
                    paymentApplePay?["display"] as? String == "never" ? .never : .automatic
                )
            }
        }
        // Payment Element's ApplePayConfiguration defaults to `display: .automatic`, so a
        // merchant ID alone enables it even without ever configuring `applePay`.
        let paymentOnly = try CheckoutConfigurationMapper.map(
            params: [:], merchantIdentifier: "merchant.com.example", didSelectPaymentOption: {}
        )
        XCTAssertEqual(paymentOnly.applePayMerchantId, "merchant.com.example")
        XCTAssertNil(paymentOnly.expressCheckoutElement)
    }

    func test_map_rejectsInvalidExpressCheckoutEnumsWithCorrectPaths() {
        let cases: [(NSDictionary, String)] = [
            (["applePay": ["buttonType": "invalid"]], "applePay.buttonType"),
            (["link": ["display": "invalid"]], "link.display"),
        ]
        for (params, path) in cases {
            XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
                params: ["expressCheckoutElement": params],
                merchantIdentifier: nil,
                didSelectPaymentOption: {}
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
            didSelectPaymentOption: {}
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
            didSelectPaymentOption: { selectionCount += 1 }
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
            didSelectPaymentOption: {}
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

    func test_map_omitsApplePayWithoutNonEmptyMerchantIdentifierInsteadOfErroring() throws {
        for merchantIdentifier: String? in [nil, ""] {
            let configuration = try CheckoutConfigurationMapper.map(
                params: [
                    "clientSecret": "cs_test_secret_123",
                    "returnURL": "example://checkout",
                    "paymentElement": [
                        "applePay": [:],
                    ],
                ],
                merchantIdentifier: merchantIdentifier,
                didSelectPaymentOption: {}
            )
            XCTAssertNil(configuration.applePayMerchantId)
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
                didSelectPaymentOption: {}
            )

            let paymentElement = try XCTUnwrap(configuration.paymentElement)
            if testCase.enabled {
                XCTAssertEqual(configuration.applePayMerchantId, testCase.merchantIdentifier)
                XCTAssertEqual(paymentElement.applePayConfiguration.display, .automatic)
                XCTAssertEqual(paymentElement.applePayConfiguration.buttonType, .checkout)
            } else {
                XCTAssertNil(configuration.applePayMerchantId)
                XCTAssertEqual(paymentElement.applePayConfiguration.display, .never)
            }
            XCTAssertEqual(paymentElement.linkConfiguration?.display, .never)
            XCTAssertEqual(paymentElement.paymentMethodOrder, ["card"])
        }
    }

    func test_map_rejectsUnsupportedApplePayDisplay() {
        XCTAssertThrowsError(try CheckoutConfigurationMapper.map(
            params: ["paymentElement": ["applePay": ["display": "invalid"]]],
            merchantIdentifier: "merchant.com.example",
            didSelectPaymentOption: {}
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
            didSelectPaymentOption: {}
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
            didSelectPaymentOption: {}
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
