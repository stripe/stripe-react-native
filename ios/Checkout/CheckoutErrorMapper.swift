import Foundation
import React
@_spi(InternalOnlyAPI) import StripeCore
@_spi(ReactNativeSDK) @_spi(InternalOnlyAPI) import StripePaymentSheet

enum CheckoutBridgeError: LocalizedError {
    case confirmationInProgress
    case destroyed

    var errorDescription: String? {
        switch self {
        case .confirmationInProgress:
            return "A Checkout confirmation is already in progress."
        case .destroyed:
            return "This Checkout controller was destroyed."
        }
    }
}

func checkoutErrorCode(for error: Error) -> String {
    error is CancellationError ? "Canceled" : "Failed"
}

/// Adds the customer-facing message that JavaScript reads from a rejection's `userInfo` and
/// exposes as the error's `localizedMessage`.
func checkoutRejectionError(_ error: Error) -> NSError {
    let nsError = error as NSError
    var userInfo = nsError.userInfo
    userInfo["localizedMessage"] = checkoutLocalizedMessage(for: error)
    return NSError(domain: nsError.domain, code: nsError.code, userInfo: userInfo)
}

/// The rejection error for a bridge precondition failure, such as a missing controller, which has
/// no underlying error. Customers see a generic message.
func checkoutRejectionError() -> NSError {
    // Keep the domain React Native reports for rejections without an error.
    NSError(domain: RCTErrorDomain, code: 0, userInfo: ["localizedMessage": NSError.stp_unexpectedErrorMessage()])
}

/// Returns the message to display to the customer for a Checkout failure.
func checkoutLocalizedMessage(for error: Error) -> String {
    switch error {
    case is CancellationError, is CheckoutBridgeError, is CheckoutConfigurationMapperError:
        // Bridge errors describe integration problems, so customers see a generic message.
        return NSError.stp_unexpectedErrorMessage()
    default:
        // Native Checkout vends its customer-facing message as the localized description.
        // TODO: Native Checkout doesn't yet fall back to a generic message when the server's error
        // message is null, so this can be a system placeholder such as "The operation couldn’t be
        // completed." Remove this note once the native SDK provides that fallback.
        return error.localizedDescription
    }
}
