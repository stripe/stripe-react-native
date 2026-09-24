@testable import stripe_react_native
@_spi(STP) import StripeCore
import XCTest

@MainActor
final class CheckoutServerUpdateTests: XCTestCase {
    func test_successAndFailureCompleteOnce() async {
        for error in [nil, CocoaError(.fileReadUnknown)] as [Error?] {
            let operation = CheckoutServerUpdate()
            do {
                try await operation.requestCallback {
                    operation.completeCallback(error: error)
                    operation.completeCallback(error: CancellationError())
                }
                XCTAssertNil(error)
            } catch let received {
                XCTAssertEqual(received.localizedDescription, error?.localizedDescription)
            }
        }
    }

    func test_destroyBeforeCallbackPreventsRequest() async {
        let operation = CheckoutServerUpdate()
        operation.cancel()
        do {
            try await operation.requestCallback { XCTFail("Destroyed operation requested JS") }
            XCTFail("Expected cancellation")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
        operation.completeCallback(error: nil)
    }

    func test_destroyWhileWaitingReleasesCallback() async {
        let operation = CheckoutServerUpdate()
        do {
            try await operation.requestCallback {
                operation.cancel()
            }
            XCTFail("Expected cancellation")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
    }

    func test_nativeTimeoutReleasesCallbackAndIgnoresLateCompletion() async {
        let operation = CheckoutServerUpdate()
        let result: Result<Void, Error> = await withTimeout(0.01) {
            try await operation.requestCallback {}
        }
        switch result {
        case .success: XCTFail("Expected timeout")
        case .failure(let error):
            XCTAssertTrue(error is TimeoutError)
        }
        operation.completeCallback(error: nil)
    }
}
