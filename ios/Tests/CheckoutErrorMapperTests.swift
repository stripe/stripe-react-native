@testable import stripe_react_native
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import XCTest

final class CheckoutErrorMapperTests: XCTestCase {
    func test_code_mapsCancellation() {
        XCTAssertEqual(CheckoutErrorMapper.code(for: CancellationError()), .canceled)
    }

    func test_code_mapsUnknownErrorsToFailed() {
        XCTAssertEqual(CheckoutErrorMapper.code(for: CocoaError(.fileNoSuchFile)), .failed)
    }
}
