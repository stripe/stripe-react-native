import Stripe
@testable import stripe_react_native
import StripePaymentSheet
import XCTest

class MappersTests: XCTestCase {

    // MARK: - mapToAddress Tests

    func test_mapToAddress_nilInput_returnsEmptyAddress() {
        let result = Mappers.mapToAddress(address: nil)

        XCTAssertNotNil(result)
        XCTAssertNil(result.city)
        XCTAssertNil(result.country)
        XCTAssertNil(result.line1)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_mapToAddress_emptyMap_returnsEmptyAddress() {
        let addressMap: NSDictionary = [:]
        let result = Mappers.mapToAddress(address: addressMap)

        XCTAssertNotNil(result)
        XCTAssertNil(result.city)
        XCTAssertNil(result.country)
        XCTAssertNil(result.line1)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.postalCode)
        XCTAssertNil(result.state)
    }

    func test_mapToAddress_fullAddress_returnsCompleteAddress() {
        let addressMap: NSDictionary = [
            "city": "San Francisco",
            "country": "US",
            "line1": "123 Main St",
            "line2": "Apt 4",
            "postalCode": "94111",
            "state": "CA",
        ]

        let result = Mappers.mapToAddress(address: addressMap)

        XCTAssertEqual(result.city, "San Francisco")
        XCTAssertEqual(result.country, "US")
        XCTAssertEqual(result.line1, "123 Main St")
        XCTAssertEqual(result.line2, "Apt 4")
        XCTAssertEqual(result.postalCode, "94111")
        XCTAssertEqual(result.state, "CA")
    }

    func test_mapToAddress_partialAddress_returnsPartialWithNils() {
        let addressMap: NSDictionary = [
            "city": "New York",
            "postalCode": "10001",
        ]

        let result = Mappers.mapToAddress(address: addressMap)

        XCTAssertEqual(result.city, "New York")
        XCTAssertEqual(result.postalCode, "10001")
        XCTAssertNil(result.country)
        XCTAssertNil(result.line1)
        XCTAssertNil(result.line2)
        XCTAssertNil(result.state)
    }

    // MARK: - mapFromAddress Tests

    func test_mapFromAddress_nilInput_returnsMapWithNSNulls() {
        let result = Mappers.mapFromAddress(address: nil)

        XCTAssertNotNil(result)
        XCTAssertTrue(result["city"] is NSNull)
        XCTAssertTrue(result["postalCode"] is NSNull)
        XCTAssertTrue(result["country"] is NSNull)
        XCTAssertTrue(result["line1"] is NSNull)
        XCTAssertTrue(result["line2"] is NSNull)
        XCTAssertTrue(result["state"] is NSNull)
    }

    func test_mapFromAddress_fullAddress_returnsCompleteMap() {
        let address = STPAddress()
        address.city = "San Francisco"
        address.country = "US"
        address.line1 = "123 Main St"
        address.line2 = "Apt 4"
        address.postalCode = "94111"
        address.state = "CA"

        let result = Mappers.mapFromAddress(address: address)

        XCTAssertEqual(result["city"] as? String, "San Francisco")
        XCTAssertEqual(result["country"] as? String, "US")
        XCTAssertEqual(result["line1"] as? String, "123 Main St")
        XCTAssertEqual(result["line2"] as? String, "Apt 4")
        XCTAssertEqual(result["postalCode"] as? String, "94111")
        XCTAssertEqual(result["state"] as? String, "CA")
    }

    func test_mapFromAddress_partialAddress_returnsPartialMapWithNSNulls() {
        let address = STPAddress()
        address.city = "New York"
        address.postalCode = "10001"

        let result = Mappers.mapFromAddress(address: address)

        XCTAssertEqual(result["city"] as? String, "New York")
        XCTAssertEqual(result["postalCode"] as? String, "10001")
        XCTAssertTrue(result["country"] is NSNull)
        XCTAssertTrue(result["line1"] is NSNull)
        XCTAssertTrue(result["line2"] is NSNull)
        XCTAssertTrue(result["state"] is NSNull)
    }

    // MARK: - mapToBillingDetails Tests

    func test_mapToBillingDetails_nilInput_returnsNil() {
        let result = Mappers.mapToBillingDetails(billingDetails: nil)
        XCTAssertNil(result)
    }

    func test_mapToBillingDetails_emptyMap_returnsBillingDetailsWithNils() {
        let billingMap: NSDictionary = [:]
        let result = Mappers.mapToBillingDetails(billingDetails: billingMap)

        XCTAssertNotNil(result)
        XCTAssertNil(result?.name)
        XCTAssertNil(result?.email)
        XCTAssertNil(result?.phone)
        XCTAssertNotNil(result?.address)
        XCTAssertNil(result?.address?.city)
        XCTAssertNil(result?.address?.country)
        XCTAssertNil(result?.address?.line1)
        XCTAssertNil(result?.address?.line2)
        XCTAssertNil(result?.address?.postalCode)
        XCTAssertNil(result?.address?.state)
    }

