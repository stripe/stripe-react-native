import PassKit
@testable import stripe_react_native
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import XCTest

@MainActor
final class CheckoutConfigurationMapperTests: XCTestCase {
    func test_map_mapsSupportedConfiguration() throws {
        var selectionCount = 0
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
                "merchantDisplayName": "Example Store",
                "style": "alwaysDark",
                "defaults": [
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
                        "name": "always",
                        "phone": "always",
                        "address": "full",
                        "attachDefaultsToPaymentMethod": true,
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
                        "merchantCountryCode": "US",
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
        XCTAssertEqual(configuration.defaults.billingDetails?.name, "Jenny Rosen")
        XCTAssertEqual(configuration.defaults.billingDetails?.address?.country, "US")
        XCTAssertEqual(configuration.defaults.shippingDetails?.address?.country, "CA")
        XCTAssertEqual(configuration.paymentElement.appearance.cornerRadius, 12.0)
        XCTAssertEqual(configuration.paymentElement.preferredNetworks, [.visa, .mastercard])
        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.name, .always)
        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.phone, .always)
        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.address, .full)
        XCTAssertTrue(
            configuration.paymentElement.billingDetailsCollectionConfiguration.attachDefaultsToPaymentMethod
        )
        XCTAssertEqual(
            configuration.paymentElement.removeSavedPaymentMethodMessage,
            "Remove this payment method?"
        )
        XCTAssertEqual(configuration.paymentElement.paymentMethodOrder, ["card", "link"])
        XCTAssertTrue(configuration.paymentElement.opensCardScannerAutomatically)
        XCTAssertEqual(configuration.paymentElement.termsDisplay[.card], .never)
        XCTAssertEqual(configuration.paymentElement.termsDisplay[.USBankAccount], .automatic)
        XCTAssertTrue(configuration.paymentElement.displaysMandateText)
        XCTAssertEqual(configuration.applePayConfiguration?.merchantId, "merchant.com.example")
        XCTAssertEqual(configuration.applePayConfiguration?.buttonType, .checkout)
        XCTAssertEqual(configuration.linkConfiguration?.display, .never)

        if case .requiresOptOut = configuration.paymentElement.savePaymentMethodOptInBehavior {
            // Expected.
        } else {
            XCTFail("Expected requiresOptOut")
        }
        if case .vertical = configuration.paymentElement.paymentMethodLayout {
            // Expected.
        } else {
            XCTFail("Expected vertical")
        }
        if case .immediateAction(let callback) = configuration.paymentElement.rowSelectionBehavior {
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
        XCTAssertEqual(configuration.userInterfaceStyle, .automatic)
        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.name, .automatic)
        XCTAssertFalse(configuration.paymentElement.opensCardScannerAutomatically)
        XCTAssertFalse(configuration.paymentElement.displaysMandateText)
        XCTAssertNil(configuration.applePayConfiguration)
        XCTAssertNil(configuration.linkConfiguration)
    }

    func test_map_requiresSharedCrossPlatformParameters() {
        XCTAssertThrowsError(
            try CheckoutConfigurationMapper.map(
                params: ["returnURL": "example://checkout"],
                merchantIdentifier: nil,
                didSelectPaymentOption: {}
            )
        ) { error in
            XCTAssertEqual(
                error as? CheckoutConfigurationMapperError,
                .missingRequiredString("clientSecret")
            )
        }
        XCTAssertThrowsError(
            try CheckoutConfigurationMapper.map(
                params: ["clientSecret": "cs_test_secret_123"],
                merchantIdentifier: nil,
                didSelectPaymentOption: {}
            )
        ) { error in
            XCTAssertEqual(
                error as? CheckoutConfigurationMapperError,
                .missingRequiredString("returnURL")
            )
        }
    }

    func test_map_requiresCountryWhenDefaultAddressIsPresent() {
        XCTAssertThrowsError(
            try CheckoutConfigurationMapper.map(
                params: [
                    "clientSecret": "cs_test_secret_123",
                    "returnURL": "example://checkout",
                    "defaults": [
                        "billingDetails": [
                            "address": ["city": "San Francisco"],
                        ],
                    ],
                ],
                merchantIdentifier: nil,
                didSelectPaymentOption: {}
            )
        ) { error in
            XCTAssertEqual(
                error as? CheckoutConfigurationMapperError,
                .missingAddressCountry("defaults.billingDetails.address")
            )
        }
    }

    func test_map_requiresMerchantIdentifierWhenApplePayIsConfigured() {
        XCTAssertThrowsError(
            try CheckoutConfigurationMapper.map(
                params: [
                    "clientSecret": "cs_test_secret_123",
                    "returnURL": "example://checkout",
                    "paymentElement": [
                        "applePay": ["merchantCountryCode": "US"],
                    ],
                ],
                merchantIdentifier: nil,
                didSelectPaymentOption: {}
            )
        ) { error in
            XCTAssertEqual(
                error as? CheckoutConfigurationMapperError,
                .missingMerchantIdentifier
            )
        }
    }

    func test_map_requiresMerchantCountryCodeWhenApplePayIsConfigured() {
        XCTAssertThrowsError(
            try CheckoutConfigurationMapper.map(
                params: [
                    "clientSecret": "cs_test_secret_123",
                    "returnURL": "example://checkout",
                    "paymentElement": [
                        "applePay": ["buttonType": "checkout"],
                    ],
                ],
                merchantIdentifier: "merchant.com.example",
                didSelectPaymentOption: {}
            )
        ) { error in
            XCTAssertEqual(
                error as? CheckoutConfigurationMapperError,
                .missingRequiredString("paymentElement.applePay.merchantCountryCode")
            )
        }
    }

    func test_map_checkoutBillingModesCannotMapNever() throws {
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
                "paymentElement": [
                    "billingDetailsCollectionConfiguration": [
                        "name": "never",
                        "phone": "never",
                        "address": "never",
                    ],
                ],
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {}
        )

        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.name, .automatic)
        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.phone, .automatic)
        XCTAssertEqual(configuration.paymentElement.billingDetailsCollectionConfiguration.address, .automatic)
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
