import Foundation
@testable import stripe_react_native
@testable @_spi(PrivateBetaCustomerSheet) import StripePaymentSheet
import XCTest

@MainActor
final class CustomerSessionRequestRegistryTests: XCTestCase {
    func test_overlappingResponsesCompleteInEitherOrderThroughBridge() async throws {
        for order in [[0, 1], [1, 0]] {
            let sdk = StripeSdkImpl()
            let registry = CustomerSessionRequestRegistry()
            sdk.customerSessionRequests = registry
            let first = await startRequest(registry)
            let second = await startRequest(registry)
            let requests = [first, second]
            XCTAssertNotEqual(first.id, second.id)

            for index in order {
                let request = requests[index]
                XCTAssertNil(bridgeError(sdk, response: success(request.id, label: "\(index)")))
                await fulfillment(of: [request.completed], timeout: 2)
                try assertSecret(request, label: "\(index)")
            }
            for request in requests {
                XCTAssertFalse(registry.complete(requestId: request.id, result: .success(secret("duplicate"))))
            }
        }
    }

    func test_duplicateUnknownAndMissingIDsDoNotConsumeAnotherRequest() async throws {
        let sdk = StripeSdkImpl()
        let registry = CustomerSessionRequestRegistry()
        sdk.customerSessionRequests = registry
        let first = await startRequest(registry)
        let second = await startRequest(registry)
        XCTAssertNil(bridgeError(sdk, response: success(second.id, label: "B")))
        await fulfillment(of: [second.completed], timeout: 2)
        try assertSecret(second, label: "B")

        for response in [success(second.id, label: "duplicate"), success("unknown", label: "unknown"), [:]] {
            XCTAssertEqual(bridgeError(sdk, response: response)?["code"] as? String, "Failed")
            XCTAssertNil(first.result)
        }
        XCTAssertNil(bridgeError(sdk, response: success(first.id, label: "A")))
        await fulfillment(of: [first.completed], timeout: 2)
        try assertSecret(first, label: "A")
    }

    func test_providerErrorsAndMalformedResponsesFailOnlyMatchingRequest() async throws {
        let responses: [NSDictionary] = [
            ["error": "Merchant failed"],
            ["customerId": "cus_test"],
            ["clientSecret": "cuss_secret_test"],
            ["customerId": "cus_test", "clientSecret": ""],
            ["customerId": "cus_test", "clientSecret": 123],
        ]
        for response in responses {
            let sdk = StripeSdkImpl()
            let registry = CustomerSessionRequestRegistry()
            sdk.customerSessionRequests = registry
            let failed = await startRequest(registry)
            let other = await startRequest(registry)
            let payload = response.mutableCopy() as! NSMutableDictionary
            payload["requestId"] = failed.id
            XCTAssertNil(bridgeError(sdk, response: payload))
            await fulfillment(of: [failed.completed], timeout: 2)
            let error = try failure(failed)
            XCTAssertEqual(error.localizedDescription, response["error"] as? String ?? "Invalid CustomerSessionClientSecret format")
            XCTAssertNil(other.result)
            XCTAssertFalse(registry.complete(requestId: failed.id, result: .success(secret("late"))))
            XCTAssertNil(bridgeError(sdk, response: success(other.id, label: "other")))
            await fulfillment(of: [other.completed], timeout: 2)
            try assertSecret(other, label: "other")
        }
    }

    func test_registersBeforeEmittingAndReleasesCompletedContinuation() async throws {
        let registry = CustomerSessionRequestRegistry()
        let request = await startRequest(registry) { id in
            XCTAssertTrue(registry.complete(requestId: id, result: .success(self.secret("immediate"))))
        }
        await fulfillment(of: [request.completed], timeout: 2)
        try assertSecret(request, label: "immediate")
        XCTAssertFalse(registry.complete(requestId: request.id, result: .success(secret("duplicate"))))
    }

