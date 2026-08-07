@testable import stripe_react_native
import Stripe
import XCTest

class PaymentMethodFactoryTests: XCTestCase {

    // MARK: - createCardPaymentMethodOptions: moto injection

    func test_createOptions_userKey_noCard_setsMoto() throws {
        let factory = makeFactory(publishableKey: "uk_test_abc123")

        let options = try factory.createOptions(paymentMethodType: .card)

        XCTAssertNotNil(options, "Options should be set for uk_ key")
        XCTAssertEqual(
            options?.cardOptions?.additionalAPIParameters["moto"] as? Bool,
            true,
            "moto should be true for uk_ key"
        )
    }

    func test_createOptions_publishableKey_noCard_noCvc_returnsNil() throws {
        let factory = makeFactory(publishableKey: "pk_test_abc123")

        let options = try factory.createOptions(paymentMethodType: .card)

        XCTAssertNil(options, "Options should be nil for pk_ key with no CVC")
    }

    func test_createOptions_userKey_withCvc_setsMotoAndCvc() throws {
        let factory = makeFactory(publishableKey: "uk_test_abc123", paymentMethodData: ["cvc": "123"])

        let options = try factory.createOptions(paymentMethodType: .card)

        XCTAssertNotNil(options)
        XCTAssertEqual(
            options?.cardOptions?.additionalAPIParameters["moto"] as? Bool,
            true,
            "moto should be true for uk_ key"
        )
        XCTAssertEqual(options?.cardOptions?.cvc, "123", "CVC should be preserved")
    }

    func test_createOptions_publishableKey_withCvc_doesNotSetMoto() throws {
        let factory = makeFactory(publishableKey: "pk_test_abc123", paymentMethodData: ["cvc": "123"])

        let options = try factory.createOptions(paymentMethodType: .card)

        XCTAssertNotNil(options)
        XCTAssertNil(
            options?.cardOptions?.additionalAPIParameters["moto"],
            "moto should not be set for pk_ key"
        )
        XCTAssertEqual(options?.cardOptions?.cvc, "123", "CVC should be set")
    }

    func test_createOptions_userKey_savedCard_setsMoto() throws {
        // Saved-card confirm passes paymentMethodId but no inline card params
        let factory = makeFactory(
            publishableKey: "uk_test_abc123",
            paymentMethodData: ["paymentMethodId": "pm_test_fake"]
        )

        let options = try factory.createOptions(paymentMethodType: .card)

        XCTAssertNotNil(options, "Options should be set for uk_ key even without CVC")
        XCTAssertEqual(
            options?.cardOptions?.additionalAPIParameters["moto"] as? Bool,
            true,
            "moto should be true for uk_ key with saved card"
        )
    }

    func test_createOptions_publishableKey_savedCard_returnsNil() throws {
        let factory = makeFactory(
            publishableKey: "pk_test_abc123",
            paymentMethodData: ["paymentMethodId": "pm_test_fake"]
        )

        let options = try factory.createOptions(paymentMethodType: .card)

        XCTAssertNil(options, "Options should be nil for pk_ key without CVC")
    }

    // MARK: - Non-card payment types are unaffected

    func test_createOptions_userKey_iDEAL_returnsNil() throws {
        let factory = makeFactory(publishableKey: "uk_test_abc123")

        let options = try factory.createOptions(paymentMethodType: .iDEAL)

        XCTAssertNil(options, "Non-card types should not get moto options")
    }

    // MARK: - Helpers

    private func makeFactory(
        publishableKey: String,
        paymentMethodData: NSDictionary? = nil
    ) -> PaymentMethodFactory {
        return PaymentMethodFactory(
            paymentMethodData: paymentMethodData,
            options: NSDictionary(),
            cardFieldView: nil,
            cardFormView: nil,
            publishableKey: publishableKey
        )
    }
}
