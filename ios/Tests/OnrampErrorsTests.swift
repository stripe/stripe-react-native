//
//  OnrampErrorsTests.swift
//  stripe-react-native
//
//  Created by Michael Liberatore on 5/28/26.
//

#if canImport(StripeCryptoOnramp)
@testable import stripe_react_native
@_spi(STP) import StripeCore
@_spi(CryptoOnrampAlpha) import StripeCryptoOnramp
import XCTest

class OnrampErrorsTests: XCTestCase {

    func test_createFailedError_withLegacyOnrampError_usesGenericErrorShape() throws {
        let error = CryptoOnrampCoordinator.Error.seamlessSignInTokenInvalid(reason: "The sign-in token is expired.")

        let details = try errorDetails(from: OnrampErrors.createFailedError(error))

        XCTAssertEqual(details["code"] as? String, "Failed")
        XCTAssertEqual(details["message"] as? String, error.localizedDescription)
        XCTAssertEqual(details["localizedMessage"] as? String, error.localizedDescription)
        XCTAssertNil(details["onrampErrorType"])
        XCTAssertNil(details["developerMessage"])
        XCTAssertNil(details["userMessage"])
    }

    func test_createNotConfiguredError_usesFailedErrorShape() throws {
        let details = try errorDetails(from: OnrampErrors.createNotConfiguredError())

        XCTAssertEqual(details["code"] as? String, "Failed")
        XCTAssertEqual(details["message"] as? String, "Onramp is not configured.")
        XCTAssertEqual(details["localizedMessage"] as? String, "Onramp is not configured.")
        XCTAssertTrue(details["declineCode"] is NSNull)
        XCTAssertTrue(details["stripeErrorCode"] is NSNull)
        XCTAssertTrue(details["type"] is NSNull)
    }

    private func errorDetails(from errorEnvelope: NSDictionary) throws -> NSDictionary {
        return try XCTUnwrap(errorEnvelope["error"] as? NSDictionary)
    }
}
#endif
