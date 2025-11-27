import XCTest
@testable import stripe_react_native
import StripePaymentSheet

class AddressSheetUtilsTests: XCTestCase {
    let testCity = "testCity"
    let testCountry = "testCountry"
    let testLine1 = "testLine1"
    let testLine2 = "testLine2"
    let testPostalCode = "testPostalCode"
    let testState = "testState"
    let testName = "testName"
    let testPhone = "testPhone"

    func test_buildDefaultValues_whenPassedNil() throws {
        let result = AddressSheetUtils.buildDefaultValues(params: nil)
        XCTAssertEqual(
            result.address, PaymentSheet.Address()
        )
        XCTAssertEqual(
            result.name, nil
        )
        XCTAssertEqual(
            result.phone, nil
        )
        XCTAssertEqual(
            result.isCheckboxSelected, nil
        )
    }

    func test_buildDefaultValues_whenPassedValues() throws {
        let result = AddressSheetUtils.buildDefaultValues(
            params: ["name": testName,
                     "phone": testPhone,
                     "address": ["city": testCity],
                     "isCheckboxSelected": true]
        )
        XCTAssertEqual(
            result.address.city, testCity
        )
        XCTAssertEqual(
            result.name, testName
        )
        XCTAssertEqual(
            result.phone, testPhone
        )
        XCTAssertEqual(
            result.isCheckboxSelected, true
        )
    }

    func test_buildAddressDetails_whenPassedNil() throws {
        let result = AddressSheetUtils.buildAddressDetails(params: nil)
        XCTAssertEqual(
            result.address.country, ""
        )
        XCTAssertEqual(
            result.address.line1, ""
        )
        XCTAssertEqual(
            result.name, nil
        )
        XCTAssertEqual(
            result.phone, nil
        )
        XCTAssertEqual(
            result.isCheckboxSelected, nil
        )
    }

    func test_buildAddressDetails_whenPassedValues() throws {
        let result = AddressSheetUtils.buildAddressDetails(
            params: ["name": testName,
                     "phone": testPhone,
                     "address": ["city": testCity],
                     "isCheckboxSelected": true]
        )

        XCTAssertEqual(
            result.address.city, testCity
        )
        XCTAssertEqual(
            result.address.line1, ""
        )
        XCTAssertEqual(
            result.name, testName
        )
        XCTAssertEqual(
            result.phone, testPhone
        )
        XCTAssertEqual(
            result.isCheckboxSelected, true
        )
    }

    func test_buildAddress_forPaymentSheet_whenPassedNil() throws {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(params: nil)

        XCTAssertEqual(
            result.city, nil
        )
        XCTAssertEqual(
            result.line1, nil
        )
        XCTAssertEqual(
            result.line2, nil
        )
        XCTAssertEqual(
            result.country, nil
        )
        XCTAssertEqual(
            result.postalCode, nil
        )
        XCTAssertEqual(
            result.state, nil
        )
    }

    func test_buildAddress_forPaymentSheet_whenPassedValues() throws {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(
            params: ["city": testCity, "country": testCountry, "line1": testLine1, "line2": testLine2, "postalCode": testPostalCode, "state": testState]
        )

        XCTAssertEqual(
            result.city, testCity
        )
        XCTAssertEqual(
            result.line1, testLine1
        )
        XCTAssertEqual(
            result.line2, testLine2
        )
        XCTAssertEqual(
            result.country, testCountry
        )
        XCTAssertEqual(
            result.postalCode, testPostalCode
        )
        XCTAssertEqual(
            result.state, testState
        )
    }

    func test_buildAddress_forAddressViewController_whenPassedNil() throws {
        let result: AddressViewController.AddressDetails.Address = AddressSheetUtils.buildAddress(params: nil)

        XCTAssertEqual(
            result.city, nil
        )
        XCTAssertEqual(
            result.line1, ""
        )
        XCTAssertEqual(
            result.line2, nil
        )
        XCTAssertEqual(
            result.country, ""
        )
        XCTAssertEqual(
            result.postalCode, nil
        )
        XCTAssertEqual(
            result.state, nil
        )
    }

