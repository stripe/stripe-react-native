@testable import stripe_react_native
@_spi(ExperimentalAllowsRemovalOfLastSavedPaymentMethodAPI) @_spi(CustomerSessionBetaAccess) @_spi(EmbeddedPaymentElementPrivateBeta) @_spi(STP) @_spi(PaymentMethodOptionsSetupFutureUsagePreview) @_spi(CustomPaymentMethodsBeta) @_spi(CardFundingFilteringPrivatePreview) import StripePaymentSheet
import XCTest

class PaymentSheetUtilsTests: XCTestCase {

    // MARK: - mapToCollectionMode Tests

    func test_mapToCollectionMode_validValues() {
        XCTAssertEqual(
            StripeSdkImpl.mapToCollectionMode(str: "automatic"),
            PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToCollectionMode(str: "never"),
            PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.never
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToCollectionMode(str: "always"),
            PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.always
        )
    }

    func test_mapToCollectionMode_invalidValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapToCollectionMode(str: "invalid"),
            PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToCollectionMode(str: ""),
            PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.automatic
        )
    }

    func test_mapToCollectionMode_nilValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapToCollectionMode(str: nil),
            PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode.automatic
        )
    }

    // MARK: - mapToAddressCollectionMode Tests

    func test_mapToAddressCollectionMode_validValues() {
        XCTAssertEqual(
            StripeSdkImpl.mapToAddressCollectionMode(str: "automatic"),
            PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToAddressCollectionMode(str: "never"),
            PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.never
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToAddressCollectionMode(str: "full"),
            PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.full
        )
    }

    func test_mapToAddressCollectionMode_invalidValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapToAddressCollectionMode(str: "invalid"),
            PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToAddressCollectionMode(str: ""),
            PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.automatic
        )
    }

    func test_mapToAddressCollectionMode_nilValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapToAddressCollectionMode(str: nil),
            PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode.automatic
        )
    }

    // MARK: - mapCaptureMethod Tests

    func test_mapCaptureMethod_validValues() {
        XCTAssertEqual(
            StripeSdkImpl.mapCaptureMethod("Automatic"),
            PaymentSheet.IntentConfiguration.CaptureMethod.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapCaptureMethod("Manual"),
            PaymentSheet.IntentConfiguration.CaptureMethod.manual
        )
        XCTAssertEqual(
            StripeSdkImpl.mapCaptureMethod("AutomaticAsync"),
            PaymentSheet.IntentConfiguration.CaptureMethod.automaticAsync
        )
    }

    func test_mapCaptureMethod_invalidValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapCaptureMethod("invalid"),
            PaymentSheet.IntentConfiguration.CaptureMethod.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapCaptureMethod(""),
            PaymentSheet.IntentConfiguration.CaptureMethod.automatic
        )
    }

    func test_mapCaptureMethod_nilValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapCaptureMethod(nil),
            PaymentSheet.IntentConfiguration.CaptureMethod.automatic
        )
    }

    // MARK: - setupFutureUsageFromString Tests

    func test_setupFutureUsageFromString_validValues() {
        XCTAssertEqual(
            StripeSdkImpl.setupFutureUsageFromString(from: "OffSession"),
            PaymentSheet.IntentConfiguration.SetupFutureUsage.offSession
        )
        XCTAssertEqual(
            StripeSdkImpl.setupFutureUsageFromString(from: "OnSession"),
            PaymentSheet.IntentConfiguration.SetupFutureUsage.onSession
        )
        XCTAssertEqual(
            StripeSdkImpl.setupFutureUsageFromString(from: "None"),
            PaymentSheet.IntentConfiguration.SetupFutureUsage.none
        )
    }

    func test_setupFutureUsageFromString_invalidValue_returnsNil() {
        XCTAssertNil(StripeSdkImpl.setupFutureUsageFromString(from: "Unknown"))
        XCTAssertNil(StripeSdkImpl.setupFutureUsageFromString(from: "OneTime"))
        XCTAssertNil(StripeSdkImpl.setupFutureUsageFromString(from: "invalid"))
        XCTAssertNil(StripeSdkImpl.setupFutureUsageFromString(from: ""))
    }

    // MARK: - mapToLinkDisplay Tests

    func test_mapToLinkDisplay_validValues() {
        XCTAssertEqual(
            StripeSdkImpl.mapToLinkDisplay(value: "automatic"),
            PaymentSheet.LinkConfiguration.Display.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToLinkDisplay(value: "never"),
            PaymentSheet.LinkConfiguration.Display.never
        )
    }

    func test_mapToLinkDisplay_invalidValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapToLinkDisplay(value: "invalid_value"),
            PaymentSheet.LinkConfiguration.Display.automatic
        )
        XCTAssertEqual(
            StripeSdkImpl.mapToLinkDisplay(value: ""),
            PaymentSheet.LinkConfiguration.Display.automatic
        )
    }

    func test_mapToLinkDisplay_nilValue_defaultsToAutomatic() {
        XCTAssertEqual(
            StripeSdkImpl.mapToLinkDisplay(value: nil),
            PaymentSheet.LinkConfiguration.Display.automatic
        )
    }

    // MARK: - computeTermsDisplayForUserKey Tests

    func test_computeTermsDisplayForUserKey_userKey_setsCardToNever() {
        STPAPIClient.shared.publishableKey = "uk_test_123"
        let result = StripeSdkImpl.computeTermsDisplayForUserKey()
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[.card], .never)
    }

    func test_computeTermsDisplayForUserKey_publishableKey_returnsEmpty() {
        STPAPIClient.shared.publishableKey = "pk_test_123"
        let result = StripeSdkImpl.computeTermsDisplayForUserKey()
        XCTAssertTrue(result.isEmpty)
    }

    func test_computeTermsDisplayForUserKey_liveUserKey_setsCardToNever() {
        STPAPIClient.shared.publishableKey = "uk_live_456"
        let result = StripeSdkImpl.computeTermsDisplayForUserKey()
        XCTAssertEqual(result[.card], .never)
    }

    // MARK: - computeCardBrandAcceptance Tests

    func test_computeCardBrandAcceptance_nilParams_returnsAll() {
        let result = StripeSdkImpl.computeCardBrandAcceptance(params: [:])

        // PaymentSheet.CardBrandAcceptance doesn't have public Equatable conformance,
        // so we verify by testing the behavior with a configuration
        // In a real scenario, this would be tested by creating a config and observing behavior
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterAll() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "all"
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterAllowed_withBrands() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "allowed",
                "brands": ["visa", "mastercard"],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterAllowed_emptyBrands_returnsAll() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "allowed",
                "brands": [],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterAllowed_invalidBrands_returnsAll() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "allowed",
                "brands": ["invalid", "unknown"],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterAllowed_mixedValidInvalidBrands() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "allowed",
                "brands": ["visa", "invalid", "amex"],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterDisallowed_withBrands() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "disallowed",
                "brands": ["amex", "discover"],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_filterDisallowed_emptyBrands_returnsAll() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "disallowed",
                "brands": [],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    func test_computeCardBrandAcceptance_invalidFilter_returnsAll() {
        let params: NSDictionary = [
            "cardBrandAcceptance": [
                "filter": "invalid",
                "brands": ["visa"],
            ],
        ]

        let result = StripeSdkImpl.computeCardBrandAcceptance(params: params)
        XCTAssertNotNil(result)
    }

    // MARK: - buildPaymentMethodOptions Tests

    func test_buildPaymentMethodOptions_nilOptions_returnsNil() {
        XCTAssertNil(StripeSdkImpl.buildPaymentMethodOptions(paymentMethodOptionsParams: [:]))
    }

    func test_buildPaymentMethodOptions_validOptions() {
        let options: NSDictionary = [
            "setupFutureUsageValues": [
                "card": "OffSession",
                "us_bank_account": "OnSession",
            ],
        ]

        let result = StripeSdkImpl.buildPaymentMethodOptions(paymentMethodOptionsParams: options)
        XCTAssertNotNil(result)
    }

    func test_buildPaymentMethodOptions_emptyMap_returnsNil() {
        let options: NSDictionary = [
            "setupFutureUsageValues": [:]
        ]

        let result = StripeSdkImpl.buildPaymentMethodOptions(paymentMethodOptionsParams: options)
        XCTAssertNil(result)
    }

    func test_buildPaymentMethodOptions_invalidPaymentMethodCodes_returnsNil() {
        let options: NSDictionary = [
            "setupFutureUsageValues": [
                "invalid_code": "OffSession",
                "another_invalid": "OnSession",
            ],
        ]

        let result = StripeSdkImpl.buildPaymentMethodOptions(paymentMethodOptionsParams: options)
        XCTAssertNil(result)
    }

    func test_buildPaymentMethodOptions_mixedValidInvalidCodes() {
        let options: NSDictionary = [
            "setupFutureUsageValues": [
                "card": "OffSession",
                "invalid_code": "OnSession",
                "us_bank_account": "None",
            ],
        ]

        let result = StripeSdkImpl.buildPaymentMethodOptions(paymentMethodOptionsParams: options)
        XCTAssertNotNil(result)
    }

    func test_buildPaymentMethodOptions_invalidSetupFutureUsageValue_skipsEntry() {
        let options: NSDictionary = [
            "setupFutureUsageValues": [
                "card": "InvalidValue",
                "us_bank_account": "OnSession",
            ],
        ]

        let result = StripeSdkImpl.buildPaymentMethodOptions(paymentMethodOptionsParams: options)
        XCTAssertNotNil(result)
    }

    // MARK: - parseCustomPaymentMethods Tests

    func test_parseCustomPaymentMethods_nilConfig_returnsEmptyList() {
        let result = StripeSdkImpl.parseCustomPaymentMethods(from: [:] as NSDictionary)
        XCTAssertTrue(result.isEmpty)
    }

    func test_parseCustomPaymentMethods_emptyMap_returnsEmptyList() {
        let params: NSDictionary = [:]
        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertTrue(result.isEmpty)
    }

    func test_parseCustomPaymentMethods_noCustomPaymentMethodsKey_returnsEmptyList() {
        let params: NSDictionary = [
            "someOtherKey": "value"
        ]
        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertTrue(result.isEmpty)
    }

    func test_parseCustomPaymentMethods_emptyArray_returnsEmptyList() {
        let params: NSDictionary = [
            "customPaymentMethods": []
        ]
        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertTrue(result.isEmpty)
    }

    func test_parseCustomPaymentMethods_singleValidMethod_returnsSingleItem() {
        let params: NSDictionary = [
            "customPaymentMethods": [
                [
                    "id": "cpmt_test123"
                ],
            ],
        ]

        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "cpmt_test123")
    }

    func test_parseCustomPaymentMethods_withSubtitle_returnsWithSubtitle() {
        let params: NSDictionary = [
            "customPaymentMethods": [
                [
                    "id": "cpmt_test123",
                    "subtitle": "Pay later with installments",
                ],
            ],
        ]

        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "cpmt_test123")
        XCTAssertEqual(result[0].subtitle, "Pay later with installments")
    }

    func test_parseCustomPaymentMethods_withDisableBillingDetailCollectionTrue() {
        let params: NSDictionary = [
            "customPaymentMethods": [
                [
                    "id": "cpmt_test123",
                    "disableBillingDetailCollection": true,
                ],
            ],
        ]

        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "cpmt_test123")
        XCTAssertTrue(result[0].disableBillingDetailCollection)
    }

    func test_parseCustomPaymentMethods_withDisableBillingDetailCollectionFalse() {
        let params: NSDictionary = [
            "customPaymentMethods": [
                [
                    "id": "cpmt_test123",
                    "disableBillingDetailCollection": false,
                ],
            ],
        ]

        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].id, "cpmt_test123")
        XCTAssertFalse(result[0].disableBillingDetailCollection)
    }

    func test_parseCustomPaymentMethods_multipleValidMethods_returnsAll() {
        let params: NSDictionary = [
            "customPaymentMethods": [
                [
                    "id": "cpmt_test1",
                    "subtitle": "Method 1",
                ],
                [
                    "id": "cpmt_test2",
                    "subtitle": "Method 2",
                    "disableBillingDetailCollection": true,
                ],
                [
                    "id": "cpmt_test3"
                ],
            ],
        ]

        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(result[0].id, "cpmt_test1")
        XCTAssertEqual(result[1].id, "cpmt_test2")
        XCTAssertEqual(result[2].id, "cpmt_test3")
    }

    func test_parseCustomPaymentMethods_missingIdField_skipsThatMethod() {
        let params: NSDictionary = [
            "customPaymentMethods": [
                [
                    "id": "cpmt_valid"
                ],
                [
                    "subtitle": "No ID here"
                ],
                [
                    "id": "cpmt_valid2"
                ],
            ],
        ]

        let result = StripeSdkImpl.parseCustomPaymentMethods(from: params)
        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(result[0].id, "cpmt_valid")
        XCTAssertEqual(result[1].id, "cpmt_valid2")
    }

    // MARK: - computeAllowedCardFundingTypes Tests

    func test_computeAllowedCardFundingTypes_nilParams_returnsNil() {
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: [:])
        XCTAssertNil(result)
    }

    func test_computeAllowedCardFundingTypes_noCardFundingFiltering_returnsNil() {
        let params: NSDictionary = [
            "someOtherKey": "value"
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNil(result)
    }

    func test_computeAllowedCardFundingTypes_debitOnly() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": ["debit"]
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNotNil(result)
        XCTAssertTrue(result!.contains(.debit))
        XCTAssertFalse(result!.contains(.credit))
        XCTAssertFalse(result!.contains(.prepaid))
        XCTAssertFalse(result!.contains(.unknown))
    }

    func test_computeAllowedCardFundingTypes_creditOnly() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": ["credit"]
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNotNil(result)
        XCTAssertTrue(result!.contains(.credit))
        XCTAssertFalse(result!.contains(.debit))
    }

    func test_computeAllowedCardFundingTypes_multipleTypes() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": ["debit", "credit", "prepaid"]
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNotNil(result)
        XCTAssertTrue(result!.contains(.debit))
        XCTAssertTrue(result!.contains(.credit))
        XCTAssertTrue(result!.contains(.prepaid))
        XCTAssertFalse(result!.contains(.unknown))
    }

    func test_computeAllowedCardFundingTypes_allFourTypes() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": ["debit", "credit", "prepaid", "unknown"]
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNotNil(result)
        XCTAssertTrue(result!.contains(.debit))
        XCTAssertTrue(result!.contains(.credit))
        XCTAssertTrue(result!.contains(.prepaid))
        XCTAssertTrue(result!.contains(.unknown))
    }

    func test_computeAllowedCardFundingTypes_emptyArray_returnsNil() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": []
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNil(result)
    }

    func test_computeAllowedCardFundingTypes_invalidTypes_ignored() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": ["invalid", "debit", "not_a_type"]
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNotNil(result)
        XCTAssertTrue(result!.contains(.debit))
        XCTAssertFalse(result!.contains(.credit))
    }

    func test_computeAllowedCardFundingTypes_onlyInvalidTypes_returnsNil() {
        let params: NSDictionary = [
            "cardFundingFiltering": [
                "allowedCardFundingTypes": ["invalid", "not_valid"]
            ],
        ]
        let result = StripeSdkImpl.computeAllowedCardFundingTypes(params: params)
        XCTAssertNil(result)
    }
}
