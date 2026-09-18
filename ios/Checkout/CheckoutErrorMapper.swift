import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

enum CheckoutBridgeErrorCode: String {
    case failed = "Failed"
    case invalidClientSecret = "InvalidClientSecret"
    case sessionNotOpen = "SessionNotOpen"
    case sheetCurrentlyPresented = "SheetCurrentlyPresented"
    case timeout = "Timeout"
    case canceled = "Canceled"
}

enum CheckoutBridgeError: LocalizedError {
    case nativeAPINotAvailable(String)
    case confirmationInProgress
    case destroyed

    var errorDescription: String? {
        switch self {
        case .confirmationInProgress:
            return "A Checkout confirmation is already in progress."
        case .destroyed:
            return "This Checkout controller was destroyed."
        case .nativeAPINotAvailable(let operation):
            return "The installed Stripe iOS SDK does not support CheckoutController.\(operation) yet."
        }
    }
}

enum CheckoutErrorMapper {
    static func code(for error: Error) -> CheckoutBridgeErrorCode {
        if error is CancellationError {
            return .canceled
        }
        // Native Checkout does not expose its typed errors to this bridge.
        return .failed
    }
}
