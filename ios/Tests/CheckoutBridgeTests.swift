@testable import stripe_react_native
@_spi(CheckoutSessionsPreview) import StripePaymentSheet
import XCTest

class CheckoutBridgeTests: XCTestCase {
    func test_mapFromCheckoutAddressUpdate_mapsOptionalFields() throws {
        let addressUpdate = Checkout.AddressUpdate(
            name: "Billing Name",
            phone: "+15555550101",
            address: Checkout.Address(
                country: "US",
                line1: "123 Billing St",
                line2: "Suite 4",
                city: "San Francisco",
                state: "CA",
                postalCode: "94111"
            )
        )

        let mapped = Mappers.mapFromCheckoutAddressUpdate(addressUpdate)

        XCTAssertEqual(mapped["name"] as? String, "Billing Name")
        XCTAssertEqual(mapped["phone"] as? String, "+15555550101")

        let address = try XCTUnwrap(mapped["address"] as? NSDictionary)
        XCTAssertEqual(address["country"] as? String, "US")
        XCTAssertEqual(address["line1"] as? String, "123 Billing St")
        XCTAssertEqual(address["line2"] as? String, "Suite 4")
        XCTAssertEqual(address["city"] as? String, "San Francisco")
        XCTAssertEqual(address["state"] as? String, "CA")
        XCTAssertEqual(address["postalCode"] as? String, "94111")
    }

    func test_mapFromCheckoutState_mapsLoadedSessionAddresses() throws {
        let mapped = Mappers.mapFromCheckoutState(.loaded(MockCheckoutSession()))

        XCTAssertEqual(mapped["status"] as? String, "loaded")

        let session = try XCTUnwrap(mapped["session"] as? NSDictionary)
        XCTAssertEqual(session["id"] as? String, "cs_test_123")
        XCTAssertEqual(session["status"] as? String, "open")
        XCTAssertEqual(session["paymentStatus"] as? String, "unpaid")
        XCTAssertEqual(session["currency"] as? String, "usd")
        XCTAssertEqual(session["livemode"] as? Bool, false)
        XCTAssertEqual(session["customerId"] as? String, "cus_123")
        XCTAssertEqual(session["customerEmail"] as? String, "customer@example.com")

        let lineItems = try XCTUnwrap(session["lineItems"] as? [NSDictionary])
        let shippingOptions = try XCTUnwrap(session["shippingOptions"] as? [NSDictionary])
        let discounts = try XCTUnwrap(session["discounts"] as? [NSDictionary])
        XCTAssertTrue(lineItems.isEmpty)
        XCTAssertTrue(shippingOptions.isEmpty)
        XCTAssertTrue(discounts.isEmpty)

        let billingAddress = try XCTUnwrap(session["billingAddress"] as? NSDictionary)
        let billingFields = try XCTUnwrap(billingAddress["address"] as? NSDictionary)
        XCTAssertEqual(billingAddress["name"] as? String, "Billing Name")
        XCTAssertEqual(billingAddress["phone"] as? String, "+15555550101")
        XCTAssertEqual(billingFields["country"] as? String, "US")
        XCTAssertEqual(billingFields["line1"] as? String, "123 Billing St")

        let shippingAddress = try XCTUnwrap(session["shippingAddress"] as? NSDictionary)
        let shippingFields = try XCTUnwrap(shippingAddress["address"] as? NSDictionary)
        XCTAssertEqual(shippingAddress["name"] as? String, "Shipping Name")
        XCTAssertEqual(shippingAddress["phone"] as? String, "+447700900000")
        XCTAssertEqual(shippingFields["country"] as? String, "GB")
        XCTAssertEqual(shippingFields["line1"] as? String, "221B Baker Street")
    }

    func test_mapFromCheckoutState_mapsLoadingStatus() {
        let mapped = Mappers.mapFromCheckoutState(.loading(MockCheckoutSession()))
        XCTAssertEqual(mapped["status"] as? String, "loading")
    }

    private struct MockCheckoutSession: Checkout.Session {
        let id = "cs_test_123"
        let mode = Checkout.Mode.payment
        let status: Checkout.Status? = .open
        let paymentStatus = Checkout.PaymentStatus.unpaid
        let currency: String? = "usd"
        let livemode = false
        let totals: Checkout.Totals? = nil
        let lineItems: [Checkout.LineItem] = []
        let shippingOptions: [Checkout.ShippingOption] = []
        let selectedShippingOption: Checkout.ShippingOption? = nil
        let discounts: [Checkout.Discount] = []
        let appliedPromotionCode: String? = nil
        let customerId: String? = "cus_123"
        let customerEmail: String? = "customer@example.com"
        let url: URL? = URL(string: "https://example.com")
        let billingAddress: Checkout.AddressUpdate? = Checkout.AddressUpdate(
            name: "Billing Name",
            phone: "+15555550101",
            address: Checkout.Address(
                country: "US",
                line1: "123 Billing St",
                city: "San Francisco",
                state: "CA",
                postalCode: "94111"
            )
        )
        let shippingAddress: Checkout.AddressUpdate? = Checkout.AddressUpdate(
            name: "Shipping Name",
            phone: "+447700900000",
            address: Checkout.Address(
                country: "GB",
                line1: "221B Baker Street",
                city: "London",
                postalCode: "NW16XE"
            )
        )
    }
}
