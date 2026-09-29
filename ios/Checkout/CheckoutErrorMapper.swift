import Foundation

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
