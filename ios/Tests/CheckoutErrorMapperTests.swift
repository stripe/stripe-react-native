@testable import stripe_react_native
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import XCTest

final class CheckoutErrorMapperTests: XCTestCase {
    func test_code_mapsReviewedCheckoutErrors() {
        XCTAssertEqual(CheckoutErrorMapper.code(for: CheckoutError.invalidClientSecret), .invalidClientSecret)
        XCTAssertEqual(CheckoutErrorMapper.code(for: CheckoutError.sheetCurrentlyPresented), .sheetCurrentlyPresented)
        XCTAssertEqual(CheckoutErrorMapper.code(for: CheckoutError.timedOut), .timeout)
        XCTAssertEqual(CheckoutErrorMapper.code(for: CheckoutError.apiError(message: "Nope")), .failed)
    }

    func test_code_mapsUnknownErrorsToFailed() {
        XCTAssertEqual(CheckoutErrorMapper.code(for: CocoaError(.fileNoSuchFile)), .failed)
    }
}
