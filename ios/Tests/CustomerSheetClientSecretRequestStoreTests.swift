@testable import stripe_react_native
import XCTest

class CustomerSheetClientSecretRequestStoreTests: XCTestCase {
    func test_overlappingRequestsResolveOnlyTheirOwnResponse() async throws {
        let store = CustomerSheetClientSecretRequestStore<String>()
        var firstId = ""
        var secondId = ""
        let firstEmitted = expectation(description: "First request emitted")
        let secondEmitted = expectation(description: "Second request emitted")

        let first = Task {
            try await store.request { requestId in
                firstId = requestId
                firstEmitted.fulfill()
            }
        }
        let second = Task {
            try await store.request { requestId in
                secondId = requestId
                secondEmitted.fulfill()
            }
        }
        await fulfillment(of: [firstEmitted, secondEmitted], timeout: 2)

        XCTAssertNotEqual(firstId, secondId)
        XCTAssertTrue(store.succeed(requestId: secondId, value: "second"))
        XCTAssertFalse(store.succeed(requestId: secondId, value: "duplicate"))
        XCTAssertTrue(store.succeed(requestId: firstId, value: "first"))
        let firstValue = try await first.value
        let secondValue = try await second.value
        XCTAssertEqual(firstValue, "first")
        XCTAssertEqual(secondValue, "second")
    }

    func test_cancelledRequestIgnoresLateResponse() async {
        let store = CustomerSheetClientSecretRequestStore<String>()
        var requestId = ""
        let emitted = expectation(description: "Request emitted")
        let task = Task {
            try await store.request { id in
                requestId = id
                emitted.fulfill()
            }
        }
        await fulfillment(of: [emitted], timeout: 2)

        task.cancel()
        do {
            _ = try await task.value
            XCTFail("A cancelled request should throw")
        } catch is CancellationError {
            XCTAssertFalse(store.succeed(requestId: requestId, value: "late"))
        } catch {
            XCTFail("Expected CancellationError, got \(error)")
        }
    }

    func test_cancelAllEndsPendingRequests() async {
        let store = CustomerSheetClientSecretRequestStore<String>()
        let emitted = expectation(description: "Request emitted")
        let task = Task {
            try await store.request { _ in emitted.fulfill() }
        }
        await fulfillment(of: [emitted], timeout: 2)

        store.cancelAll()
        do {
            _ = try await task.value
            XCTFail("A replaced CustomerSheet should cancel pending requests")
        } catch is CancellationError {
            // Expected.
        } catch {
            XCTFail("Expected CancellationError, got \(error)")
        }
    }
}
