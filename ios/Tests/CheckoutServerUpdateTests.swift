@testable import stripe_react_native
@_spi(STP) import StripeCore
import XCTest

@MainActor
final class CheckoutServerUpdateTests: XCTestCase {
    func test_successAndFailureCompleteOnce() async throws {
        for error in [nil, CocoaError(.fileReadUnknown)] as [Error?] {
            var completions = 0
            let operation = CheckoutServerUpdate { result in
                completions += 1
                XCTAssertEqual(result?.localizedDescription, error?.localizedDescription)
            }
            do {
                try await operation.requestCallback {
                    operation.completeCallback(error: error)
                    operation.completeCallback(error: CancellationError())
                }
                XCTAssertNil(error)
            } catch let received {
                XCTAssertEqual(received.localizedDescription, error?.localizedDescription)
            }
            operation.finish(error: error)
            operation.finish(error: CancellationError())
            XCTAssertEqual(completions, 1)
        }
    }

    func test_destroyBeforeCallbackPreventsRequest() async {
        var completions = 0
        let operation = CheckoutServerUpdate { error in
            XCTAssertTrue(error is CancellationError)
            completions += 1
        }
        operation.finish(error: CancellationError())
        do {
            try await operation.requestCallback { XCTFail("Destroyed operation requested JS") }
            XCTFail("Expected cancellation")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
        operation.completeCallback(error: nil)
        operation.finish(error: nil)
        XCTAssertEqual(completions, 1)
    }

    func test_destroyWhileWaitingReleasesCallback() async {
        let operation = CheckoutServerUpdate { _ in }
        do {
            try await operation.requestCallback {
                operation.finish(error: CancellationError())
            }
            XCTFail("Expected cancellation")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
    }

    func test_nativeTimeoutReleasesCallbackAndIgnoresLateCompletion() async {
        var completions = 0
        let operation = CheckoutServerUpdate { _ in completions += 1 }
        let result: Result<Void, Error> = await withTimeout(0.01) {
            try await operation.requestCallback {}
        }
        switch result {
        case .success: XCTFail("Expected timeout")
        case .failure(let error):
            XCTAssertTrue(error is TimeoutError)
            operation.finish(error: error)
        }
        operation.completeCallback(error: nil)
        XCTAssertEqual(completions, 1)
    }
}
