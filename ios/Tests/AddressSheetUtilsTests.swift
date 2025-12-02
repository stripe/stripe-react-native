//
//  AddressSheetUtilsTests.swift
//  stripe-react-native-Unit-Tests
//
//  Created by Charles Cruzan on 10/13/22.
//

@testable import stripe_react_native
import StripePaymentSheet
import XCTest

class AddressSheetUtilsTests: XCTestCase {
    let testCity = "testCity"
    let testCountry = "testCountry"
    let testLine1 = "testLine1"
    let testLine2 = "testLine2"
    let testPostalCode = "testPostalCode"
    let testState = "testState"
    let testName = "testName"
    let testPhone = "testPhone"

    // MARK: - buildDefaultValues Tests

    func test_buildDefaultValues_nil() {
        let result = AddressSheetUtils.buildDefaultValues(params: nil)

        XCTAssertEqual(result.address, PaymentSheet.Address())
        XCTAssertNil(result.name)
        XCTAssertNil(result.phone)
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildDefaultValues_fullData() {
        let result = AddressSheetUtils.buildDefaultValues(
            params: [
                "name": testName,
                "phone": testPhone,
                "address": [
                    "city": testCity,
                    "country": testCountry,
                    "line1": testLine1,
                    "line2": testLine2,
                    "postalCode": testPostalCode,
                    "state": testState,
                ],
                "isCheckboxSelected": true,
            ]
        )

        XCTAssertEqual(result.name, testName)
        XCTAssertEqual(result.phone, testPhone)
        XCTAssertEqual(result.address.city, testCity)
        XCTAssertEqual(result.address.country, testCountry)
        XCTAssertEqual(result.address.line1, testLine1)
        XCTAssertEqual(result.address.line2, testLine2)
        XCTAssertEqual(result.address.postalCode, testPostalCode)
        XCTAssertEqual(result.address.state, testState)
        XCTAssertEqual(result.isCheckboxSelected, true)
    }

    // MARK: - buildAddressDetails Tests

    func test_buildAddressDetails_nil() {
        let result = AddressSheetUtils.buildAddressDetails(params: nil)

        // AddressViewController requires country and line1 to be non-nil, defaults to empty string
        XCTAssertEqual(result.address.country, "")
        XCTAssertEqual(result.address.line1, "")
        XCTAssertNil(result.name)
        XCTAssertNil(result.phone)
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildAddressDetails_fullData() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: [
                "name": testName,
                "phone": testPhone,
                "address": [
                    "city": testCity,
                    "country": testCountry,
                    "line1": testLine1,
                    "line2": testLine2,
                    "postalCode": testPostalCode,
                    "state": testState,
                ],
                "isCheckboxSelected": true,
            ]
        )

        XCTAssertEqual(result.name, testName)
        XCTAssertEqual(result.phone, testPhone)
        XCTAssertEqual(result.address.city, testCity)
        XCTAssertEqual(result.address.country, testCountry)
        XCTAssertEqual(result.address.line1, testLine1)
        XCTAssertEqual(result.address.line2, testLine2)
        XCTAssertEqual(result.address.postalCode, testPostalCode)
        XCTAssertEqual(result.address.state, testState)
        XCTAssertEqual(result.isCheckboxSelected, true)
    }

