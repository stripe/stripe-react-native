@testable import stripe_react_native
import StripePaymentSheet
import XCTest

class CheckoutBridgeTests: XCTestCase {
    override func tearDown() {
        StripeSdkImpl.shared.checkoutInstances.removeAll()
        StripeSdkImpl.shared.checkoutClientSecrets.removeAll()
        StripeSdkImpl.shared.checkoutConfigurationParams.removeAll()
        StripeSdkImpl.shared.checkoutLocalOverrides.removeAll()
        super.tearDown()
    }

    func test_mapFromCheckoutStatePayload_mapsCheckoutSessionResponse() throws {
        let state = Mappers.mapFromCheckoutStatePayload(
            status: "loaded",
            sessionResponse: makeCheckoutSessionResponse()
        )

        XCTAssertEqual(state["status"] as? String, "loaded")

        let session = try XCTUnwrap(state["session"] as? NSDictionary)
        XCTAssertEqual(session["id"] as? String, "cs_test_123")
        XCTAssertEqual(session["status"] as? String, "open")
        XCTAssertEqual(session["paymentStatus"] as? String, "unpaid")
        XCTAssertEqual(session["currency"] as? String, "usd")
        XCTAssertEqual(session["livemode"] as? Bool, false)
        XCTAssertEqual(session["customerId"] as? String, "cus_123")
        XCTAssertEqual(session["customerEmail"] as? String, "customer@example.com")

        let totals = try XCTUnwrap(session["totals"] as? NSDictionary)
        XCTAssertEqual(intValue(totals["subtotal"]), 1000)
        XCTAssertEqual(intValue(totals["total"]), 1200)
        XCTAssertEqual(intValue(totals["due"]), 1200)
        XCTAssertEqual(intValue(totals["discount"]), 100)
        XCTAssertEqual(intValue(totals["shipping"]), 200)
        XCTAssertEqual(intValue(totals["tax"]), 100)

        let lineItems = try XCTUnwrap(session["lineItems"] as? [NSDictionary])
        XCTAssertEqual(lineItems.count, 1)
        XCTAssertEqual(lineItems[0]["id"] as? String, "li_123")
        XCTAssertEqual(lineItems[0]["name"] as? String, "Blue T-shirt")
        XCTAssertEqual(intValue(lineItems[0]["quantity"]), 2)
        XCTAssertEqual(intValue(lineItems[0]["unitAmount"]), 500)
        XCTAssertEqual(lineItems[0]["currency"] as? String, "usd")

        let shippingOptions = try XCTUnwrap(session["shippingOptions"] as? [NSDictionary])
        XCTAssertEqual(shippingOptions.count, 1)
        XCTAssertEqual(shippingOptions[0]["id"] as? String, "shr_standard")
        XCTAssertEqual(shippingOptions[0]["displayName"] as? String, "Standard")
        XCTAssertEqual(intValue(shippingOptions[0]["amount"]), 200)
        XCTAssertEqual(shippingOptions[0]["currency"] as? String, "usd")
        XCTAssertEqual(
            shippingOptions[0]["deliveryEstimate"] as? String,
            "3-5 business_days"
        )

        let discounts = try XCTUnwrap(session["discounts"] as? [NSDictionary])
        XCTAssertEqual(discounts.count, 1)
        XCTAssertEqual(intValue(discounts[0]["amount"]), 100)
        XCTAssertEqual(discounts[0]["promotionCode"] as? String, "SPRING")

        let coupon = try XCTUnwrap(discounts[0]["coupon"] as? NSDictionary)
        XCTAssertEqual(coupon["id"] as? String, "coupon_123")
        XCTAssertEqual(coupon["name"] as? String, "Spring Sale")
        XCTAssertEqual(intValue(coupon["percentOff"]), 10)
    }

