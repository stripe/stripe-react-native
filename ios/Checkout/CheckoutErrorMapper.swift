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

enum CheckoutMutationBridgeError: LocalizedError {
    case nativeAPINotAvailable(String)

    var errorDescription: String? {
        switch self {
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
