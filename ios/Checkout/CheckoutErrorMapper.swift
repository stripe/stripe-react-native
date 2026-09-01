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
        guard let checkoutError = error as? CheckoutError else {
            return .failed
        }

        switch checkoutError {
        case .invalidClientSecret:
            return .invalidClientSecret
        case .sheetCurrentlyPresented:
            return .sheetCurrentlyPresented
        case .timedOut:
            return .timeout
        default:
            return .failed
        }
    }
}