    func test_mapFromCheckoutStatePayload_appliesLocalOverrides() throws {
        let overrides = CheckoutLocalOverrides(
            billingAddress: CheckoutAddressOverride(
                country: "US",
                line1: "123 Billing St",
                city: "San Francisco",
                state: "CA",
                postalCode: "94111",
                name: "Billing Name",
                phone: "+15555550101"
            ),
            shippingAddress: CheckoutAddressOverride(
                country: "GB",
                line1: "221B Baker Street",
                line2: "Flat B",
                city: "London",
                postalCode: "NW16XE",
                name: "Shipping Name",
                phone: "+447700900000"
            )
        )

        let state = Mappers.mapFromCheckoutStatePayload(
            status: "loading",
            sessionResponse: makeCheckoutSessionResponse(),
            localOverrides: overrides
        )

        XCTAssertEqual(state["status"] as? String, "loading")

        let session = try XCTUnwrap(state["session"] as? NSDictionary)
        let billingAddress = try XCTUnwrap(session["billingAddress"] as? NSDictionary)
        let billingAddressFields = try XCTUnwrap(billingAddress["address"] as? NSDictionary)
        XCTAssertEqual(billingAddress["name"] as? String, "Billing Name")
        XCTAssertEqual(billingAddress["phone"] as? String, "+15555550101")
        XCTAssertEqual(billingAddressFields["country"] as? String, "US")
        XCTAssertEqual(billingAddressFields["line1"] as? String, "123 Billing St")
        XCTAssertEqual(billingAddressFields["city"] as? String, "San Francisco")
        XCTAssertEqual(billingAddressFields["state"] as? String, "CA")
        XCTAssertEqual(billingAddressFields["postalCode"] as? String, "94111")

        let shippingAddress = try XCTUnwrap(session["shippingAddress"] as? NSDictionary)
        let shippingAddressFields = try XCTUnwrap(shippingAddress["address"] as? NSDictionary)
        XCTAssertEqual(shippingAddress["name"] as? String, "Shipping Name")
        XCTAssertEqual(shippingAddress["phone"] as? String, "+447700900000")
        XCTAssertEqual(shippingAddressFields["country"] as? String, "GB")
        XCTAssertEqual(shippingAddressFields["line1"] as? String, "221B Baker Street")
        XCTAssertEqual(shippingAddressFields["line2"] as? String, "Flat B")
        XCTAssertEqual(shippingAddressFields["city"] as? String, "London")
        XCTAssertEqual(shippingAddressFields["postalCode"] as? String, "NW16XE")
    }

    func test_applyCheckoutLocalOverrides_updatesPaymentSheetConfiguration() throws {
        let sessionKey = "checkout_session_key"
        StripeSdkImpl.shared.checkoutLocalOverrides[sessionKey] = CheckoutLocalOverrides(
            billingAddress: CheckoutAddressOverride(
                country: "US",
                line1: "123 Billing St",
                city: "San Francisco",
                state: "CA",
                postalCode: "94111",
                name: "Billing Name",
                phone: "+15555550101"
            ),
            shippingAddress: CheckoutAddressOverride(
                country: "GB",
                line1: "221B Baker Street",
                line2: "Flat B",
                city: "London",
                postalCode: "NW16XE",
                name: "Shipping Name",
                phone: "+447700900000"
            )
        )

        var configuration = PaymentSheet.Configuration()
        configuration.defaultBillingDetails.email = "keep@example.com"
        configuration.defaultBillingDetails.name = "Original Name"
        configuration.defaultBillingDetails.phone = "0000000000"
        configuration.defaultBillingDetails.address = PaymentSheet.Address(
            city: "Old City",
            country: "CA",
            line1: "Old Line 1",
            line2: "Old Line 2",
            postalCode: "A1A1A1",
            state: "BC"
        )
        configuration.shippingDetails = {
            AddressViewController.AddressDetails(
                address: AddressViewController.AddressDetails.Address(
                    country: "CA",
                    line1: "Original Shipping"
                ),
                name: "Original Shipping Name",
                phone: "1111111111",
                isCheckboxSelected: true
            )
        }

        StripeSdkImpl.shared.applyCheckoutLocalOverrides(
            sessionKey: sessionKey,
            to: &configuration
        )

        XCTAssertEqual(configuration.defaultBillingDetails.email, "keep@example.com")
        XCTAssertEqual(configuration.defaultBillingDetails.name, "Billing Name")
        XCTAssertEqual(configuration.defaultBillingDetails.phone, "+15555550101")
        XCTAssertEqual(configuration.defaultBillingDetails.address.country, "US")
        XCTAssertEqual(configuration.defaultBillingDetails.address.line1, "123 Billing St")
        XCTAssertEqual(configuration.defaultBillingDetails.address.city, "San Francisco")
        XCTAssertEqual(configuration.defaultBillingDetails.address.state, "CA")
        XCTAssertEqual(configuration.defaultBillingDetails.address.postalCode, "94111")

        let shippingDetailsProvider = try XCTUnwrap(configuration.shippingDetails)
        let shippingDetails = try XCTUnwrap(shippingDetailsProvider())
        XCTAssertEqual(shippingDetails.name, "Shipping Name")
        XCTAssertEqual(shippingDetails.phone, "+447700900000")
        XCTAssertEqual(shippingDetails.address.country, "GB")
        XCTAssertEqual(shippingDetails.address.line1, "221B Baker Street")
        XCTAssertEqual(shippingDetails.address.line2, "Flat B")
        XCTAssertEqual(shippingDetails.address.city, "London")
        XCTAssertEqual(shippingDetails.address.postalCode, "NW16XE")
        XCTAssertNil(shippingDetails.isCheckboxSelected)
    }

