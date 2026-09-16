import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

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

func checkoutErrorCode(for error: Error) -> String {
    error is CancellationError ? "Canceled" : "Failed"
}
