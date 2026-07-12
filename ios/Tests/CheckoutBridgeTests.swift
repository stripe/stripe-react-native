//
//  CheckoutBridgeTests.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/29/26.
//

@testable import stripe_react_native
@_spi(STP) @_spi(ReactNativeSDK) import StripePaymentSheet
import XCTest

class CheckoutBridgeTests: XCTestCase {

    // MARK: - Contact Address

    func test_mapFromContactAddress_mapsAllFields() throws {
        let contactAddress = Checkout.ContactAddress(
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

        let mapped = Mappers.mapFromContactAddress(contactAddress)

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

    func test_mapFromContactAddress_omitsNilFields() throws {
        let contactAddress = Checkout.ContactAddress(
            name: nil,
            phone: nil,
            address: Checkout.Address(country: "GB")
        )

        let mapped = Mappers.mapFromContactAddress(contactAddress)

        XCTAssertNil(mapped["name"])
        XCTAssertNil(mapped["phone"])

        let address = try XCTUnwrap(mapped["address"] as? NSDictionary)
        XCTAssertEqual(address["country"] as? String, "GB")
        XCTAssertNil(address["line1"])
        XCTAssertNil(address["city"])
    }

    // MARK: - Amount

    func test_mapFromAmount() throws {
        let mapped = Mappers.mapFromAmount(
            Checkout.Amount(amount: "$10.00", minorUnitsAmount: 1000)
        )

        XCTAssertEqual(mapped["amount"] as? String, "$10.00")
        XCTAssertEqual(mapped["minorUnitsAmount"] as? Int, 1000)
    }

    // MARK: - Total

    func test_mapFromTotal() throws {
        let total = Checkout.Total(
            subtotal: Checkout.Amount(amount: "$10.00", minorUnitsAmount: 1000),
            taxExclusive: Checkout.Amount(amount: "$1.00", minorUnitsAmount: 100),
            taxInclusive: Checkout.Amount(amount: "$0.00", minorUnitsAmount: 0),
            shippingRate: Checkout.Amount(amount: "$5.00", minorUnitsAmount: 500),
            discount: Checkout.Amount(amount: "$2.00", minorUnitsAmount: 200),
            total: Checkout.Amount(amount: "$14.00", minorUnitsAmount: 1400),
            appliedBalance: Checkout.Amount(amount: "$0.00", minorUnitsAmount: 0),
            balanceAppliedToNextInvoice: false
        )

        let mapped = Mappers.mapFromTotal(total)

        let subtotal = try XCTUnwrap(mapped["subtotal"] as? NSDictionary)
        XCTAssertEqual(subtotal["amount"] as? String, "$10.00")
        XCTAssertEqual(subtotal["minorUnitsAmount"] as? Int, 1000)

        let grandTotal = try XCTUnwrap(mapped["total"] as? NSDictionary)
        XCTAssertEqual(grandTotal["amount"] as? String, "$14.00")
        XCTAssertEqual(grandTotal["minorUnitsAmount"] as? Int, 1400)

        XCTAssertEqual(mapped["balanceAppliedToNextInvoice"] as? Bool, false)
    }

    // MARK: - Tax

    func test_mapFromTax() throws {
        let tax = Checkout.Tax(
            status: .ready,
            taxAmounts: [
                Checkout.TaxAmount(
                    amount: Checkout.Amount(amount: "$1.50", minorUnitsAmount: 150),
                    inclusive: false,
                    displayName: "Sales Tax"
                ),
            ]
        )

        let mapped = Mappers.mapFromTax(tax)

        XCTAssertEqual(mapped["status"] as? String, "ready")

        let taxAmounts = try XCTUnwrap(mapped["taxAmounts"] as? [NSDictionary])
        XCTAssertEqual(taxAmounts.count, 1)
        XCTAssertEqual(taxAmounts[0]["displayName"] as? String, "Sales Tax")
        XCTAssertEqual(taxAmounts[0]["inclusive"] as? Bool, false)

        let amount = try XCTUnwrap(taxAmounts[0]["amount"] as? NSDictionary)
        XCTAssertEqual(amount["amount"] as? String, "$1.50")
        XCTAssertEqual(amount["minorUnitsAmount"] as? Int, 150)
    }

    func test_mapFromTax_nilTaxAmounts() {
        let tax = Checkout.Tax(status: .requiresShippingAddress, taxAmounts: nil)
        let mapped = Mappers.mapFromTax(tax)

        XCTAssertEqual(mapped["status"] as? String, "requiresShippingAddress")
        XCTAssertNil(mapped["taxAmounts"])
    }

    // MARK: - Line Item

    func test_mapFromLineItem() throws {
        let lineItem = Checkout.LineItem(
            id: "li_1",
            name: "Widget",
            description: "A fine widget",
            images: ["https://img.example.com/widget.png"],
            quantity: 2,
            unitAmount: Checkout.Amount(amount: "$5.00", minorUnitsAmount: 500),
            subtotal: Checkout.Amount(amount: "$10.00", minorUnitsAmount: 1000),
            total: Checkout.Amount(amount: "$10.00", minorUnitsAmount: 1000),
            adjustableQuantity: Checkout.AdjustableQuantity(minimum: 1, maximum: 10)
        )

        let mapped = Mappers.mapFromLineItem(lineItem)

        XCTAssertEqual(mapped["id"] as? String, "li_1")
        XCTAssertEqual(mapped["name"] as? String, "Widget")
        XCTAssertEqual(mapped["description"] as? String, "A fine widget")
        XCTAssertEqual(mapped["images"] as? [String], ["https://img.example.com/widget.png"])
        XCTAssertEqual(mapped["quantity"] as? Int, 2)

        let unitAmount = try XCTUnwrap(mapped["unitAmount"] as? NSDictionary)
        XCTAssertEqual(unitAmount["amount"] as? String, "$5.00")
        XCTAssertEqual(unitAmount["minorUnitsAmount"] as? Int, 500)

        let adjustable = try XCTUnwrap(mapped["adjustableQuantity"] as? NSDictionary)
        XCTAssertEqual(adjustable["minimum"] as? Int, 1)
        XCTAssertEqual(adjustable["maximum"] as? Int, 10)
    }

    // MARK: - Shipping Option

    func test_mapFromShippingOption() throws {
        let option = Checkout.ShippingOption(
            id: "shr_1",
            displayName: "Standard",
            amount: Checkout.Amount(amount: "$5.00", minorUnitsAmount: 500),
            currency: "usd",
            deliveryEstimate: Checkout.DeliveryEstimate(
                minimum: Checkout.DeliveryEstimate.Bound(unit: .businessDay, value: 3),
                maximum: Checkout.DeliveryEstimate.Bound(unit: .businessDay, value: 5)
            )
        )

        let mapped = Mappers.mapFromShippingOption(option)

        XCTAssertEqual(mapped["id"] as? String, "shr_1")
        XCTAssertEqual(mapped["displayName"] as? String, "Standard")
        XCTAssertEqual(mapped["currency"] as? String, "usd")

        let amount = try XCTUnwrap(mapped["amount"] as? NSDictionary)
        XCTAssertEqual(amount["amount"] as? String, "$5.00")
        XCTAssertEqual(amount["minorUnitsAmount"] as? Int, 500)

        let estimate = try XCTUnwrap(mapped["deliveryEstimate"] as? NSDictionary)
        let minimum = try XCTUnwrap(estimate["minimum"] as? NSDictionary)
        XCTAssertEqual(minimum["unit"] as? String, "businessDay")
        XCTAssertEqual(minimum["value"] as? Int, 3)

        let maximum = try XCTUnwrap(estimate["maximum"] as? NSDictionary)
        XCTAssertEqual(maximum["unit"] as? String, "businessDay")
        XCTAssertEqual(maximum["value"] as? Int, 5)
    }

    // MARK: - Currency Option

    func test_mapFromCurrencyOption() throws {
        let option = Checkout.CurrencyOption(
            amount: Checkout.Amount(amount: "€9.20", minorUnitsAmount: 920),
            currency: "eur",
            currencyConversion: Checkout.CurrencyConversion(
                fxRate: "0.92",
                sourceCurrency: "usd"
            )
        )

        let mapped = Mappers.mapFromCurrencyOption(option)

        XCTAssertEqual(mapped["currency"] as? String, "eur")

        let amount = try XCTUnwrap(mapped["amount"] as? NSDictionary)
        XCTAssertEqual(amount["amount"] as? String, "€9.20")
        XCTAssertEqual(amount["minorUnitsAmount"] as? Int, 920)

        let conversion = try XCTUnwrap(mapped["currencyConversion"] as? NSDictionary)
        XCTAssertEqual(conversion["fxRate"] as? String, "0.92")
        XCTAssertEqual(conversion["sourceCurrency"] as? String, "usd")
    }

    // MARK: - Discount Amount

    func test_mapFromDiscountAmount() throws {
        let discount = Checkout.DiscountAmount(
            amount: Checkout.Amount(amount: "$2.00", minorUnitsAmount: 200),
            displayName: "Summer Sale",
            promotionCode: "SUMMER2026"
        )

        let mapped = Mappers.mapFromDiscountAmount(discount)

        XCTAssertEqual(mapped["displayName"] as? String, "Summer Sale")
        XCTAssertEqual(mapped["promotionCode"] as? String, "SUMMER2026")

        let amount = try XCTUnwrap(mapped["amount"] as? NSDictionary)
        XCTAssertEqual(amount["amount"] as? String, "$2.00")
        XCTAssertEqual(amount["minorUnitsAmount"] as? Int, 200)
    }

    // MARK: - Status

    func test_mapFromStatus() throws {
        let status = Checkout.Status(type: .open, paymentStatus: .unpaid)
        let mapped = Mappers.mapFromStatus(status)

        XCTAssertEqual(mapped["type"] as? String, "open")
        XCTAssertEqual(mapped["paymentStatus"] as? String, "unpaid")
    }

    func test_mapFromStatus_nilPaymentStatus() throws {
        let status = Checkout.Status(type: .expired, paymentStatus: nil)
        let mapped = Mappers.mapFromStatus(status)

        XCTAssertEqual(mapped["type"] as? String, "expired")
        XCTAssertNil(mapped["paymentStatus"])
    }

    // MARK: - Selected Shipping

    func test_mapFromSelectedShipping() throws {
        let selectedShipping = Checkout.SelectedShipping(
            shippingOption: Checkout.ShippingOption(
                id: "shr_1",
                displayName: "Express",
                amount: Checkout.Amount(amount: "$15.00", minorUnitsAmount: 1500),
                currency: "usd"
            ),
            taxAmounts: [
                Checkout.TaxAmount(
                    amount: Checkout.Amount(amount: "$1.20", minorUnitsAmount: 120),
                    inclusive: true,
                    displayName: "VAT"
                ),
            ]
        )

        let mapped = Mappers.mapFromSelectedShipping(selectedShipping)

        let option = try XCTUnwrap(mapped["shippingOption"] as? NSDictionary)
        XCTAssertEqual(option["id"] as? String, "shr_1")

        let taxAmounts = try XCTUnwrap(mapped["taxAmounts"] as? [NSDictionary])
        XCTAssertEqual(taxAmounts.count, 1)
        XCTAssertEqual(taxAmounts[0]["displayName"] as? String, "VAT")
    }
}
