@testable import stripe_react_native
@testable @_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import UIKit
import XCTest

@MainActor
final class CheckoutSessionSerializerTests: XCTestCase {
    func test_serialize_preservesNativeAmountsAndItemStructure() throws {
        let session = try CheckoutTestFixtures.session()
        let result = CheckoutSessionSerializer.serialize(session)
        let groups = try XCTUnwrap(result["orderSummaryItems"] as? [[String: Any]])
        let items = try XCTUnwrap(groups.first?["items"] as? [[String: Any]])
        let item = try XCTUnwrap(items.first)
        let amounts = try XCTUnwrap(item["amountDetails"] as? [String: Any])
        let total = try XCTUnwrap(amounts["total"] as? [String: Any])
        let unitAmount = try XCTUnwrap(item["unitAmount"] as? [String: Any])
        let decimal = try XCTUnwrap(item["unitAmountDecimal"] as? [String: Any])

        XCTAssertNil(groups.first?["amountDetails"])
        XCTAssertEqual(item["key"] as? String, "item_1")
        XCTAssertEqual(item["quantity"] as? Int, 2)
        XCTAssertEqual(total["minorUnitsAmount"] as? Double, 2250)
        XCTAssertEqual(unitAmount["minorUnitsAmount"] as? Double, 1050)
        XCTAssertEqual(decimal["minorUnitsAmount"] as? Double, 1050.25)
        if case .oneTimePrice(let group) = session.orderSummaryItems[0] {
            XCTAssertEqual(total["amount"] as? String, group.items[0].amountDetails.total.amount)
        }
        XCTAssertEqual(item["adjustableQuantity"] as? NSDictionary, ["enabled": true, "minimum": 1, "maximum": 5])
        XCTAssertNil(result["paymentOption"])
        XCTAssertNil(result["shippingAddress"])
        XCTAssertTrue(JSONSerialization.isValidJSONObject(result))
    }

    func test_serialize_preservesPartialBillingAddressesAndMandateLinks() throws {
        let billingDetails = CheckoutController.Session.PaymentOptionDisplayData.BillingDetails(
            address: .init(
                city: nil,
                country: nil,
                line1: nil,
                line2: nil,
                postalCode: "94103",
                state: nil
            ),
            email: nil,
            name: nil,
            phone: nil
        )
        let image = UIGraphicsImageRenderer(size: CGSize(width: 2, height: 2)).image { context in
            UIColor.red.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 2, height: 2))
        }
        let option = CheckoutController.Session.PaymentOptionDisplayData(
            image: image,
            label: "Visa 4242",
            billingDetails: billingDetails,
            paymentMethodType: "card",
            mandateText: NSAttributedString(string: "Terms & conditions", attributes: [
                .link: URL(string: "https://example.com/terms")!,
            ])
        )
        var session = try CheckoutTestFixtures.session()
        session.localState.paymentOption = option
        let result = CheckoutSessionSerializer.serialize(session)
        let paymentOption = try XCTUnwrap(result["paymentOption"] as? [String: Any])
        let billing = try XCTUnwrap(paymentOption["billingDetails"] as? [String: Any])
        let address = try XCTUnwrap(billing["address"] as? [String: Any])

        XCTAssertEqual(address["postalCode"] as? String, "94103")
        XCTAssertNil(address["country"])
        XCTAssertEqual(paymentOption["image"] as? String, image.pngData()?.base64EncodedString())
        let html = try XCTUnwrap(paymentOption["mandateHTML"] as? String)
        XCTAssertTrue(html.contains("https://example.com/terms"))
        XCTAssertTrue(html.contains("&amp;"))
        XCTAssertTrue(JSONSerialization.isValidJSONObject(result))
    }

    func test_serialize_preservesCompletionPaymentStatus() throws {
        for (nativeStatus, expected) in [("paid", "paid"), ("unpaid", "unpaid"), ("no_payment_required", "noPaymentRequired")] {
            let session = try CheckoutTestFixtures.session(status: "complete", paymentStatus: nativeStatus)
            let result = CheckoutSessionSerializer.serialize(session)
            XCTAssertEqual(result["status"] as? NSDictionary, ["type": "complete", "paymentStatus": expected])
        }
        let expired = CheckoutSessionSerializer.serialize(try CheckoutTestFixtures.session(status: "expired"))
        XCTAssertEqual(expired["status"] as? NSDictionary, ["type": "expired"])
    }
}
