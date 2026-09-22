import PassKit
@testable import stripe_react_native
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import XCTest

@MainActor
final class CheckoutConfigurationMapperTests: XCTestCase {
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
                    "savePaymentMethodOptInBehavior": "requiresOptOut",
                    "appearance": ["shapes": ["borderRadius": 12.0]],
                    "preferredNetworks": [7, 5],
                    "billingDetailsCollectionConfiguration": [
                        "address": "full",
                    ],
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
        XCTAssertEqual(paymentElement.billingDetailsCollectionConfiguration.address, .full)
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

        if case .requiresOptOut = paymentElement.savePaymentMethodOptInBehavior {
            // Expected.
        } else {
            XCTFail("Expected requiresOptOut")
        }
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
        XCTAssertEqual(paymentElement.billingDetailsCollectionConfiguration.address, .automatic)
        XCTAssertFalse(paymentElement.opensCardScannerAutomatically)
        XCTAssertFalse(paymentElement.displaysMandateText)
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
                    didSelectPaymentOption: {}
                )
            ) { error in
                XCTAssertEqual(
                    error as? CheckoutConfigurationMapperError,
                    .missingMerchantIdentifier
                )
            }
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
                    "billingDetailsCollectionConfiguration": [
                        "address": "never",
                    ],
                ],
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {}
        ))

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
