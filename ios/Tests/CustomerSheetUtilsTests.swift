//
//  CustomerSheetUtilsTests.swift
//  stripe-react-native-Unit-Tests
//
//  Created by Claude Code
//

import XCTest
@testable import stripe_react_native
@_spi(PrivateBetaCustomerSheet) @_spi(STP) import StripePaymentSheet

class CustomerSheetUtilsTests: XCTestCase {

    // MARK: - getModalPresentationStyle Tests

    func test_getModalPresentationStyle_allValidStyles() {
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("fullscreen"),
            .fullScreen
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("pageSheet"),
            .pageSheet
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("formSheet"),
            .formSheet
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("automatic"),
            .automatic
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("overFullScreen"),
            .overFullScreen
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("popover"),
            .popover
        )
    }

    func test_getModalPresentationStyle_invalidValue_returnsPopover() {
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("invalid"),
            .popover
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle(""),
            .popover
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle("unknown"),
            .popover
        )
    }

    func test_getModalPresentationStyle_nilValue_returnsPopover() {
        XCTAssertEqual(
            CustomerSheetUtils.getModalPresentationStyle(nil),
            .popover
        )
    }

    // MARK: - getModalTransitionStyle Tests

    func test_getModalTransitionStyle_allValidStyles() {
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle("flip"),
            .flipHorizontal
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle("curl"),
            .partialCurl
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle("dissolve"),
            .crossDissolve
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle("slide"),
            .coverVertical
        )
    }

    func test_getModalTransitionStyle_invalidValue_returnsCoverVertical() {
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle("invalid"),
            .coverVertical
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle(""),
            .coverVertical
        )
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle("unknown"),
            .coverVertical
        )
    }

    func test_getModalTransitionStyle_nilValue_returnsCoverVertical() {
        XCTAssertEqual(
            CustomerSheetUtils.getModalTransitionStyle(nil),
            .coverVertical
        )
    }

    // MARK: - buildPaymentOptionResult Tests

    func test_buildPaymentOptionResult_withLabelOnly() {
        let result = CustomerSheetUtils.buildPaymentOptionResult(
            label: "Test Label",
            imageData: nil,
            paymentMethod: nil
        )

        XCTAssertNotNil(result["paymentOption"])
        let paymentOption = result["paymentOption"] as? NSDictionary
        XCTAssertEqual(paymentOption?["label"] as? String, "Test Label")
        XCTAssertNil(paymentOption?["image"])
        XCTAssertNil(result["paymentMethod"])
    }

    func test_buildPaymentOptionResult_withLabelAndImage() {
        // Create a simple 1x1 transparent PNG data
        let imageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        let result = CustomerSheetUtils.buildPaymentOptionResult(
            label: "Visa •••• 4242",
            imageData: imageData,
            paymentMethod: nil
        )

        XCTAssertNotNil(result["paymentOption"])
        let paymentOption = result["paymentOption"] as? NSDictionary
        XCTAssertEqual(paymentOption?["label"] as? String, "Visa •••• 4242")
        XCTAssertEqual(paymentOption?["image"] as? String, imageData)
        XCTAssertNil(result["paymentMethod"])
    }

    func test_buildPaymentOptionResult_withPaymentMethod() {
        // Create a mock payment method
        let card = STPPaymentMethodCard.decodedObject(fromAPIResponse: [
            "brand": "visa",
            "last4": "4242",
            "exp_month": 12,
            "exp_year": 2025
        ])

        let paymentMethod = STPPaymentMethod.decodedObject(fromAPIResponse: [
            "id": "pm_test123",
            "type": "card",
            "card": card?.allResponseFields ?? [:],
            "created": 1234567890,
            "livemode": false
        ])

        let result = CustomerSheetUtils.buildPaymentOptionResult(
            label: "Visa •••• 4242",
            imageData: "imageData",
            paymentMethod: paymentMethod
        )

        XCTAssertNotNil(result["paymentOption"])
        let paymentOption = result["paymentOption"] as? NSDictionary
        XCTAssertEqual(paymentOption?["label"] as? String, "Visa •••• 4242")
        XCTAssertEqual(paymentOption?["image"] as? String, "imageData")

        // Verify payment method is mapped
        XCTAssertNotNil(result["paymentMethod"])
        let mappedPaymentMethod = result["paymentMethod"] as? NSDictionary
        XCTAssertNotNil(mappedPaymentMethod)
    }

    func test_buildPaymentOptionResult_emptyLabel() {
        let result = CustomerSheetUtils.buildPaymentOptionResult(
            label: "",
            imageData: nil,
            paymentMethod: nil
        )

        let paymentOption = result["paymentOption"] as? NSDictionary
        XCTAssertEqual(paymentOption?["label"] as? String, "")
    }

    // MARK: - buildCustomerSheetConfiguration Tests

    func test_buildCustomerSheetConfiguration_minimalParams() {
        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: nil,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.style, .automatic)
        XCTAssertNil(config.removeSavedPaymentMethodMessage)
        XCTAssertNil(config.returnURL)
        XCTAssertNil(config.headerTextForSelectionScreen)
        XCTAssertFalse(config.applePayEnabled)
    }

    func test_buildCustomerSheetConfiguration_withAllParams() {
        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .alwaysDark,
            removeSavedPaymentMethodMessage: "Remove this card?",
            returnURL: "myapp://stripe-redirect",
            headerTextForSelectionScreen: "Select a payment method",
            applePayEnabled: true,
            merchantDisplayName: "Test Merchant",
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: nil,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: false,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.style, .alwaysDark)
        XCTAssertEqual(config.removeSavedPaymentMethodMessage, "Remove this card?")
        XCTAssertEqual(config.returnURL, "myapp://stripe-redirect")
        XCTAssertEqual(config.headerTextForSelectionScreen, "Select a payment method")
        XCTAssertTrue(config.applePayEnabled)
        XCTAssertEqual(config.merchantDisplayName, "Test Merchant")
        XCTAssertFalse(config.allowsRemovalOfLastSavedPaymentMethod)
    }

    func test_buildCustomerSheetConfiguration_withBillingDetailsCollection() {
        let billingConfig: NSDictionary = [
            "name": "always",
            "phone": "never",
            "email": "automatic",
            "address": "full",
            "attachDefaultsToPaymentMethod": true
        ]

        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: billingConfig,
            defaultBillingDetails: nil,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.billingDetailsCollectionConfiguration.name, .always)
        XCTAssertEqual(config.billingDetailsCollectionConfiguration.phone, .never)
        XCTAssertEqual(config.billingDetailsCollectionConfiguration.email, .automatic)
        XCTAssertEqual(config.billingDetailsCollectionConfiguration.address, .full)
        XCTAssertTrue(config.billingDetailsCollectionConfiguration.attachDefaultsToPaymentMethod)
    }

    func test_buildCustomerSheetConfiguration_withDefaultBillingDetails() {
        let defaultBilling: NSDictionary = [
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "address": [
                "city": "San Francisco",
                "country": "US",
                "line1": "123 Main St",
                "line2": "Apt 4",
                "postalCode": "94102",
                "state": "CA"
            ]
        ]

        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: defaultBilling,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.defaultBillingDetails.name, "John Doe")
        XCTAssertEqual(config.defaultBillingDetails.email, "john@example.com")
        XCTAssertEqual(config.defaultBillingDetails.phone, "+1234567890")
        XCTAssertEqual(config.defaultBillingDetails.address.city, "San Francisco")
        XCTAssertEqual(config.defaultBillingDetails.address.country, "US")
        XCTAssertEqual(config.defaultBillingDetails.address.line1, "123 Main St")
        XCTAssertEqual(config.defaultBillingDetails.address.line2, "Apt 4")
        XCTAssertEqual(config.defaultBillingDetails.address.postalCode, "94102")
        XCTAssertEqual(config.defaultBillingDetails.address.state, "CA")
    }

    func test_buildCustomerSheetConfiguration_withPreferredNetworks() {
        // Card brand integers: 0=JCB, 1=amex, 2=cartesBancaires, 3=dinersClub, 4=discover, 5=mastercard, 6=unionPay, 7=visa, 8=unknown
        let preferredNetworks = [7, 5] // visa, mastercard

        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: nil,
            preferredNetworks: preferredNetworks,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.preferredNetworks?.count, 2)
        XCTAssertEqual(config.preferredNetworks?[0], .visa)
        XCTAssertEqual(config.preferredNetworks?[1], .mastercard)
    }

    func test_buildCustomerSheetConfiguration_withPartialBillingDetails() {
        let defaultBilling: NSDictionary = [
            "name": "Jane Doe"
            // No email, phone, or address
        ]

        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: defaultBilling,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.defaultBillingDetails.name, "Jane Doe")
        XCTAssertNil(config.defaultBillingDetails.email)
        XCTAssertNil(config.defaultBillingDetails.phone)
    }

    func test_buildCustomerSheetConfiguration_applePayEnabledFalse() {
        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: false,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: nil,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertFalse(config.applePayEnabled)
    }

    func test_buildCustomerSheetConfiguration_allowsRemovalOfLastSavedPaymentMethodTrue() {
        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .automatic,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: nil,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: true,
            cardBrandAcceptance: .all
        )

        XCTAssertTrue(config.allowsRemovalOfLastSavedPaymentMethod)
    }

    func test_buildCustomerSheetConfiguration_styleAlwaysLight() {
        let config = CustomerSheetUtils.buildCustomerSheetConfiguration(
            appearance: PaymentSheet.Appearance(),
            style: .alwaysLight,
            removeSavedPaymentMethodMessage: nil,
            returnURL: nil,
            headerTextForSelectionScreen: nil,
            applePayEnabled: nil,
            merchantDisplayName: nil,
            billingDetailsCollectionConfiguration: nil,
            defaultBillingDetails: nil,
            preferredNetworks: nil,
            allowsRemovalOfLastSavedPaymentMethod: nil,
            cardBrandAcceptance: .all
        )

        XCTAssertEqual(config.style, .alwaysLight)
    }
}
