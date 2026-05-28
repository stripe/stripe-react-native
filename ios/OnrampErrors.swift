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
    /// Typed Crypto Onramp coordinator errors include onramp-specific diagnostics in addition to the standard error fields.
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
        guard let onrampError = error as? CryptoOnrampCoordinator.Error else {
            return Errors.createError(code, error)
        }

        switch onrampError {
        case .appAttestationFailed(let apiError):
            return createOnrampAPIErrorMap(
                code: code,
                onrampErrorType: "AppAttestationError",
                error: onrampError,
                apiError: apiError
            )
        case .uncategorizedAPIError(let apiError):
            return createOnrampAPIErrorMap(
                code: code,
                onrampErrorType: "UncategorizedApiError",
                error: onrampError,
                apiError: apiError
            )
        case .seamlessSignInTokenInvalid(let reason):
            return createOnrampErrorMap(
                code: code,
                message: reason ?? onrampError.localizedDescription,
                localizedMessage: onrampError.localizedDescription,
                additionalFields: commonOnrampFields(error: onrampError)
            )
        default:
            return createOnrampErrorMap(
                code: code,
                message: onrampError.localizedDescription,
                localizedMessage: onrampError.localizedDescription,
                additionalFields: commonOnrampFields(error: onrampError)
            )
        }
    }

    private static func createOnrampAPIErrorMap(
        code: String,
        onrampErrorType: String,
        error: CryptoOnrampCoordinator.Error,
        apiError: any APIErrorContextProviding
    ) -> NSDictionary {
        return createOnrampErrorMap(
            code: code,
            message: error.userFacingMessage,
            localizedMessage: error.localizedDescription,
            type: apiError.apiErrorType,
            stripeErrorCode: apiError.apiErrorCode,
            additionalFields: commonOnrampFields(error: error, onrampErrorType: onrampErrorType).merging([
                "reason": apiError.reason,
                "operation": apiError.operation,
                "appPackageName": apiError.appIdentifier,
                "mode": apiError.mode,
                "sdkVersion": apiError.sdkVersion,
                "requestId": apiError.requestID,
                "apiErrorCode": apiError.apiErrorCode,
                "apiErrorType": apiError.apiErrorType,
                "apiErrorMessage": apiError.apiErrorMessage,
                "apiUserMessage": apiError.apiUserMessage,
                "docUrl": apiError.docURL,
            ]) { _, new in new }
        )
    }

    private static func commonOnrampFields(
        error: CryptoOnrampCoordinator.Error,
        onrampErrorType: String? = nil
    ) -> [String: Any?] {
        return [
            "onrampErrorType": onrampErrorType,
            "developerMessage": error.developerDescription,
            "userMessage": error.userFacingMessage,
        ]
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