    func test_checkoutUpdateTaxId_returnsUnsupportedError() {
        let expectation = expectation(description: "reject checkout tax id")

        StripeSdkImpl.shared.checkoutUpdateTaxId(
            sessionKey: "checkout_session_key",
            type: "eu_vat",
            value: "DE123456789",
            resolver: { _ in
                XCTFail("Expected checkoutUpdateTaxId to reject")
            },
            rejecter: { code, message, _ in
                XCTAssertEqual(code, ErrorType.Failed)
                XCTAssertEqual(
                    message,
                    StripeSdkImpl.shared.checkoutUnsupportedOperationMessage(
                        for: "Updating Checkout tax IDs"
                    )
                )
                expectation.fulfill()
            }
        )

        wait(for: [expectation], timeout: 1.0)
    }

    func test_checkoutUpdateLineItemQuantity_returnsUnsupportedError() {
        let expectation = expectation(description: "reject checkout line item quantity")

        StripeSdkImpl.shared.checkoutUpdateLineItemQuantity(
            sessionKey: "checkout_session_key",
            lineItemId: "li_123",
            quantity: 3,
            resolver: { _ in
                XCTFail("Expected checkoutUpdateLineItemQuantity to reject")
            },
            rejecter: { code, message, _ in
                XCTAssertEqual(code, ErrorType.Failed)
                XCTAssertEqual(
                    message,
                    StripeSdkImpl.shared.checkoutUnsupportedOperationMessage(
                        for: "Updating Checkout line item quantities"
                    )
                )
                expectation.fulfill()
            }
        )

        wait(for: [expectation], timeout: 1.0)
    }

    private func makeCheckoutSessionResponse() -> NSDictionary {
        return [
            "id": "cs_test_123",
            "status": "open",
            "payment_status": "unpaid",
            "currency": "usd",
            "livemode": false,
            "amount_subtotal": 1000,
            "amount_total": 1200,
            "customer": "cus_123",
            "customer_email": "customer@example.com",
            "total_details": [
                "amount_discount": 100,
                "amount_shipping": 200,
                "amount_tax": 100,
            ],
            "line_items": [
                [
                    "id": "li_123",
                    "description": "Blue T-shirt",
                    "quantity": 2,
                    "amount_subtotal": 1000,
                    "currency": "usd",
                    "price": [
                        "unit_amount": 500,
                        "currency": "usd",
                        "nickname": "Blue T-shirt",
                    ],
                ],
            ],
            "shipping_options": [
                [
                    "shipping_amount": 200,
                    "shipping_rate": [
                        "id": "shr_standard",
                        "display_name": "Standard",
                        "fixed_amount": [
                            "amount": 200,
                            "currency": "usd",
                        ],
                        "delivery_estimate": [
                            "minimum": [
                                "value": 3,
                                "unit": "business_days",
                            ],
                            "maximum": [
                                "value": 5,
                                "unit": "business_days",
                            ],
                        ],
                    ],
                ],
            ],
            "discounts": [
                [
                    "amount": 100,
                    "promotion_code": [
                        "code": "SPRING",
                    ],
                    "coupon": [
                        "id": "coupon_123",
                        "name": "Spring Sale",
                        "percent_off": 10,
                    ],
                ],
            ],
        ]
    }

    private func intValue(_ value: Any?) -> Int? {
        if let intValue = value as? Int {
            return intValue
        }

        if let number = value as? NSNumber {
            return number.intValue
        }

        return nil
    }
}
