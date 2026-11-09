import Stripe
@testable import stripe_react_native
import XCTest

class PaymentMethodFactoryTests: XCTestCase {
    func test_createCardPaymentMethodParams_cardFieldPath_setsMetadata() throws {
        let cardField = CardFieldView(frame: .zero)
        let cardParams = STPPaymentMethodCardParams()
        cardParams.number = "4242424242424242"
        cardParams.expMonth = NSNumber(value: 12)
        cardParams.expYear = NSNumber(value: 2030)
        cardParams.cvc = "123"
        cardField.cardParams = STPPaymentMethodParams(card: cardParams, billingDetails: nil, metadata: nil)

        let metadata: [String: String] = ["order_id": "1234"]
        let factory = PaymentMethodFactory(
            paymentMethodData: ["metadata": metadata],
            options: [:],
            cardFieldView: cardField,
            cardFormView: nil
        )

        let params = try factory.createParams(paymentMethodType: .card)

        XCTAssertEqual(params?.metadata?["order_id"], "1234")
    }

    func test_createCardPaymentMethodParams_tokenPath_setsMetadata() throws {
        let metadata: [String: String] = ["order_id": "1234"]
        let factory = PaymentMethodFactory(
            paymentMethodData: [
                "token": "tok_visa",
                "metadata": metadata,
            ],
            options: [:],
            cardFieldView: nil,
            cardFormView: nil
        )

        let params = try factory.createParams(paymentMethodType: .card)

        XCTAssertEqual(params?.metadata?["order_id"], "1234")
    }
}