    func test_mapToBillingDetails_fullDetails_returnsComplete() {
        let billingMap: NSDictionary = [
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "address": [
                "city": "San Francisco",
                "country": "US",
                "line1": "123 Main St",
                "line2": "Apt 4",
                "postalCode": "94111",
                "state": "CA",
            ],
        ]

        let result = Mappers.mapToBillingDetails(billingDetails: billingMap)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.name, "John Doe")
        XCTAssertEqual(result?.email, "john@example.com")
        XCTAssertEqual(result?.phone, "+1234567890")
        XCTAssertEqual(result?.address?.city, "San Francisco")
        XCTAssertEqual(result?.address?.country, "US")
        XCTAssertEqual(result?.address?.line1, "123 Main St")
        XCTAssertEqual(result?.address?.line2, "Apt 4")
        XCTAssertEqual(result?.address?.postalCode, "94111")
        XCTAssertEqual(result?.address?.state, "CA")
    }

    func test_mapToBillingDetails_onlyName_returnsPartialDetails() {
        let billingMap: NSDictionary = [
            "name": "Jane Smith"
        ]

        let result = Mappers.mapToBillingDetails(billingDetails: billingMap)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.name, "Jane Smith")
        XCTAssertNil(result?.email)
        XCTAssertNil(result?.phone)
    }

    func test_mapToBillingDetails_onlyEmail_returnsPartialDetails() {
        let billingMap: NSDictionary = [
            "email": "test@example.com"
        ]

        let result = Mappers.mapToBillingDetails(billingDetails: billingMap)

        XCTAssertNotNil(result)
        XCTAssertNil(result?.name)
        XCTAssertEqual(result?.email, "test@example.com")
        XCTAssertNil(result?.phone)
    }

    func test_mapToBillingDetails_onlyPhone_returnsPartialDetails() {
        let billingMap: NSDictionary = [
            "phone": "+9876543210"
        ]

        let result = Mappers.mapToBillingDetails(billingDetails: billingMap)

        XCTAssertNotNil(result)
        XCTAssertNil(result?.name)
        XCTAssertNil(result?.email)
        XCTAssertEqual(result?.phone, "+9876543210")
    }

    func test_mapToBillingDetails_partialAddress_returnsPartialDetails() {
        let billingMap: NSDictionary = [
            "email": "test@example.com",
            "address": [
                "line1": "123 Main St",
                "postalCode": "94111",
            ],
        ]

        let result = Mappers.mapToBillingDetails(billingDetails: billingMap)

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.email, "test@example.com")
        XCTAssertNotNil(result?.address)
        XCTAssertNil(result?.address?.city)
        XCTAssertNil(result?.address?.country)
        XCTAssertEqual(result?.address?.line1, "123 Main St")
        XCTAssertNil(result?.address?.line2)
        XCTAssertEqual(result?.address?.postalCode, "94111")
        XCTAssertNil(result?.address?.state)
    }

    // MARK: - mapFromBillingDetails Tests

    func test_mapFromBillingDetails_nilInput_returnsMapWithNSNulls() {
        let result = Mappers.mapFromBillingDetails(billingDetails: nil)

        XCTAssertNotNil(result)
        XCTAssertTrue(result["email"] is NSNull)
        XCTAssertTrue(result["phone"] is NSNull)
        XCTAssertTrue(result["name"] is NSNull)

        let address = result["address"] as? NSDictionary
        XCTAssertNotNil(address)
        XCTAssertTrue(address?["city"] is NSNull)
        XCTAssertTrue(address?["postalCode"] is NSNull)
        XCTAssertTrue(address?["country"] is NSNull)
        XCTAssertTrue(address?["line1"] is NSNull)
        XCTAssertTrue(address?["line2"] is NSNull)
        XCTAssertTrue(address?["state"] is NSNull)
    }

    func test_mapFromBillingDetails_fullDetails_returnsCompleteMap() {
        let billingDetails = STPPaymentMethodBillingDetails()
        billingDetails.name = "John Doe"
        billingDetails.email = "john@example.com"
        billingDetails.phone = "+1234567890"

        let address = STPPaymentMethodAddress()
        address.city = "San Francisco"
        address.country = "US"
        address.line1 = "123 Main St"
        address.line2 = "Apt 4"
        address.postalCode = "94111"
        address.state = "CA"
        billingDetails.address = address

        let result = Mappers.mapFromBillingDetails(billingDetails: billingDetails)

        XCTAssertEqual(result["name"] as? String, "John Doe")
        XCTAssertEqual(result["email"] as? String, "john@example.com")
        XCTAssertEqual(result["phone"] as? String, "+1234567890")

        let addressResult = result["address"] as? NSDictionary
        XCTAssertNotNil(addressResult)
        XCTAssertEqual(addressResult?["city"] as? String, "San Francisco")
        XCTAssertEqual(addressResult?["country"] as? String, "US")
        XCTAssertEqual(addressResult?["line1"] as? String, "123 Main St")
        XCTAssertEqual(addressResult?["line2"] as? String, "Apt 4")
        XCTAssertEqual(addressResult?["postalCode"] as? String, "94111")
        XCTAssertEqual(addressResult?["state"] as? String, "CA")
    }

    func test_mapFromBillingDetails_partialDetails_returnsPartialMapWithNSNulls() {
        let billingDetails = STPPaymentMethodBillingDetails()
        billingDetails.name = "Jane Smith"

        let result = Mappers.mapFromBillingDetails(billingDetails: billingDetails)

        XCTAssertEqual(result["name"] as? String, "Jane Smith")
        XCTAssertTrue(result["email"] is NSNull)
        XCTAssertTrue(result["phone"] is NSNull)
    }

    // MARK: - intToCardBrand Tests

    func test_intToCardBrand_allValidValues_returnsMappedBrands() {
        XCTAssertEqual(Mappers.intToCardBrand(int: 0), STPCardBrand.JCB)
        XCTAssertEqual(Mappers.intToCardBrand(int: 1), STPCardBrand.amex)
        XCTAssertEqual(Mappers.intToCardBrand(int: 2), STPCardBrand.cartesBancaires)
        XCTAssertEqual(Mappers.intToCardBrand(int: 3), STPCardBrand.dinersClub)
        XCTAssertEqual(Mappers.intToCardBrand(int: 4), STPCardBrand.discover)
        XCTAssertEqual(Mappers.intToCardBrand(int: 5), STPCardBrand.mastercard)
        XCTAssertEqual(Mappers.intToCardBrand(int: 6), STPCardBrand.unionPay)
        XCTAssertEqual(Mappers.intToCardBrand(int: 7), STPCardBrand.visa)
        XCTAssertEqual(Mappers.intToCardBrand(int: 8), STPCardBrand.unknown)
    }

    func test_intToCardBrand_invalidIndex_returnsNil() {
        XCTAssertNil(Mappers.intToCardBrand(int: 99))
        XCTAssertNil(Mappers.intToCardBrand(int: -1))
        XCTAssertNil(Mappers.intToCardBrand(int: 100))
    }

    // MARK: - mapFromCardBrand / mapToCardBrand Tests

    func test_mapFromCardBrand_allBrands_returnsCorrectStrings() {
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.visa), "Visa")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.amex), "AmericanExpress")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.mastercard), "MasterCard")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.discover), "Discover")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.JCB), "JCB")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.dinersClub), "DinersClub")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.unionPay), "UnionPay")
        XCTAssertEqual(Mappers.mapFromCardBrand(STPCardBrand.unknown), "Unknown")
    }

    func test_mapToCardBrand_allValidStrings_returnsCorrectBrands() {
        XCTAssertEqual(Mappers.mapToCardBrand("Visa"), STPCardBrand.visa)
        XCTAssertEqual(Mappers.mapToCardBrand("AmericanExpress"), STPCardBrand.amex)
        XCTAssertEqual(Mappers.mapToCardBrand("MasterCard"), STPCardBrand.mastercard)
        XCTAssertEqual(Mappers.mapToCardBrand("Discover"), STPCardBrand.discover)
        XCTAssertEqual(Mappers.mapToCardBrand("JCB"), STPCardBrand.JCB)
        XCTAssertEqual(Mappers.mapToCardBrand("DinersClub"), STPCardBrand.dinersClub)
        XCTAssertEqual(Mappers.mapToCardBrand("UnionPay"), STPCardBrand.unionPay)
        XCTAssertEqual(Mappers.mapToCardBrand("Unknown"), STPCardBrand.unknown)
    }

    func test_mapToCardBrand_invalidString_returnsUnknown() {
        XCTAssertEqual(Mappers.mapToCardBrand("InvalidBrand"), STPCardBrand.unknown)
        XCTAssertEqual(Mappers.mapToCardBrand(""), STPCardBrand.unknown)
    }

    func test_mapToCardBrand_nilInput_returnsUnknown() {
        XCTAssertEqual(Mappers.mapToCardBrand(nil), STPCardBrand.unknown)
    }

    // MARK: - mapFromPaymentMethodType / mapToPaymentMethodType Tests

    func test_mapPaymentMethodType_cardTypes_returnsCorrectStrings() {
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .card), "Card")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .alipay), "Alipay")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .iDEAL), "Ideal")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .SEPADebit), "SepaDebit")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .USBankAccount), "USBankAccount")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .payPal), "PayPal")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .affirm), "Affirm")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .cashApp), "CashApp")
        XCTAssertEqual(Mappers.mapPaymentMethodType(type: .klarna), "Klarna")
    }

    func test_mapToPaymentMethodType_allValidStrings_returnsCorrectTypes() {
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "Card"), STPPaymentMethodType.card)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "Alipay"), STPPaymentMethodType.alipay)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "Ideal"), STPPaymentMethodType.iDEAL)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "SepaDebit"), STPPaymentMethodType.SEPADebit)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "USBankAccount"), STPPaymentMethodType.USBankAccount)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "PayPal"), STPPaymentMethodType.payPal)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "Affirm"), STPPaymentMethodType.affirm)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "CashApp"), STPPaymentMethodType.cashApp)
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "Klarna"), STPPaymentMethodType.klarna)
    }

    func test_mapToPaymentMethodType_invalidString_returnsUnknown() {
        XCTAssertEqual(Mappers.mapToPaymentMethodType(type: "InvalidType"), STPPaymentMethodType.unknown)
    }

    func test_mapToPaymentMethodType_nilInput_returnsNil() {
        XCTAssertNil(Mappers.mapToPaymentMethodType(type: nil))
    }

    // MARK: - US Bank Account Type Mappers

    func test_mapFromUSBankAccountHolderType_allTypes_returnsCorrectStrings() {
        XCTAssertEqual(Mappers.mapFromUSBankAccountHolderType(type: .company), "Company")
        XCTAssertEqual(Mappers.mapFromUSBankAccountHolderType(type: .individual), "Individual")
        XCTAssertEqual(Mappers.mapFromUSBankAccountHolderType(type: .unknown), "Unknown")
    }

    func test_mapToUSBankAccountHolderType_allValidStrings_returnsCorrectTypes() {
        XCTAssertEqual(Mappers.mapToUSBankAccountHolderType(type: "Company"), .company)
        XCTAssertEqual(Mappers.mapToUSBankAccountHolderType(type: "Individual"), .individual)
    }

    func test_mapToUSBankAccountHolderType_invalidString_returnsIndividual() {
        XCTAssertEqual(Mappers.mapToUSBankAccountHolderType(type: "Invalid"), .individual)
        XCTAssertEqual(Mappers.mapToUSBankAccountHolderType(type: nil), .individual)
    }

    func test_mapFromUSBankAccountType_allTypes_returnsCorrectStrings() {
        XCTAssertEqual(Mappers.mapFromUSBankAccountType(type: .savings), "Savings")
        XCTAssertEqual(Mappers.mapFromUSBankAccountType(type: .checking), "Checking")
        XCTAssertEqual(Mappers.mapFromUSBankAccountType(type: .unknown), "Unknown")
    }

    func test_mapToUSBankAccountType_allValidStrings_returnsCorrectTypes() {
        XCTAssertEqual(Mappers.mapToUSBankAccountType(type: "Savings"), .savings)
        XCTAssertEqual(Mappers.mapToUSBankAccountType(type: "Checking"), .checking)
    }

    func test_mapToUSBankAccountType_invalidString_returnsChecking() {
        XCTAssertEqual(Mappers.mapToUSBankAccountType(type: "Invalid"), .checking)
        XCTAssertEqual(Mappers.mapToUSBankAccountType(type: nil), .checking)
    }

    // MARK: - Intent Status Mappers

    func test_mapIntentStatus_paymentIntent_allStatuses() {
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.succeeded), "Succeeded")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.requiresPaymentMethod), "RequiresPaymentMethod")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.requiresConfirmation), "RequiresConfirmation")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.canceled), "Canceled")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.processing), "Processing")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.requiresAction), "RequiresAction")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPPaymentIntentStatus.requiresCapture), "RequiresCapture")
    }

    func test_mapIntentStatus_setupIntent_allStatuses() {
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.succeeded), "Succeeded")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.requiresPaymentMethod), "RequiresPaymentMethod")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.requiresConfirmation), "RequiresConfirmation")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.canceled), "Canceled")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.processing), "Processing")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.requiresAction), "RequiresAction")
        XCTAssertEqual(Mappers.mapIntentStatus(status: STPSetupIntentStatus.unknown), "Unknown")
    }

    func test_mapIntentStatus_nilInput_returnsUnknown() {
        let nilStatus: STPPaymentIntentStatus? = nil
        XCTAssertEqual(Mappers.mapIntentStatus(status: nilStatus), "Unknown")

        let nilSetupStatus: STPSetupIntentStatus? = nil
        XCTAssertEqual(Mappers.mapIntentStatus(status: nilSetupStatus), "Unknown")
    }

    // MARK: - Capture Method Mappers

    func test_mapCaptureMethod_allMethods() {
        XCTAssertEqual(Mappers.mapCaptureMethod(.automatic), "Automatic")
        XCTAssertEqual(Mappers.mapCaptureMethod(.manual), "Manual")
    }

    func test_mapCaptureMethod_nilInput_returnsUnknown() {
        let nilCaptureMethod: STPPaymentIntentCaptureMethod? = nil
        XCTAssertEqual(Mappers.mapCaptureMethod(nilCaptureMethod), "Unknown")
    }

    // MARK: - Confirmation Method Mappers

    func test_mapConfirmationMethod_allMethods() {
        XCTAssertEqual(Mappers.mapConfirmationMethod(.automatic), "Automatic")
        XCTAssertEqual(Mappers.mapConfirmationMethod(.manual), "Manual")
    }

    func test_mapConfirmationMethod_nilInput_returnsUnknown() {
        let nilConfirmationMethod: STPPaymentIntentConfirmationMethod? = nil
        XCTAssertEqual(Mappers.mapConfirmationMethod(nilConfirmationMethod), "Unknown")
    }

    // MARK: - Setup Intent Usage Mappers

    func test_mapFromSetupIntentUsage_allUsages() {
        XCTAssertEqual(Mappers.mapFromSetupIntentUsage(usage: STPSetupIntentUsage.none), "None")
        XCTAssertEqual(Mappers.mapFromSetupIntentUsage(usage: STPSetupIntentUsage.offSession), "OffSession")
        XCTAssertEqual(Mappers.mapFromSetupIntentUsage(usage: STPSetupIntentUsage.onSession), "OnSession")
        XCTAssertEqual(Mappers.mapFromSetupIntentUsage(usage: STPSetupIntentUsage.unknown), "Unknown")
    }

    func test_mapFromSetupIntentUsage_nilInput_returnsUnknown() {
        let nilUsage: STPSetupIntentUsage? = nil
        XCTAssertEqual(Mappers.mapFromSetupIntentUsage(usage: nilUsage), "Unknown")
    }

    func test_mapToPaymentIntentFutureUsage_allUsages() {
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: "None"), .none)
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: "OffSession"), .offSession)
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: "OnSession"), .onSession)
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: "Unknown"), .unknown)
    }

    func test_mapToPaymentIntentFutureUsage_invalidInput_returnsUnknown() {
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: "Invalid"), .unknown)
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: nil), .unknown)
        XCTAssertEqual(Mappers.mapToPaymentIntentFutureUsage(usage: ""), .unknown)
    }

    // MARK: - User Interface Style Mappers

    @available(iOS 13.0, *)
    func test_mapToUserInterfaceStyle_allStyles() {
        XCTAssertEqual(Mappers.mapToUserInterfaceStyle("alwaysDark"), .alwaysDark)
        XCTAssertEqual(Mappers.mapToUserInterfaceStyle("alwaysLight"), .alwaysLight)
        XCTAssertEqual(Mappers.mapToUserInterfaceStyle("automatic"), .automatic)
    }

    @available(iOS 13.0, *)
    func test_mapToUserInterfaceStyle_invalidInput_returnsAutomatic() {
        XCTAssertEqual(Mappers.mapToUserInterfaceStyle("invalid"), .automatic)
        XCTAssertEqual(Mappers.mapToUserInterfaceStyle(nil), .automatic)
        XCTAssertEqual(Mappers.mapToUserInterfaceStyle(""), .automatic)
    }

    // MARK: - Return URL Mappers

    func test_mapToReturnURL_validScheme() {
        XCTAssertEqual(Mappers.mapToReturnURL(urlScheme: "myapp"), "myapp://safepay")
        XCTAssertEqual(Mappers.mapToReturnURL(urlScheme: "com.example.app"), "com.example.app://safepay")
    }

    func test_mapToReturnURL_emptyScheme() {
        XCTAssertEqual(Mappers.mapToReturnURL(urlScheme: ""), "://safepay")
    }

    func test_mapToFinancialConnectionsReturnURL_validScheme() {
        XCTAssertEqual(
            Mappers.mapToFinancialConnectionsReturnURL(urlScheme: "myapp"),
            "myapp://financial_connections_redirect"
        )
        XCTAssertEqual(
            Mappers.mapToFinancialConnectionsReturnURL(urlScheme: "com.example.app"),
            "com.example.app://financial_connections_redirect"
        )
    }

    func test_mapToFinancialConnectionsReturnURL_emptyScheme() {
        XCTAssertEqual(
            Mappers.mapToFinancialConnectionsReturnURL(urlScheme: ""),
            "://financial_connections_redirect"
        )
    }

    // MARK: - Date Conversion Tests

    func test_convertDateToUnixTimestampMilliseconds_validDate() {
        // Create a known date: January 1, 2020, 00:00:00 UTC
        let dateComponents = DateComponents(year: 2020, month: 1, day: 1, hour: 0, minute: 0, second: 0)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!

        if let date = calendar.date(from: dateComponents) {
            let result = Mappers.convertDateToUnixTimestampMilliseconds(date: date)
            XCTAssertNotNil(result)
            // 2020-01-01 00:00:00 UTC = 1577836800000 milliseconds
            XCTAssertEqual(result, "1577836800000")
        } else {
            XCTFail("Failed to create test date")
        }
    }

    func test_convertDateToUnixTimestampMilliseconds_nilDate_returnsNil() {
        XCTAssertNil(Mappers.convertDateToUnixTimestampMilliseconds(date: nil))
    }

    func test_convertDateToUnixTimestampSeconds_validDate() {
        // Create a known date: January 1, 2020, 00:00:00 UTC
        let dateComponents = DateComponents(year: 2020, month: 1, day: 1, hour: 0, minute: 0, second: 0)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!

        if let date = calendar.date(from: dateComponents) {
            let result = Mappers.convertDateToUnixTimestampSeconds(date: date)
            XCTAssertNotNil(result)
            // 2020-01-01 00:00:00 UTC = 1577836800 seconds
            XCTAssertEqual(result?.intValue, 1577836800)
        } else {
            XCTFail("Failed to create test date")
        }
    }

    func test_convertDateToUnixTimestampSeconds_nilDate_returnsNil() {
        XCTAssertNil(Mappers.convertDateToUnixTimestampSeconds(date: nil))
    }

    // MARK: - Card Validation State Mappers

    func test_mapFromCardValidationState_allStates() {
        XCTAssertEqual(Mappers.mapFromCardValidationState(state: .valid), "Valid")
        XCTAssertEqual(Mappers.mapFromCardValidationState(state: .invalid), "Invalid")
        XCTAssertEqual(Mappers.mapFromCardValidationState(state: .incomplete), "Incomplete")
    }

    func test_mapFromCardValidationState_nilInput_returnsUnknown() {
        let nilState: STPCardValidationState? = nil
        XCTAssertEqual(Mappers.mapFromCardValidationState(state: nilState), "Unknown")
    }

    // MARK: - PKAddPassButtonStyle Mapper

    func test_mapToPKAddPassButtonStyle_onDarkBackground() {
        XCTAssertEqual(Mappers.mapToPKAddPassButtonStyle(style: "onDarkBackground"), .blackOutline)
    }

    func test_mapToPKAddPassButtonStyle_defaultStyle() {
        XCTAssertEqual(Mappers.mapToPKAddPassButtonStyle(style: nil), .black)
        XCTAssertEqual(Mappers.mapToPKAddPassButtonStyle(style: ""), .black)
        XCTAssertEqual(Mappers.mapToPKAddPassButtonStyle(style: "invalid"), .black)
    }

    // MARK: - Error Type Mappers

    func test_mapFromPaymentIntentLastPaymentErrorType_allTypes() {
        XCTAssertEqual(
            Mappers.mapFromPaymentIntentLastPaymentErrorType(.apiConnection),
            "api_connection_error"
        )
        XCTAssertEqual(Mappers.mapFromPaymentIntentLastPaymentErrorType(.api), "api_error")
        XCTAssertEqual(
            Mappers.mapFromPaymentIntentLastPaymentErrorType(.authentication),
            "authentication_error"
        )
        XCTAssertEqual(Mappers.mapFromPaymentIntentLastPaymentErrorType(.card), "card_error")
        XCTAssertEqual(
            Mappers.mapFromPaymentIntentLastPaymentErrorType(.idempotency),
            "idempotency_error"
        )
        XCTAssertEqual(
            Mappers.mapFromPaymentIntentLastPaymentErrorType(.invalidRequest),
            "invalid_request_error"
        )
        XCTAssertEqual(
            Mappers.mapFromPaymentIntentLastPaymentErrorType(.rateLimit),
            "rate_limit_error"
        )
        XCTAssertEqual(Mappers.mapFromPaymentIntentLastPaymentErrorType(.unknown), nil)
    }

    func test_mapFromPaymentIntentLastPaymentErrorType_nilInput_returnsNil() {
        let nilErrorType: STPPaymentIntentLastPaymentErrorType? = nil
        XCTAssertNil(Mappers.mapFromPaymentIntentLastPaymentErrorType(nilErrorType))
    }

    func test_mapFromSetupIntentLastPaymentErrorType_allTypes() {
        XCTAssertEqual(
            Mappers.mapFromSetupIntentLastPaymentErrorType(.apiConnection),
            "api_connection_error"
        )
        XCTAssertEqual(Mappers.mapFromSetupIntentLastPaymentErrorType(.API), "api_error")
        XCTAssertEqual(
            Mappers.mapFromSetupIntentLastPaymentErrorType(.authentication),
            "authentication_error"
        )
        XCTAssertEqual(Mappers.mapFromSetupIntentLastPaymentErrorType(.card), "card_error")
        XCTAssertEqual(
            Mappers.mapFromSetupIntentLastPaymentErrorType(.idempotency),
            "idempotency_error"
        )
        XCTAssertEqual(
            Mappers.mapFromSetupIntentLastPaymentErrorType(.invalidRequest),
            "invalid_request_error"
        )
        XCTAssertEqual(
            Mappers.mapFromSetupIntentLastPaymentErrorType(.rateLimit),
            "rate_limit_error"
        )
        XCTAssertEqual(Mappers.mapFromSetupIntentLastPaymentErrorType(.unknown), nil)
    }

    func test_mapFromSetupIntentLastPaymentErrorType_nilInput_returnsNil() {
        let nilErrorType: STPSetupIntentLastSetupErrorType? = nil
        XCTAssertNil(Mappers.mapFromSetupIntentLastPaymentErrorType(nilErrorType))
    }

    // MARK: - Funding Type Mappers

    func test_mapFromFunding_allTypes() {
        XCTAssertEqual(Mappers.mapFromFunding(.credit), "Credit")
        XCTAssertEqual(Mappers.mapFromFunding(.debit), "Debit")
        XCTAssertEqual(Mappers.mapFromFunding(.prepaid), "Prepaid")
        XCTAssertEqual(Mappers.mapFromFunding(.other), "Unknown")
    }

    func test_mapFromFunding_nilInput_returnsNil() {
        let nilFunding: STPCardFundingType? = nil
        XCTAssertNil(Mappers.mapFromFunding(nilFunding))
    }

    // MARK: - Token Type Mappers

    func test_mapFromTokenType_allTypes() {
        XCTAssertEqual(Mappers.mapFromTokenType(.PII), "Pii")
        XCTAssertEqual(Mappers.mapFromTokenType(.account), "Account")
        XCTAssertEqual(Mappers.mapFromTokenType(.bankAccount), "BankAccount")
        XCTAssertEqual(Mappers.mapFromTokenType(.card), "Card")
        XCTAssertEqual(Mappers.mapFromTokenType(.cvcUpdate), "CvcUpdate")
    }

    func test_mapFromTokenType_nilInput_returnsNil() {
        let nilTokenType: STPTokenType? = nil
        XCTAssertNil(Mappers.mapFromTokenType(nilTokenType))
    }

    // MARK: - Bank Account Holder Type Mappers

    func test_mapFromBankAccountHolderType_allTypes() {
        XCTAssertEqual(Mappers.mapFromBankAccountHolderType(.company), "Company")
        XCTAssertEqual(Mappers.mapFromBankAccountHolderType(.individual), "Individual")
    }

    func test_mapFromBankAccountHolderType_nilInput_returnsNil() {
        let nilHolderType: STPBankAccountHolderType? = nil
        XCTAssertNil(Mappers.mapFromBankAccountHolderType(nilHolderType))
    }

    func test_mapToBankAccountHolderType_allTypes() {
        XCTAssertEqual(Mappers.mapToBankAccountHolderType("Company"), .company)
        XCTAssertEqual(Mappers.mapToBankAccountHolderType("Individual"), .individual)
    }

    func test_mapToBankAccountHolderType_invalidInput_returnsIndividual() {
        XCTAssertEqual(Mappers.mapToBankAccountHolderType("Invalid"), .individual)
        XCTAssertEqual(Mappers.mapToBankAccountHolderType(nil), .individual)
        XCTAssertEqual(Mappers.mapToBankAccountHolderType(""), .individual)
    }

    // MARK: - Bank Account Status Mappers

    func test_mapFromBankAccountStatus_allStatuses() {
        XCTAssertEqual(Mappers.mapFromBankAccountStatus(.errored), "Errored")
        XCTAssertEqual(Mappers.mapFromBankAccountStatus(.new), "New")
        XCTAssertEqual(Mappers.mapFromBankAccountStatus(.validated), "Validated")
        XCTAssertEqual(Mappers.mapFromBankAccountStatus(.verified), "Verified")
        XCTAssertEqual(Mappers.mapFromBankAccountStatus(.verificationFailed), "VerificationFailed")
    }

    func test_mapFromBankAccountStatus_nilInput_returnsNil() {
        let nilStatus: STPBankAccountStatus? = nil
        XCTAssertNil(Mappers.mapFromBankAccountStatus(nilStatus))
    }

    // MARK: - Allow Redisplay Mapper

    func test_mapFromAllowRedisplay_allValues() {
        XCTAssertEqual(Mappers.mapFromAllowRedisplay(allowRedisplay: .always), "always")
        XCTAssertEqual(Mappers.mapFromAllowRedisplay(allowRedisplay: .limited), "limited")
        XCTAssertEqual(Mappers.mapFromAllowRedisplay(allowRedisplay: .unspecified), "unspecified")
    }

    func test_mapFromAllowRedisplay_nilInput_returnsNil() {
        XCTAssertNil(Mappers.mapFromAllowRedisplay(allowRedisplay: nil))
    }

    // MARK: - Setup Future Usage Mapper

    func test_mapFromSetupFutureUsage_allValues() {
        XCTAssertEqual(Mappers.mapFromSetupFutureUsage(setupFutureUsage: .offSession), "OffSession")
        XCTAssertEqual(Mappers.mapFromSetupFutureUsage(setupFutureUsage: .onSession), "OnSession")
        XCTAssertEqual(Mappers.mapFromSetupFutureUsage(setupFutureUsage: STPPaymentIntentSetupFutureUsage.none), "None")
    }

    func test_mapFromSetupFutureUsage_nilInput_returnsNil() {
        XCTAssertNil(Mappers.mapFromSetupFutureUsage(setupFutureUsage: nil))
    }

    // MARK: - PKContactField Mapper

    func test_mapToPKContactField_allFields() {
        XCTAssertEqual(Mappers.mapToPKContactField(field: "emailAddress"), .emailAddress)
        XCTAssertEqual(Mappers.mapToPKContactField(field: "name"), .name)
        XCTAssertEqual(Mappers.mapToPKContactField(field: "phoneNumber"), .phoneNumber)
        XCTAssertEqual(Mappers.mapToPKContactField(field: "phoneticName"), .phoneticName)
        XCTAssertEqual(Mappers.mapToPKContactField(field: "postalAddress"), .postalAddress)
    }

    func test_mapToPKContactField_invalidField_returnsName() {
        // Default is .name for unknown fields
        XCTAssertEqual(Mappers.mapToPKContactField(field: "invalid"), .name)
        XCTAssertEqual(Mappers.mapToPKContactField(field: ""), .name)
        XCTAssertEqual(Mappers.mapToPKContactField(field: "unknown"), .name)
    }

    // MARK: - Address Fields Mapper

    func test_mapAddressFields_allValidFields() {
        let fields = ["street", "city", "subAdministrativeArea", "state", "postalCode", "country", "countryCode", "subLocality"]
        let result = Mappers.mapAddressFields(fields)

        XCTAssertEqual(result.count, 8)
        XCTAssertTrue(result.contains(CNPostalAddressStreetKey))
        XCTAssertTrue(result.contains(CNPostalAddressCityKey))
        XCTAssertTrue(result.contains(CNPostalAddressSubAdministrativeAreaKey))
        XCTAssertTrue(result.contains(CNPostalAddressStateKey))
        XCTAssertTrue(result.contains(CNPostalAddressPostalCodeKey))
        XCTAssertTrue(result.contains(CNPostalAddressCountryKey))
        XCTAssertTrue(result.contains(CNPostalAddressISOCountryCodeKey))
        XCTAssertTrue(result.contains(CNPostalAddressSubLocalityKey))
    }

    func test_mapAddressFields_emptyArray_returnsEmptyArray() {
        let result = Mappers.mapAddressFields([])
        XCTAssertTrue(result.isEmpty)
    }

    func test_mapAddressFields_invalidFields_returnsEmptyStrings() {
        let fields = ["invalid", "unknown"]
        let result = Mappers.mapAddressFields(fields)

        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(result[0], "")
        XCTAssertEqual(result[1], "")
    }

    func test_mapAddressFields_mixedValidInvalid() {
        let fields = ["city", "invalid", "postalCode"]
        let result = Mappers.mapAddressFields(fields)

        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(result[0], CNPostalAddressCityKey)
        XCTAssertEqual(result[1], "")
        XCTAssertEqual(result[2], CNPostalAddressPostalCodeKey)
    }

    // MARK: - createResult Helper

    func test_createResult_withValue() {
        let value: NSDictionary = ["test": "data"]
        let result = Mappers.createResult("myKey", value)

        XCTAssertNotNil(result["myKey"])
        let myKeyValue = result["myKey"] as? NSDictionary
        XCTAssertEqual(myKeyValue?["test"] as? String, "data")
    }

    func test_createResult_withNilValue() {
        let result = Mappers.createResult("myKey", nil)

        XCTAssertNotNil(result["myKey"])
        XCTAssertTrue(result["myKey"] is NSNull)
    }

    func test_createResult_withAdditionalFields() {
        let value: NSDictionary = ["test": "data"]
        let additionalFields = ["extra": "field", "another": 123] as [String: Any]
        let result = Mappers.createResult("myKey", value, additionalFields: additionalFields)

        XCTAssertNotNil(result["myKey"])
        XCTAssertEqual(result["extra"] as? String, "field")
        XCTAssertEqual(result["another"] as? Int, 123)
    }
}
