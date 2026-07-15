//
//  OnrampErrors.swift
//  stripe-react-native
//
//  Created by Michael Liberatore on 5/28/26.
//

#if canImport(StripeCryptoOnramp)
import Foundation
@_spi(CryptoOnrampAlpha) import StripeCryptoOnramp

enum OnrampErrors {

    /// Creates a React Native error envelope for a failed Crypto Onramp operation.
    ///
    /// Typed Crypto Onramp errors include onramp-specific diagnostics in addition to the standard error fields.
    static func createFailedError(_ error: Swift.Error) -> NSDictionary {
        return createOnrampError(code: ErrorType.Failed, error: error)
    }

    /// Creates a React Native error envelope for calls made before Crypto Onramp has been configured.
    static func createNotConfiguredError() -> NSDictionary {
        return createOnrampErrorMap(
            code: ErrorType.Failed,
            message: "Onramp is not configured."
        )
    }

    private static func createOnrampError(code: String, error: Swift.Error) -> NSDictionary {
        if let apiError = error as? StripeCryptoOnrampAPIError {
            return createOnrampAPIErrorMap(
                code: code,
                onrampErrorType: onrampErrorType(for: apiError),
                error: apiError
            )
        }

        if let onrampError = error as? StripeCryptoOnrampError {
            return createOnrampErrorMap(
                code: code,
                message: onrampError.userMessage,
                localizedMessage: onrampError.localizedDescription,
                stripeErrorCode: onrampError.code,
                additionalFields: commonOnrampFields(
                    error: onrampError,
                    onrampErrorType: onrampErrorType(for: onrampError)
                )
            )
        }

        return Errors.createError(code, error)
    }

    private static func createOnrampAPIErrorMap(
        code: String,
        onrampErrorType: String,
        error: StripeCryptoOnrampAPIError
    ) -> NSDictionary {
        return createOnrampErrorMap(
            code: code,
            message: error.userMessage,
            localizedMessage: error.localizedDescription,
            type: error.type,
            stripeErrorCode: error.code,
            additionalFields: commonOnrampFields(error: error, onrampErrorType: onrampErrorType).merging([
                "reason": error.reason,
                "requestId": error.requestID,
                "apiErrorCode": error.code,
                "apiErrorType": error.type,
                "apiErrorMessage": error.apiMessage,
                "apiUserMessage": error.apiUserMessage,
            ]) { _, new in new }
        )
    }

    private static func commonOnrampFields(
        error: StripeCryptoOnrampError,
        onrampErrorType: String? = nil
    ) -> [String: Any?] {
        var fields: [String: Any?] = [
            "developerMessage": error.developerMessage,
            "userMessage": error.userMessage,
            "docUrl": error.docURL?.absoluteString,
        ]

        if let onrampErrorType {
            fields["onrampErrorType"] = onrampErrorType
        }

        return fields
    }

    private static func onrampErrorType(for error: StripeCryptoOnrampAPIError) -> String {
        if error.code == "link_failed_to_attest_request" {
            return "AppAttestationError"
        }

        return "UncategorizedApiError"
    }

    private static func onrampErrorType(for error: StripeCryptoOnrampError) -> String? {
        if error.code == "app_attestation_unavailable" {
            return "AppAttestationUnavailableError"
        }

        return nil
    }

    private static func createOnrampErrorMap(
        code: String,
        message: String?,
        localizedMessage: String? = nil,
        declineCode: String? = nil,
        type: String? = nil,
        stripeErrorCode: String? = nil,
        additionalFields: [String: Any?] = [:]
    ) -> NSDictionary {
        let fields: [String: Any?] = [
            "code": code,
            "message": message,
            "localizedMessage": localizedMessage ?? message,
            "declineCode": declineCode,
            "stripeErrorCode": stripeErrorCode,
            "type": type,
        ].merging(additionalFields) { _, new in new }

        return ["error": fields.mapValues(nullIfNil)]
    }

    private static func nullIfNil(_ value: Any?) -> Any {
        return value ?? NSNull()
    }
}
#endif