    func test_buildAddressDetails_partialData() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: [
                "name": testName,
                "address": ["country": testCountry, "postalCode": testPostalCode],
            ]
        )

        XCTAssertEqual(result.name, testName)
        XCTAssertEqual(result.address.country, testCountry)
        XCTAssertEqual(result.address.postalCode, testPostalCode)
        // Required fields default to empty string
        XCTAssertEqual(result.address.line1, "")
        // Optional fields are nil
        XCTAssertNil(result.address.city)
        XCTAssertNil(result.address.line2)
        XCTAssertNil(result.address.state)
    }

    // MARK: - buildAddress Tests (PaymentSheet.Address)

    func test_buildAddress_paymentSheet_nil() {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(params: nil)

        XCTAssertNil(result.city)
        XCTAssertNil(result.country)
        XCTAssertNil(result.line1)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_buildAddress_paymentSheet_fullData() {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(
            params: [
                "city": testCity,
                "country": testCountry,
                "line1": testLine1,
                "line2": testLine2,
                "postalCode": testPostalCode,
                "state": testState,
            ]
        )

        XCTAssertEqual(result.city, testCity)
        XCTAssertEqual(result.country, testCountry)
        XCTAssertEqual(result.line1, testLine1)
        XCTAssertEqual(result.line2, testLine2)
        XCTAssertEqual(result.postalCode, testPostalCode)
        XCTAssertEqual(result.state, testState)
    }

    // MARK: - buildAddress Tests (AddressViewController.AddressDetails.Address)

    func test_buildAddress_addressViewController_nil() {
        let result: AddressViewController.AddressDetails.Address = AddressSheetUtils.buildAddress(params: nil)

        // Required fields default to empty string
        XCTAssertEqual(result.country, "")
        XCTAssertEqual(result.line1, "")
        // Optional fields are nil
        XCTAssertNil(result.city)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_buildAddress_addressViewController_fullData() {
        let result: AddressViewController.AddressDetails.Address = AddressSheetUtils.buildAddress(
            params: [
                "city": testCity,
                "country": testCountry,
                "line1": testLine1,
                "line2": testLine2,
                "postalCode": testPostalCode,
                "state": testState,
            ]
        )

        XCTAssertEqual(result.city, testCity)
        XCTAssertEqual(result.country, testCountry)
        XCTAssertEqual(result.line1, testLine1)
        XCTAssertEqual(result.line2, testLine2)
        XCTAssertEqual(result.postalCode, testPostalCode)
        XCTAssertEqual(result.state, testState)
    }

    // MARK: - buildAdditionalFieldsConfiguration Tests

    func test_buildAdditionalFieldsConfiguration_nil() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(params: nil)

        XCTAssertEqual(result.phone, .hidden)
        XCTAssertNil(result.checkboxLabel)
    }

    func test_buildAdditionalFieldsConfiguration_fullData() {
        let label = "Accept terms and conditions"
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "required", "checkboxLabel": label]
        )

        XCTAssertEqual(result.phone, .required)
        XCTAssertEqual(result.checkboxLabel, label)
    }

    func test_buildAdditionalFieldsConfiguration_invalidPhoneValue() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "invalid"]
        )

        XCTAssertEqual(result.phone, .hidden)
    }

    // MARK: - getFieldConfiguration Tests

    func test_getFieldConfiguration_allValues() {
        XCTAssertEqual(AddressSheetUtils.getFieldConfiguration(input: "optional", default: .hidden), .optional)
        XCTAssertEqual(AddressSheetUtils.getFieldConfiguration(input: "required", default: .hidden), .required)
        XCTAssertEqual(AddressSheetUtils.getFieldConfiguration(input: "hidden", default: .optional), .hidden)
        // Invalid/nil values return default
        XCTAssertEqual(AddressSheetUtils.getFieldConfiguration(input: nil, default: .hidden), .hidden)
        XCTAssertEqual(AddressSheetUtils.getFieldConfiguration(input: "invalid", default: .optional), .optional)
        XCTAssertEqual(AddressSheetUtils.getFieldConfiguration(input: "", default: .required), .required)
    }

    // MARK: - buildResult Tests

    func test_buildResult_fullData() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: testCity,
                country: testCountry,
                line1: testLine1,
                line2: testLine2,
                postalCode: testPostalCode,
                state: testState
            ),
            name: testName,
            phone: testPhone,
            isCheckboxSelected: true
        )

        XCTAssertEqual(
            AddressSheetUtils.buildResult(address: input) as NSDictionary,
            [
                "result": [
                    "name": testName,
                    "phone": testPhone,
                    "isCheckboxSelected": true,
                    "address": [
                        "city": testCity,
                        "country": testCountry,
                        "line1": testLine1,
                        "line2": testLine2,
                        "postalCode": testPostalCode,
                        "state": testState,
                    ],
                ],
            ] as NSDictionary
        )
    }

    func test_buildResult_minimalData() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: nil,
                country: "",
                line1: "",
                line2: nil,
                postalCode: nil,
                state: nil
            ),
            name: nil,
            phone: nil,
            isCheckboxSelected: nil
        )

        let result = AddressSheetUtils.buildResult(address: input) as NSDictionary
        let resultDict = result["result"] as? NSDictionary

        XCTAssertNotNil(resultDict)
        XCTAssertTrue(resultDict?["name"] is NSNull)
        XCTAssertTrue(resultDict?["phone"] is NSNull)

        let addressDict = resultDict?["address"] as? NSDictionary
        XCTAssertNotNil(addressDict)
        XCTAssertTrue(addressDict?["city"] is NSNull)
        XCTAssertEqual(addressDict?["country"] as? String, "")
        XCTAssertEqual(addressDict?["line1"] as? String, "")
        XCTAssertTrue(addressDict?["line2"] is NSNull)
        XCTAssertTrue(addressDict?["postalCode"] is NSNull)
        XCTAssertTrue(addressDict?["state"] is NSNull)
    }
}
