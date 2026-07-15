//
//  OnrampErrorsTests.swift
//  stripe-react-native
//
//  Created by Michael Liberatore on 5/28/26.
//

#if canImport(StripeCryptoOnramp)
@testable import stripe_react_native
@_spi(CryptoOnrampAlpha) import StripeCryptoOnramp
import XCTest

class OnrampErrorsTests: XCTestCase {

    func test_createFailedError_withAppAttestationError_preservesAPIFields() throws {
        let error = TestStripeCryptoOnrampAPIError(
            code: "link_failed_to_attest_request",
            userMessage: "App attestation failed.",
            developerMessage: "Developer message with operation diagnostics.",
            docURL: URL(string: "https://docs.stripe.com/errors/app-attestation"),
            reason: "ios_app_id_mismatch",
            type: "api_error",
            requestID: "req_123",
            apiMessage: "Attestation request could not be verified.",
            apiUserMessage: "App attestation failed."
        )

        let details = try errorDetails(from: OnrampErrors.createFailedError(error))

        XCTAssertEqual(details["code"] as? String, "Failed")
        XCTAssertEqual(details["message"] as? String, error.userMessage)
        XCTAssertEqual(details["localizedMessage"] as? String, error.localizedDescription)
        XCTAssertEqual(details["onrampErrorType"] as? String, "AppAttestationError")
        XCTAssertEqual(details["developerMessage"] as? String, error.developerMessage)
        XCTAssertEqual(details["userMessage"] as? String, error.userMessage)
        XCTAssertEqual(details["stripeErrorCode"] as? String, error.code)
        XCTAssertEqual(details["apiErrorCode"] as? String, error.code)
        XCTAssertEqual(details["type"] as? String, error.type)
        XCTAssertEqual(details["apiErrorType"] as? String, error.type)
        XCTAssertEqual(details["reason"] as? String, error.reason)
        XCTAssertEqual(details["requestId"] as? String, error.requestID)
        XCTAssertEqual(details["apiErrorMessage"] as? String, error.apiMessage)
        XCTAssertEqual(details["apiUserMessage"] as? String, error.apiUserMessage)
        XCTAssertEqual(details["docUrl"] as? String, error.docURL?.absoluteString)
    }

    func test_createFailedError_withUncategorizedAPIError_preservesAPIFields() throws {
        let error = TestStripeCryptoOnrampAPIError(
            code: "consumer_session_expired",
            userMessage: "Session expired. Please sign in again.",
            developerMessage: "Developer message.",
            docURL: URL(string: "https://docs.stripe.com/error-codes/consumer-session-expired"),
            reason: "consumer_session_expired",
            type: "authentication_error",
            requestID: nil,
            apiMessage: "The consumer session has expired.",
            apiUserMessage: "Session expired. Please sign in again."
        )

        let details = try errorDetails(from: OnrampErrors.createFailedError(error))

        XCTAssertEqual(details["code"] as? String, "Failed")
        XCTAssertEqual(details["message"] as? String, error.userMessage)
        XCTAssertEqual(details["localizedMessage"] as? String, error.localizedDescription)
        XCTAssertEqual(details["onrampErrorType"] as? String, "UncategorizedApiError")
        XCTAssertEqual(details["developerMessage"] as? String, error.developerMessage)
        XCTAssertEqual(details["userMessage"] as? String, error.userMessage)
        XCTAssertEqual(details["stripeErrorCode"] as? String, error.code)
        XCTAssertEqual(details["apiErrorCode"] as? String, error.code)
        XCTAssertEqual(details["type"] as? String, error.type)
        XCTAssertEqual(details["apiErrorType"] as? String, error.type)
        XCTAssertEqual(details["reason"] as? String, error.reason)
        XCTAssertTrue(details["requestId"] is NSNull)
        XCTAssertEqual(details["apiErrorMessage"] as? String, error.apiMessage)
        XCTAssertEqual(details["apiUserMessage"] as? String, error.apiUserMessage)
        XCTAssertEqual(details["docUrl"] as? String, error.docURL?.absoluteString)
    }

    func test_createFailedError_withAppAttestationUnavailableError_preservesSdkErrorFields() throws {
        let error = TestStripeCryptoOnrampError(
            code: "app_attestation_unavailable",
            userMessage: "This app couldn't be verified. Contact the app developer for help.",
            developerMessage: "App attestation unavailable.\n\nRequest Context:\n  operation: configure",
            docURL: nil
        )

        let details = try errorDetails(from: OnrampErrors.createFailedError(error))

        XCTAssertEqual(details["code"] as? String, "Failed")
        XCTAssertEqual(details["message"] as? String, error.userMessage)
        XCTAssertEqual(details["localizedMessage"] as? String, error.localizedDescription)
        XCTAssertEqual(details["onrampErrorType"] as? String, "AppAttestationUnavailableError")
        XCTAssertEqual(details["developerMessage"] as? String, error.developerMessage)
        XCTAssertEqual(details["userMessage"] as? String, error.userMessage)
        XCTAssertEqual(details["stripeErrorCode"] as? String, error.code)
        XCTAssertTrue(details["docUrl"] is NSNull)
    }

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

    func test_createFailedError_withUnknownRichOnrampError_preservesBaseFields() throws {
        let error = TestStripeCryptoOnrampError(
            code: "sdk_error",
            userMessage: "Something went wrong.",
            developerMessage: "Developer message.",
            docURL: URL(string: "https://docs.stripe.com/errors/sdk-error")
        )

        let details = try errorDetails(from: OnrampErrors.createFailedError(error))

        XCTAssertEqual(details["code"] as? String, "Failed")
        XCTAssertEqual(details["message"] as? String, error.userMessage)
        XCTAssertEqual(details["localizedMessage"] as? String, error.localizedDescription)
        XCTAssertEqual(details["developerMessage"] as? String, error.developerMessage)
        XCTAssertEqual(details["userMessage"] as? String, error.userMessage)
        XCTAssertEqual(details["stripeErrorCode"] as? String, error.code)
        XCTAssertEqual(details["docUrl"] as? String, error.docURL?.absoluteString)
        XCTAssertNil(details["onrampErrorType"])
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

    private struct TestStripeCryptoOnrampAPIError: StripeCryptoOnrampAPIError {
        let code: String
        let userMessage: String
        let developerMessage: String
        let docURL: URL?
        let reason: String?
        let type: String?
        let requestID: String?
        let apiMessage: String?
        let apiUserMessage: String?
        let underlyingError: Swift.Error? = nil

        var errorDescription: String? {
            return userMessage
        }

        var debugDescription: String {
            return developerMessage
        }
    }

    private struct TestStripeCryptoOnrampError: StripeCryptoOnrampError {
        let code: String
        let userMessage: String
        let developerMessage: String
        let docURL: URL?
        let underlyingError: Swift.Error? = nil

        var errorDescription: String? {
            return userMessage
        }

        var debugDescription: String {
            return developerMessage
        }
    }
}
#endif