    func test_emitterFailureRemovesRequest() async throws {
        let registry = CustomerSessionRequestRegistry()
        let request = await startRequest(registry) { _ in
            throw NSError(domain: "Test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Emitter unavailable"])
        }
        await fulfillment(of: [request.completed], timeout: 2)
        XCTAssertEqual(try failure(request).localizedDescription, "Emitter unavailable")
        XCTAssertFalse(registry.complete(requestId: request.id, result: .success(secret("late"))))
    }

    func test_callerCancellationRemovesOnlyItsOwnRequest() async throws {
        let registry = CustomerSessionRequestRegistry()
        let first = await startRequest(registry)
        let second = await startRequest(registry)
        first.task?.cancel()
        await fulfillment(of: [first.completed], timeout: 2)
        XCTAssertTrue(try failure(first) is CancellationError)
        XCTAssertFalse(registry.complete(requestId: first.id, result: .success(secret("late"))))
        XCTAssertNil(second.result)
        XCTAssertTrue(registry.complete(requestId: second.id, result: .success(secret("B"))))
        await fulfillment(of: [second.completed], timeout: 2)
        try assertSecret(second, label: "B")
    }

    func test_cancellationCompetingWithResponseSettlesExactlyOnce() async throws {
        for cancelFirst in [true, false] {
            let registry = CustomerSessionRequestRegistry()
            let request = await startRequest(registry)
            if cancelFirst { request.task?.cancel() }
            registry.complete(requestId: request.id, result: .success(secret("A")))
            if !cancelFirst { request.task?.cancel() }
            await fulfillment(of: [request.completed], timeout: 2)
            switch try XCTUnwrap(request.result) {
            case .success:
                try assertSecret(request, label: "A")
            case .failure(let error):
                XCTAssertTrue(error is CancellationError)
            }
            XCTAssertFalse(registry.complete(requestId: request.id, result: .success(secret("duplicate"))))
        }
    }

    func test_invalidationCancelsAllRequestsAndRejectsNewWork() async throws {
        let registry = CustomerSessionRequestRegistry()
        let first = await startRequest(registry)
        let second = await startRequest(registry)
        registry.invalidate()
        registry.invalidate()
        await fulfillment(of: [first.completed, second.completed], timeout: 2)
        for request in [first, second] {
            XCTAssertTrue(try failure(request) is CancellationError)
            XCTAssertFalse(registry.complete(requestId: request.id, result: .success(secret("late"))))
        }
        let late = await startRequest(registry, expectsEmission: false) { _ in
            XCTFail("An invalidated registry must not emit")
        }
        await fulfillment(of: [late.completed], timeout: 2)
        XCTAssertTrue(try failure(late) is CancellationError)
    }

    func test_reinitializationAndModuleCleanupCancelRequestsBeforeReplacement() async throws {
        for reinitialize in [true, false] {
            let sdk = StripeSdkImpl()
            let oldRegistry = CustomerSessionRequestRegistry()
            sdk.customerSessionRequests = oldRegistry
            let first = await startRequest(oldRegistry)
            let second = await startRequest(oldRegistry)

            if reinitialize {
                initialize(sdk)
            } else {
                sdk.invalidateCustomerSessionRequests()
            }
            await fulfillment(of: [first.completed, second.completed], timeout: 2)
            XCTAssertTrue(try failure(first) is CancellationError)
            XCTAssertTrue(try failure(second) is CancellationError)
            if !reinitialize {
                XCTAssertNil(sdk.customerSessionRequests)
                initialize(sdk)
            }

            let replacement = try XCTUnwrap(sdk.customerSessionRequests)
            XCTAssertFalse(replacement === oldRegistry)
            let current = await startRequest(replacement)
            for request in [first, second] {
                XCTAssertEqual(bridgeError(sdk, response: success(request.id, label: "stale"))?["code"] as? String, "Failed")
            }
            XCTAssertNil(current.result)
            XCTAssertNil(bridgeError(sdk, response: success(current.id, label: "new")))
            await fulfillment(of: [current.completed], timeout: 2)
            try assertSecret(current, label: "new")

            let retired = await startRequest(oldRegistry, expectsEmission: false) { _ in
                XCTFail("Retired sheet emitted a request")
            }
            await fulfillment(of: [retired.completed], timeout: 2)
            XCTAssertTrue(try failure(retired) is CancellationError)
        }
    }

    private func startRequest(
        _ registry: CustomerSessionRequestRegistry,
        expectsEmission: Bool = true,
        onEmit: @escaping (String) throws -> Void = { _ in }
    ) async -> PendingRequest {
        let request = PendingRequest()
        request.task = Task { @MainActor in
            do {
                let value = try await registry.request { id in
                    request.id = id
                    request.emitted.fulfill()
                    try onEmit(id)
                }
                request.result = .success(value)
            } catch {
                request.result = .failure(error)
            }
            request.completed.fulfill()
        }
        addTeardownBlock {
            await MainActor.run {
                registry.invalidate()
                request.task?.cancel()
            }
        }
        if expectsEmission {
            await fulfillment(of: [request.emitted], timeout: 2)
        }
        return request
    }

    private func bridgeError(_ sdk: StripeSdkImpl, response: NSDictionary) -> NSDictionary? {
        var calls = 0
        var error: NSDictionary?
        sdk.clientSecretProviderCustomerSessionClientSecretCallback(
            customerSessionClientSecretDict: response,
            resolver: { value in
                calls += 1
                error = (value as? NSDictionary)?["error"] as? NSDictionary
            },
            rejecter: { _, _, _ in XCTFail("Unexpected bridge rejection") }
        )
        XCTAssertEqual(calls, 1, "Every native response must settle its bridge promise exactly once")
        return error
    }

    private func initialize(_ sdk: StripeSdkImpl) {
        var calls = 0
        sdk.initCustomerSheet(
            params: ["intentConfiguration": [:]], customerAdapterOverrides: [:],
            resolver: { value in
                calls += 1
                XCTAssertNil((value as? NSDictionary)?["error"])
            }, rejecter: { _, _, _ in XCTFail("Unexpected initialization failure") }
        )
        XCTAssertEqual(calls, 1)
    }

    private func secret(_ label: String) -> CustomerSessionClientSecret {
        CustomerSessionClientSecret(customerId: "cus_\(label)", clientSecret: "cuss_secret_\(label)")
    }

    private func success(_ requestId: String, label: String) -> NSDictionary {
        ["requestId": requestId, "customerId": "cus_\(label)", "clientSecret": "cuss_secret_\(label)"]
    }

    private func assertSecret(_ request: PendingRequest, label: String, file: StaticString = #filePath, line: UInt = #line) throws {
        let value = try XCTUnwrap(request.result, file: file, line: line).get()
        XCTAssertEqual(value.customerId, "cus_\(label)", file: file, line: line)
        XCTAssertEqual(value.clientSecret, "cuss_secret_\(label)", file: file, line: line)
    }

    private func failure(_ request: PendingRequest, file: StaticString = #filePath, line: UInt = #line) throws -> Error {
        switch try XCTUnwrap(request.result, file: file, line: line) {
        case .failure(let error): return error
        case .success:
            XCTFail("Expected request to fail", file: file, line: line)
            throw NSError(domain: "Test", code: 0)
        }
    }
}

@MainActor
private final class PendingRequest {
    var id = ""
    var result: Result<CustomerSessionClientSecret, Error>?
    var task: Task<Void, Never>?
    let emitted = XCTestExpectation(description: "Request emitted")
    let completed: XCTestExpectation = {
        let expectation = XCTestExpectation(description: "Request completed once")
        expectation.assertForOverFulfill = true
        return expectation
    }()
}
