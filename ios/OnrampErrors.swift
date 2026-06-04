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
                additionalFields: commonOnrampFields(error: onrampError)
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
                "operation": error.operation,
                "appPackageName": error.appIdentifier,
                "mode": error.mode,
                "sdkVersions": mapSDKVersions(error.sdkVersions),
                "requestId": error.requestID,
                "apiErrorCode": error.code,
                "apiErrorType": error.type,
                "apiErrorMessage": error.apiMessage,
                "apiUserMessage": error.apiUserMessage,
                "docUrl": error.docURL?.absoluteString,
            ]) { _, new in new }
        )
    }

    private static func commonOnrampFields(
        error: StripeCryptoOnrampError,
        onrampErrorType: String? = nil
    ) -> [String: Any?] {
        return [
            "onrampErrorType": onrampErrorType,
            "developerMessage": error.developerMessage,
            "userMessage": error.userMessage,
        ]
    }

    private static func mapSDKVersions(_ sdkVersions: [SDKVersion]) -> [[String: String]] {
        return sdkVersions.map { sdkVersion in
            [
                "name": sdkVersion.name,
                "version": sdkVersion.version,
            ]
        }
    }

    private static func onrampErrorType(for error: StripeCryptoOnrampAPIError) -> String {
        switch error {
        case is AppAttestationAPIError:
            return "AppAttestationError"
        default:
            return "UncategorizedApiError"
        }
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
