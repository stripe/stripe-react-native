//
//  Tests.swift
//  Tests
//
//  Created by Charles Cruzan on 6/21/22.
//  Copyright © 2022 Facebook. All rights reserved.
//

import PassKit
@testable import stripe_react_native
import XCTest

@available(iOS 15.0, *)
class ApplePayUtilsTests: XCTestCase {

    func test_buildPaymentSheetApplePayConfig_FailsWithoutMerchantIdentifier() throws {
        XCTAssertThrowsError(
            try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: nil, merchantCountryCode: "", paymentSummaryItems: nil, buttonType: nil, customHandlers: nil)
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.missingMerchantId
            )
        }
    }

    func test_buildPaymentSheetApplePayConfig_FailsWithoutCountryCode() throws {
        XCTAssertThrowsError(
            try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: TestFixtures.MERCHANT_ID, merchantCountryCode: nil, paymentSummaryItems: nil, buttonType: nil, customHandlers: nil)
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.missingCountryCode
            )
        }
    }

    func test_buildPaymentSheetApplePayConfig_withNilAndEmptyArray_shouldBeEqual() throws {
        let resultWithItemsAsNil = try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: TestFixtures.MERCHANT_ID, merchantCountryCode: TestFixtures.COUNTRY_CODE, paymentSummaryItems: nil, buttonType: nil, customHandlers: nil)
        let resultWithItemsAsEmptyArray = try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: TestFixtures.MERCHANT_ID, merchantCountryCode: TestFixtures.COUNTRY_CODE, paymentSummaryItems: [], buttonType: nil, customHandlers: nil)
        XCTAssertEqual(resultWithItemsAsNil.paymentSummaryItems, resultWithItemsAsEmptyArray.paymentSummaryItems)
    }

    func test_buildPaymentSheetApplePayConfig_withItems_shouldMatchExpected() throws {
        let result = try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: TestFixtures.MERCHANT_ID, merchantCountryCode: TestFixtures.COUNTRY_CODE, paymentSummaryItems: TestFixtures.CART_ITEM_DICTIONARY, buttonType: nil, customHandlers: nil)

        let deferredItemResult = PKDeferredPaymentSummaryItem(label: "deferred label", amount: 1.00)
        deferredItemResult.deferredDate = Date(timeIntervalSince1970: 123456789)
        let immediateItemResult = PKPaymentSummaryItem(label: "immediate label", amount: 2.00, type: .pending)
        let recurringResult = PKRecurringPaymentSummaryItem(label: "recurring label", amount: 1.00)
        recurringResult.intervalUnit = .minute
        recurringResult.intervalCount = 2
        recurringResult.startDate = Date(timeIntervalSince1970: 123456789)
        recurringResult.endDate = Date(timeIntervalSince1970: 234567890)

        XCTAssertEqual(
            result.paymentSummaryItems,
            [deferredItemResult, immediateItemResult, recurringResult]
        )
        XCTAssertEqual(
            result.merchantId,
            TestFixtures.MERCHANT_ID
        )
        XCTAssertEqual(
            result.merchantCountryCode,
            TestFixtures.COUNTRY_CODE
        )
    }

    func test_createDeferredPaymentSummaryItem() throws {
        let result = try ApplePayUtils.createDeferredPaymentSummaryItem(item: TestFixtures.DEFERRED_CART_ITEM_DICTIONARY)

        let expectedResult = PKDeferredPaymentSummaryItem(label: "deferred label", amount: 1.00)
        expectedResult.deferredDate = Date(timeIntervalSince1970: 123456789)

        XCTAssertEqual(
            result,
            expectedResult
        )
    }

    func test_createRecurringPaymentSummaryItem() throws {
        let result = try ApplePayUtils.createRecurringPaymentSummaryItem(item: TestFixtures.RECURRING_CART_ITEM_DICTIONARY)

        let expectedResult = PKRecurringPaymentSummaryItem(label: "recurring label", amount: 1.00)
        expectedResult.intervalUnit = .minute
        expectedResult.intervalCount = 2
        expectedResult.startDate = Date(timeIntervalSince1970: 123456789)
        expectedResult.endDate = Date(timeIntervalSince1970: 234567890)

        XCTAssertEqual(
            result,
            expectedResult
        )
    }

    func test_createRecurringPaymentSummaryItem_withUnexpectedIntervalUnit_fails() throws {
        XCTAssertThrowsError(
            try ApplePayUtils.createRecurringPaymentSummaryItem(item: [
                "paymentType": "Recurring",
                "intervalUnit": "decade",
                "intervalCount": 1,
            ] as [String: Any])
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.invalidTimeInterval("decade")
            )
        }

        XCTAssertThrowsError(
            try ApplePayUtils.createRecurringPaymentSummaryItem(item: [
                "paymentType": "Recurring",
                "intervalCount": 1,
            ] as [String: Any])
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.invalidTimeInterval("null")
            )
        }
    }

    func test_createImmediatePaymentSummaryItem() throws {
        let result = ApplePayUtils.createImmediatePaymentSummaryItem(item: TestFixtures.IMMEDIATE_CART_ITEM_DICTIONARY_NOT_PENDING)

        let expectedResult = PKPaymentSummaryItem(label: "immediate label", amount: 2.00, type: .final)

        XCTAssertEqual(
            result,
            expectedResult
        )
    }

    func test_buildPaymentSummaryItems() throws {
        let result = try ApplePayUtils.buildPaymentSummaryItems(items: TestFixtures.CART_ITEM_DICTIONARY)
        let deferredItemResult = PKDeferredPaymentSummaryItem(label: "deferred label", amount: 1.00)
        deferredItemResult.deferredDate = Date(timeIntervalSince1970: 123456789)
        let immediateItemResult = PKPaymentSummaryItem(label: "immediate label", amount: 2.00, type: .pending)
        let recurringResult = PKRecurringPaymentSummaryItem(label: "recurring label", amount: 1.00)
        recurringResult.intervalUnit = .minute
        recurringResult.intervalCount = 2
        recurringResult.startDate = Date(timeIntervalSince1970: 123456789)
        recurringResult.endDate = Date(timeIntervalSince1970: 234567890)

        XCTAssertEqual(
            result,
            [deferredItemResult, immediateItemResult, recurringResult]
        )
    }

    func test_buildPaymentSummaryItems_unexpectedType_fails() throws {
        XCTAssertThrowsError(
            try ApplePayUtils.buildPaymentSummaryItems(items: [[
                "paymentType": "wrong type",
            ], ] as [[String: Any]])
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.invalidCartSummaryItemType("wrong type")
            )
        }

        XCTAssertThrowsError(
            try ApplePayUtils.buildPaymentSummaryItems(items: [[
                "paymentType": "",
            ], ] as [[String: Any]])
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.invalidCartSummaryItemType("")
            )
        }

        XCTAssertThrowsError(
            try ApplePayUtils.buildPaymentSummaryItems(items: [[
                "label": "my labal",
            ], ] as [[String: Any]])
        ) { error in
            XCTAssertEqual(
                error as! ApplePayUtilsError, ApplePayUtilsError.invalidCartSummaryItemType("null")
            )
        }
    }

    func test_buildPaymentSheetApplePayConfig_withNilButtonType_shouldBePlain() throws {
        let result = try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: TestFixtures.MERCHANT_ID, merchantCountryCode: TestFixtures.COUNTRY_CODE, paymentSummaryItems: nil, buttonType: nil, customHandlers: nil)
        XCTAssertEqual(result.buttonType, .plain)
    }

    func test_buildPaymentSheetApplePayConfig_withButtonType4_shouldBeDonate() throws {
        let result = try ApplePayUtils.buildPaymentSheetApplePayConfig(merchantIdentifier: TestFixtures.MERCHANT_ID, merchantCountryCode: TestFixtures.COUNTRY_CODE, paymentSummaryItems: nil, buttonType: 4, customHandlers: nil)
        XCTAssertEqual(result.buttonType, .donate)
    }

    // MARK: - getMerchantCapabilityFrom Tests

    func test_getMerchantCapabilityFrom_allValues() {
        XCTAssertEqual(ApplePayUtils.getMerchantCapabilityFrom(string: "supportsDebit"), .capabilityDebit)
        XCTAssertEqual(ApplePayUtils.getMerchantCapabilityFrom(string: "supportsCredit"), .capabilityCredit)
        XCTAssertEqual(ApplePayUtils.getMerchantCapabilityFrom(string: "supportsEMV"), .capabilityEMV)
        XCTAssertEqual(ApplePayUtils.getMerchantCapabilityFrom(string: "supports3DS"), .capability3DS)
        // nil and invalid default to .capability3DS
        XCTAssertEqual(ApplePayUtils.getMerchantCapabilityFrom(string: nil), .capability3DS)
        XCTAssertEqual(ApplePayUtils.getMerchantCapabilityFrom(string: "invalid"), .capability3DS)
    }

    // MARK: - getShippingTypeFrom Tests

    func test_getShippingTypeFrom_allValues() {
        XCTAssertEqual(ApplePayUtils.getShippingTypeFrom(string: "delivery"), .delivery)
        XCTAssertEqual(ApplePayUtils.getShippingTypeFrom(string: "storePickup"), .storePickup)
        XCTAssertEqual(ApplePayUtils.getShippingTypeFrom(string: "servicePickup"), .servicePickup)
        XCTAssertEqual(ApplePayUtils.getShippingTypeFrom(string: "shipping"), .shipping)
        // nil and invalid default to .shipping
        XCTAssertEqual(ApplePayUtils.getShippingTypeFrom(string: nil), .shipping)
        XCTAssertEqual(ApplePayUtils.getShippingTypeFrom(string: "invalid"), .shipping)
    }

    // MARK: - mapToIntervalUnit Tests

    func test_mapToIntervalUnit_allValidValues() throws {
        XCTAssertEqual(try ApplePayUtils.mapToIntervalUnit(intervalString: "minute"), .minute)
        XCTAssertEqual(try ApplePayUtils.mapToIntervalUnit(intervalString: "hour"), .hour)
        XCTAssertEqual(try ApplePayUtils.mapToIntervalUnit(intervalString: "day"), .day)
        XCTAssertEqual(try ApplePayUtils.mapToIntervalUnit(intervalString: "month"), .month)
        XCTAssertEqual(try ApplePayUtils.mapToIntervalUnit(intervalString: "year"), .year)
    }

    func test_mapToIntervalUnit_invalidValues_throws() {
        XCTAssertThrowsError(try ApplePayUtils.mapToIntervalUnit(intervalString: "invalid")) { error in
            XCTAssertEqual(error as! ApplePayUtilsError, ApplePayUtilsError.invalidTimeInterval("invalid"))
        }
        XCTAssertThrowsError(try ApplePayUtils.mapToIntervalUnit(intervalString: nil)) { error in
            XCTAssertEqual(error as! ApplePayUtilsError, ApplePayUtilsError.invalidTimeInterval("null"))
        }
    }

    // MARK: - buildShippingMethods Tests

    func test_buildShippingMethods_nil_returnsEmpty() {
        let result = ApplePayUtils.buildShippingMethods(items: nil)
        XCTAssertTrue(result.isEmpty)
    }

    func test_buildShippingMethods_empty_returnsEmpty() {
        let result = ApplePayUtils.buildShippingMethods(items: [])
        XCTAssertTrue(result.isEmpty)
    }

    func test_buildShippingMethods_singleItem() {
        let item: [String: Any] = [
            "label": "Standard Shipping",
            "amount": "5.99",
            "identifier": "standard",
            "detail": "5-7 business days",
            "isPending": false,
        ]

        let result = ApplePayUtils.buildShippingMethods(items: [item])

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].label, "Standard Shipping")
        XCTAssertEqual(result[0].amount, NSDecimalNumber(string: "5.99"))
        XCTAssertEqual(result[0].identifier, "standard")
        XCTAssertEqual(result[0].detail, "5-7 business days")
        XCTAssertEqual(result[0].type, .final)
    }

    func test_buildShippingMethods_multipleItems() {
        let items: [[String: Any]] = [
            ["label": "Standard", "amount": "5.99", "identifier": "std", "detail": "5-7 days"],
            ["label": "Express", "amount": "12.99", "identifier": "exp", "detail": "2-3 days", "isPending": true],
        ]

        let result = ApplePayUtils.buildShippingMethods(items: items)

        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(result[0].label, "Standard")
        XCTAssertEqual(result[1].label, "Express")
        XCTAssertEqual(result[1].type, .pending)
    }

    func test_buildShippingMethods_withDateRange() {
        let item: [String: Any] = [
            "label": "Scheduled Delivery",
            "amount": "9.99",
            "identifier": "scheduled",
            "detail": "Choose your date",
            "startDate": 1704067200.0, // Jan 1, 2024
            "endDate": 1704153600.0, // Jan 2, 2024
        ]

        let result = ApplePayUtils.buildShippingMethods(items: [item])

        XCTAssertEqual(result.count, 1)
        XCTAssertNotNil(result[0].dateComponentsRange)
    }

    func test_buildShippingMethods_missingOptionalFields_usesDefaults() {
        let item: [String: Any] = [:] // Empty dict

        let result = ApplePayUtils.buildShippingMethods(items: [item])

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].label, "")
        XCTAssertEqual(result[0].amount, NSDecimalNumber(string: ""))
        XCTAssertEqual(result[0].identifier, "")
        XCTAssertEqual(result[0].detail, "")
        XCTAssertEqual(result[0].type, .final)
    }

    // MARK: - buildApplePayErrors Tests

    func test_buildApplePayErrors_emptyArray_returnsEmpty() throws {
        let result = try ApplePayUtils.buildApplePayErrors(errorItems: [])
        XCTAssertTrue(result.shippingAddressErrors.isEmpty)
        XCTAssertTrue(result.couponCodeErrors.isEmpty)
    }

    func test_buildApplePayErrors_invalidShippingAddress() throws {
        let errors: [NSDictionary] = [
            ["errorType": "InvalidShippingAddress", "field": "postalCode", "message": "Invalid postal code"]
        ]

        let result = try ApplePayUtils.buildApplePayErrors(errorItems: errors)

        XCTAssertEqual(result.shippingAddressErrors.count, 1)
        XCTAssertTrue(result.couponCodeErrors.isEmpty)
    }

    func test_buildApplePayErrors_unserviceableShippingAddress() throws {
        let errors: [NSDictionary] = [
            ["errorType": "UnserviceableShippingAddress", "message": "Cannot ship to this address"]
        ]

        let result = try ApplePayUtils.buildApplePayErrors(errorItems: errors)

        XCTAssertEqual(result.shippingAddressErrors.count, 1)
        XCTAssertTrue(result.couponCodeErrors.isEmpty)
    }

    func test_buildApplePayErrors_expiredCouponCode() throws {
        let errors: [NSDictionary] = [
            ["errorType": "ExpiredCouponCode", "message": "Coupon has expired"]
        ]

        let result = try ApplePayUtils.buildApplePayErrors(errorItems: errors)

        XCTAssertTrue(result.shippingAddressErrors.isEmpty)
        XCTAssertEqual(result.couponCodeErrors.count, 1)
    }

    func test_buildApplePayErrors_invalidCouponCode() throws {
        let errors: [NSDictionary] = [
            ["errorType": "InvalidCouponCode", "message": "Invalid coupon code"]
        ]

        let result = try ApplePayUtils.buildApplePayErrors(errorItems: errors)

        XCTAssertTrue(result.shippingAddressErrors.isEmpty)
        XCTAssertEqual(result.couponCodeErrors.count, 1)
    }

    func test_buildApplePayErrors_mixedErrors() throws {
        let errors: [NSDictionary] = [
            ["errorType": "InvalidShippingAddress", "field": "city", "message": "Invalid city"],
            ["errorType": "ExpiredCouponCode", "message": "Expired"],
            ["errorType": "UnserviceableShippingAddress", "message": "Cannot ship"],
        ]

        let result = try ApplePayUtils.buildApplePayErrors(errorItems: errors)

        XCTAssertEqual(result.shippingAddressErrors.count, 2)
        XCTAssertEqual(result.couponCodeErrors.count, 1)
    }

    func test_buildApplePayErrors_invalidErrorType_throws() {
        let errors: [NSDictionary] = [
            ["errorType": "UnknownErrorType", "message": "Some error"]
        ]

        XCTAssertThrowsError(try ApplePayUtils.buildApplePayErrors(errorItems: errors)) { error in
            // The error type wraps an optional string, so compare error description instead
            XCTAssertTrue(error.localizedDescription.contains("UnknownErrorType"))
        }
    }

    func test_buildApplePayErrors_invalidShippingAddress_defaultsToStreetField() throws {
        let errors: [NSDictionary] = [
            ["errorType": "InvalidShippingAddress", "message": "Invalid address"]
            // Note: no "field" specified
        ]

        let result = try ApplePayUtils.buildApplePayErrors(errorItems: errors)

        XCTAssertEqual(result.shippingAddressErrors.count, 1)
        // The default field is "street"
    }

    // MARK: - mapToArrayOfPaymentNetworks Tests

    func test_mapToArrayOfPaymentNetworks_validNetworks() {
        let result = ApplePayUtils.mapToArrayOfPaymentNetworks(arrayOfStrings: ["Visa", "MasterCard", "AmEx"])

        XCTAssertEqual(result.count, 3)
        XCTAssertTrue(result.contains(.visa))
        XCTAssertTrue(result.contains(.masterCard))
        XCTAssertTrue(result.contains(.amex))
    }

    func test_mapToArrayOfPaymentNetworks_emptyArray() {
        let result = ApplePayUtils.mapToArrayOfPaymentNetworks(arrayOfStrings: [])
        XCTAssertTrue(result.isEmpty)
    }

    func test_mapToArrayOfPaymentNetworks_singleNetwork() {
        let result = ApplePayUtils.mapToArrayOfPaymentNetworks(arrayOfStrings: ["Discover"])
        XCTAssertEqual(result.count, 1)
        XCTAssertTrue(result.contains(.discover))
    }

    func test_mapToArrayOfPaymentNetworks_customNetworkString() {
        // PKPaymentNetwork.init(rawValue:) accepts any string and creates a network
        let result = ApplePayUtils.mapToArrayOfPaymentNetworks(arrayOfStrings: ["customNetwork"])

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].rawValue, "customNetwork")
    }

    private struct TestFixtures {
        static let MERCHANT_ID = "merchant.com.id"
        static let COUNTRY_CODE = "US"
        static let DEFERRED_CART_ITEM_DICTIONARY = [
            "paymentType": "Deferred",
            "deferredDate": 123456789 as NSNumber,
            "label": "deferred label",
            "amount": "1.00",
        ] as [String: Any]
        static let RECURRING_CART_ITEM_DICTIONARY = [
            "paymentType": "Recurring",
            "intervalUnit": "minute",
            "intervalCount": 2,
            "startDate": 123456789 as NSNumber,
            "endDate": 234567890 as NSNumber,
            "label": "recurring label",
            "amount": "1.00",
        ] as [String: Any]
        static let IMMEDIATE_CART_ITEM_DICTIONARY = [
            "paymentType": "Immediate",
            "isPending": true,
            "label": "immediate label",
            "amount": "2.00",
        ] as [String: Any]
        static let CART_ITEM_DICTIONARY = [
            DEFERRED_CART_ITEM_DICTIONARY, IMMEDIATE_CART_ITEM_DICTIONARY, RECURRING_CART_ITEM_DICTIONARY
        ]
        static let IMMEDIATE_CART_ITEM_DICTIONARY_NOT_PENDING = [
            "paymentType": "Immediate",
            "label": "immediate label",
            "amount": "2.00",
        ] as [String: Any]
    }
}