    func test_buildAddress_forAddressViewController_whenPassedValues() throws {
        let result: AddressViewController.AddressDetails.Address = AddressSheetUtils.buildAddress(
            params: ["city": testCity, "country": testCountry, "line1": testLine1, "line2": testLine2, "postalCode": testPostalCode, "state": testState]
        )

        XCTAssertEqual(
            result.city, testCity
        )
        XCTAssertEqual(
            result.line1, testLine1
        )
        XCTAssertEqual(
            result.line2, testLine2
        )
        XCTAssertEqual(
            result.country, testCountry
        )
        XCTAssertEqual(
            result.postalCode, testPostalCode
        )
        XCTAssertEqual(
            result.state, testState
        )
    }

    func test_buildAdditionalFieldsConfiguration_whenPassedNil() throws {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(params: nil)

        XCTAssertEqual(
            result.phone, .hidden
        )
        XCTAssertEqual(
            result.checkboxLabel, nil
        )
    }

    func test_buildAdditionalFieldsConfiguration_whenPassedValues() throws {
        let testCheckboxLabel = "testCheckboxLabel"
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["name": "hidden", "phoneNumber": "optional", "checkboxLabel": testCheckboxLabel]
        )

        XCTAssertEqual(
            result.phone, .optional
        )
        XCTAssertEqual(
            result.checkboxLabel, testCheckboxLabel
        )
    }

    func test_getFieldConfiguration() throws {
        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: nil, default: .hidden), .hidden
        )

        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "optional", default: .hidden), .optional
        )

        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "required", default: .hidden), .required
        )

        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "hidden", default: .hidden), .hidden
        )

        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "hidden", default: .optional), .hidden
        )
    }

    func test_buildResult() throws {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: testCity, country: testCountry, line1: testLine1, line2: testLine2, postalCode: testPostalCode, state: testState
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
                        "state": testState
                    ]
                ]
            ] as NSDictionary
        )
    }

    // MARK: - Additional buildAddressDetails Tests

    func test_buildAddressDetails_onlyName() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: ["name": testName]
        )

        XCTAssertEqual(result.name, testName)
        XCTAssertNil(result.phone)
        XCTAssertEqual(result.address.line1, "")
        XCTAssertEqual(result.address.country, "")
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildAddressDetails_onlyPhone() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: ["phone": testPhone]
        )

        XCTAssertNil(result.name)
        XCTAssertEqual(result.phone, testPhone)
        XCTAssertEqual(result.address.line1, "")
        XCTAssertEqual(result.address.country, "")
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildAddressDetails_onlyCheckboxSelected() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: ["isCheckboxSelected": true]
        )

        XCTAssertNil(result.name)
        XCTAssertNil(result.phone)
        XCTAssertEqual(result.isCheckboxSelected, true)
    }

    func test_buildAddressDetails_checkboxSelectedFalse() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: ["name": testName, "isCheckboxSelected": false]
        )

        XCTAssertEqual(result.name, testName)
        XCTAssertEqual(result.isCheckboxSelected, false)
    }

    func test_buildAddressDetails_partialAddress() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: [
                "name": testName,
                "address": ["country": testCountry, "postalCode": testPostalCode]
            ]
        )

        XCTAssertEqual(result.name, testName)
        XCTAssertEqual(result.address.country, testCountry)
        XCTAssertEqual(result.address.postalCode, testPostalCode)
        XCTAssertNil(result.address.city)
        XCTAssertEqual(result.address.line1, "")
        XCTAssertNil(result.address.line2)
        XCTAssertNil(result.address.state)
    }

    func test_buildAddressDetails_fullAddress() {
        let result = AddressSheetUtils.buildAddressDetails(
            params: [
                "address": [
                    "city": testCity,
                    "country": testCountry,
                    "line1": testLine1,
                    "line2": testLine2,
                    "postalCode": testPostalCode,
                    "state": testState
                ]
            ]
        )

        XCTAssertEqual(result.address.city, testCity)
        XCTAssertEqual(result.address.country, testCountry)
        XCTAssertEqual(result.address.line1, testLine1)
        XCTAssertEqual(result.address.line2, testLine2)
        XCTAssertEqual(result.address.postalCode, testPostalCode)
        XCTAssertEqual(result.address.state, testState)
    }

    // MARK: - Additional buildAddress Tests

    func test_buildAddress_paymentSheet_emptyMap() {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(params: [:])

        XCTAssertNil(result.city)
        XCTAssertNil(result.country)
        XCTAssertNil(result.line1)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_buildAddress_paymentSheet_partialFields() {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(
            params: ["city": testCity, "postalCode": testPostalCode]
        )

        XCTAssertEqual(result.city, testCity)
        XCTAssertEqual(result.postalCode, testPostalCode)
        XCTAssertNil(result.country)
        XCTAssertNil(result.line1)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.state)
    }

    func test_buildAddress_paymentSheet_onlyRequiredFields() {
        let result: PaymentSheet.Address = AddressSheetUtils.buildAddress(
            params: ["country": testCountry, "line1": testLine1]
        )

        XCTAssertEqual(result.country, testCountry)
        XCTAssertEqual(result.line1, testLine1)
        XCTAssertNil(result.city)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_buildAddress_addressViewController_emptyMap() {
        let result: AddressViewController.AddressDetails.Address = AddressSheetUtils.buildAddress(params: [:])

        XCTAssertNil(result.city)
        XCTAssertEqual(result.country, "")
        XCTAssertEqual(result.line1, "")
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_buildAddress_addressViewController_partialFields() {
        let result: AddressViewController.AddressDetails.Address = AddressSheetUtils.buildAddress(
            params: ["city": testCity, "postalCode": testPostalCode]
        )

        XCTAssertEqual(result.city, testCity)
        XCTAssertEqual(result.postalCode, testPostalCode)
        XCTAssertEqual(result.country, "")
        XCTAssertEqual(result.line1, "")
        XCTAssertNil(result.line2)
        XCTAssertNil(result.state)
    }

    // MARK: - Additional getFieldConfiguration Tests

    func test_getFieldConfiguration_invalidValue_returnsDefault() {
        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "invalid", default: .hidden),
            .hidden
        )
        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "invalid", default: .optional),
            .optional
        )
    }

    func test_getFieldConfiguration_emptyString_returnsDefault() {
        XCTAssertEqual(
            AddressSheetUtils.getFieldConfiguration(input: "", default: .required),
            .required
        )
    }

    // MARK: - Additional buildAdditionalFieldsConfiguration Tests

    func test_buildAdditionalFieldsConfiguration_emptyMap() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(params: [:])

        XCTAssertEqual(result.phone, .hidden)
        XCTAssertNil(result.checkboxLabel)
    }

    func test_buildAdditionalFieldsConfiguration_phoneRequired() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "required"]
        )

        XCTAssertEqual(result.phone, .required)
    }

    func test_buildAdditionalFieldsConfiguration_phoneOptional() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "optional"]
        )

        XCTAssertEqual(result.phone, .optional)
    }

    func test_buildAdditionalFieldsConfiguration_phoneHidden() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "hidden"]
        )

        XCTAssertEqual(result.phone, .hidden)
    }

    func test_buildAdditionalFieldsConfiguration_withCheckboxLabel() {
        let label = "Accept terms and conditions"
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["checkboxLabel": label]
        )

        XCTAssertEqual(result.checkboxLabel, label)
        XCTAssertEqual(result.phone, .hidden)
    }

    func test_buildAdditionalFieldsConfiguration_fullConfig() {
        let label = "Accept terms and conditions"
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "required", "checkboxLabel": label]
        )

        XCTAssertEqual(result.phone, .required)
        XCTAssertEqual(result.checkboxLabel, label)
    }

    func test_buildAdditionalFieldsConfiguration_invalidPhoneValue_defaultsToHidden() {
        let result = AddressSheetUtils.buildAdditionalFieldsConfiguration(
            params: ["phoneNumber": "invalid"]
        )

        XCTAssertEqual(result.phone, .hidden)
    }

    // MARK: - Additional buildResult Tests

    func test_buildResult_nullName() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: testCity, country: testCountry, line1: "", line2: nil, postalCode: nil, state: nil
            ),
            name: nil,
            phone: testPhone,
            isCheckboxSelected: false
        )

        let result = AddressSheetUtils.buildResult(address: input) as NSDictionary
        let resultDict = result["result"] as? NSDictionary

        XCTAssertNotNil(resultDict)
        XCTAssertTrue(resultDict?["name"] is NSNull)
        XCTAssertEqual(resultDict?["phone"] as? String, testPhone)
        XCTAssertEqual(resultDict?["isCheckboxSelected"] as? Bool, false)
    }

    func test_buildResult_nullPhone() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: testCity, country: testCountry, line1: "", line2: nil, postalCode: nil, state: nil
            ),
            name: testName,
            phone: nil,
            isCheckboxSelected: true
        )

        let result = AddressSheetUtils.buildResult(address: input) as NSDictionary
        let resultDict = result["result"] as? NSDictionary

        XCTAssertNotNil(resultDict)
        XCTAssertEqual(resultDict?["name"] as? String, testName)
        XCTAssertTrue(resultDict?["phone"] is NSNull)
        XCTAssertEqual(resultDict?["isCheckboxSelected"] as? Bool, true)
    }

    func test_buildResult_checkboxSelectedFalse() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: nil, country: "", line1: "", line2: nil, postalCode: nil, state: nil
            ),
            name: testName,
            phone: nil,
            isCheckboxSelected: false
        )

        let result = AddressSheetUtils.buildResult(address: input) as NSDictionary
        let resultDict = result["result"] as? NSDictionary

        XCTAssertNotNil(resultDict)
        XCTAssertEqual(resultDict?["isCheckboxSelected"] as? Bool, false)
    }

    func test_buildResult_checkboxSelectedNil() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: nil, country: "", line1: "", line2: nil, postalCode: nil, state: nil
            ),
            name: testName,
            phone: nil,
            isCheckboxSelected: nil
        )

        let result = AddressSheetUtils.buildResult(address: input) as NSDictionary
        let resultDict = result["result"] as? NSDictionary

        XCTAssertNotNil(resultDict)
        // Nil checkbox should not be present or be nil
        if let checkboxSelected = resultDict?["isCheckboxSelected"] {
            XCTAssertTrue(checkboxSelected is NSNull || (checkboxSelected as? Bool) == nil)
        }
    }

    func test_buildResult_partialAddress() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: nil, country: testCountry, line1: "", line2: nil, postalCode: testPostalCode, state: nil
            ),
            name: testName,
            phone: testPhone,
            isCheckboxSelected: true
        )

        let result = AddressSheetUtils.buildResult(address: input) as NSDictionary
        let resultDict = result["result"] as? NSDictionary
        let addressDict = resultDict?["address"] as? NSDictionary

        XCTAssertNotNil(addressDict)
        XCTAssertTrue(addressDict?["city"] is NSNull)
        XCTAssertEqual(addressDict?["country"] as? String, testCountry)
        // Empty string is preserved in iOS, not converted to nil
        XCTAssertEqual(addressDict?["line1"] as? String, "")
        XCTAssertTrue(addressDict?["line2"] is NSNull)
        XCTAssertEqual(addressDict?["postalCode"] as? String, testPostalCode)
        XCTAssertTrue(addressDict?["state"] is NSNull)
    }

    func test_buildResult_minimalData() {
        let input = AddressViewController.AddressDetails(
            address: AddressViewController.AddressDetails.Address(
                city: nil, country: "", line1: "", line2: nil, postalCode: nil, state: nil
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
        // Empty string is preserved in iOS, not converted to nil
        XCTAssertEqual(addressDict?["country"] as? String, "")
        XCTAssertEqual(addressDict?["line1"] as? String, "")
        XCTAssertTrue(addressDict?["line2"] is NSNull)
        XCTAssertTrue(addressDict?["postalCode"] is NSNull)
        XCTAssertTrue(addressDict?["state"] is NSNull)
    }

    // MARK: - Additional buildDefaultValues Tests

    func test_buildDefaultValues_emptyMap() {
        let result = AddressSheetUtils.buildDefaultValues(params: [:])

        XCTAssertEqual(result.address, PaymentSheet.Address())
        XCTAssertNil(result.name)
        XCTAssertNil(result.phone)
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildDefaultValues_onlyName() {
        let result = AddressSheetUtils.buildDefaultValues(params: ["name": testName])

        XCTAssertEqual(result.name, testName)
        XCTAssertNil(result.phone)
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildDefaultValues_onlyPhone() {
        let result = AddressSheetUtils.buildDefaultValues(params: ["phone": testPhone])

        XCTAssertNil(result.name)
        XCTAssertEqual(result.phone, testPhone)
        XCTAssertNil(result.isCheckboxSelected)
    }

    func test_buildDefaultValues_partialAddress() {
        let result = AddressSheetUtils.buildDefaultValues(
            params: ["address": ["country": testCountry, "postalCode": testPostalCode]]
        )

        XCTAssertEqual(result.address.country, testCountry)
        XCTAssertEqual(result.address.postalCode, testPostalCode)
        XCTAssertNil(result.address.city)
        XCTAssertNil(result.address.line1)
    }
}
