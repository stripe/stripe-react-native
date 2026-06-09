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

    func test_createFailedError_withAppAttestationError_preservesOnrampDiagnostics() throws {
        let error = AppAttestationAPIError(
            context: try makeAPIErrorContext(
                reason: "ios_app_id_mismatch",
                operation: "configure",
                appIdentifier: "com.example.app",
                mode: "test",
                sdkVersions: [
                    SDKVersion(name: "stripe-ios", version: "25.16.0"),
                    SDKVersion(name: "stripe-react-native", version: "0.66.0"),
                ],
                apiErrorCode: "link_failed_to_attest_request",
                apiErrorType: "api_error",
                apiErrorMessage: "Attestation request could not be verified.",
                apiUserMessage: "App attestation failed.",
                docURL: "https://docs.stripe.com/errors/app-attestation",
                requestID: "req_123"
            )
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
        XCTAssertEqual(details["operation"] as? String, error.operation)
        XCTAssertEqual(details["appPackageName"] as? String, error.appIdentifier)
        XCTAssertEqual(details["mode"] as? String, error.mode)
        let sdkVersions = try XCTUnwrap(details["sdkVersions"] as? [[String: String]])
        XCTAssertEqual(sdkVersions, [
            ["name": "stripe-ios", "version": "25.16.0"],
            ["name": "stripe-react-native", "version": "0.66.0"],
        ])
        XCTAssertEqual(details["requestId"] as? String, error.requestID)
        XCTAssertEqual(details["apiErrorMessage"] as? String, error.apiMessage)
        XCTAssertEqual(details["apiUserMessage"] as? String, error.apiUserMessage)
        XCTAssertEqual(details["docUrl"] as? String, error.docURL?.absoluteString)
    }

    func test_createFailedError_withUncategorizedAPIError_preservesStripeCodes() throws {
        let error = UncategorizedAPIError(
            context: try makeAPIErrorContext(
                reason: "consumer_session_expired",
                operation: "authorize",
                appIdentifier: "com.example.app",
                mode: "live",
                sdkVersions: [
                    SDKVersion(name: "stripe-ios", version: "25.16.0"),
                ],
                apiErrorCode: "consumer_session_expired",
                apiErrorType: "authentication_error",
                apiErrorMessage: "The consumer session has expired.",
                apiUserMessage: "Session expired. Please sign in again.",
                docURL: "https://docs.stripe.com/error-codes/consumer-session-expired"
            )
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
        XCTAssertEqual(details["operation"] as? String, error.operation)
        XCTAssertEqual(details["appPackageName"] as? String, error.appIdentifier)
        XCTAssertEqual(details["mode"] as? String, error.mode)
        XCTAssertTrue(details["requestId"] is NSNull)
        XCTAssertEqual(details["apiErrorMessage"] as? String, error.apiMessage)
        XCTAssertEqual(details["apiUserMessage"] as? String, error.apiUserMessage)
        XCTAssertEqual(details["docUrl"] as? String, error.docURL?.absoluteString)
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

    private func makeAPIErrorContext(
        reason: String?,
        operation: String,
        appIdentifier: String?,
        mode: String?,
        sdkVersions: [SDKVersion],
        apiErrorCode: String?,
        apiErrorType: String?,
        apiErrorMessage: String?,
        apiUserMessage: String?,
        docURL: String?,
        requestID: String? = nil
    ) throws -> APIErrorContext {
        return APIErrorContext(
            reason: reason,
            operation: operation,
            appIdentifier: appIdentifier,
            mode: mode,
            apiErrorCode: apiErrorCode,
            apiErrorType: apiErrorType,
            apiErrorMessage: apiErrorMessage,
            apiUserMessage: apiUserMessage,
            docURL: docURL.flatMap(URL.init(string:)),
            underlyingError: try makeStripeError(
                apiErrorCode: apiErrorCode,
                apiErrorMessage: apiErrorMessage,
                requestID: requestID
            ),
            sdkVersions: sdkVersions
        )
    }

    /// Creates a Stripe API error so tests cover fields that Onramp derives from the underlying Stripe error.
    private func makeStripeError(
        apiErrorCode: String?,
        apiErrorMessage: String?,
        requestID: String?
    ) throws -> StripeError {
        var errorFields: [String: Any] = [
            "type": "api_error",
        ]

        errorFields["code"] = apiErrorCode
        errorFields["message"] = apiErrorMessage

        let data = try JSONSerialization.data(withJSONObject: ["error": errorFields])
        let response = try JSONDecoder().decode(StripeAPIErrorResponse.self, from: data)
        var apiError = try XCTUnwrap(response.error)
        apiError.requestID = requestID

        return StripeError.apiError(apiError)
    }
}
#endif
