import Foundation
@testable import stripe_react_native
@_spi(PrivateBetaCustomerSheet) @_spi(STP) import StripePaymentSheet
import XCTest

@MainActor
final class ClientSecretProviderRequestRegistryTests: XCTestCase {
    func test_responsesCanCompleteInReverseOrder() async throws {
        let registry = ClientSecretProviderRequestRegistry<String>()
        let registered = expectation(description: "Both registered")
        registered.expectedFulfillmentCount = 2
        var firstId = ""
        var secondId = ""
        let first = Task { try await registry.request { firstId = $0; registered.fulfill() } }
        let second = Task { try await registry.request { secondId = $0; registered.fulfill() } }
        await fulfillment(of: [registered], timeout: 2)
        XCTAssertNotEqual(firstId, secondId)

        XCTAssertTrue(registry.resolve(requestId: secondId, result: .success("second")))
        let secondValue = try await second.value
        XCTAssertEqual(secondValue, "second")
        XCTAssertEqual(registry.count, 1)
        XCTAssertFalse(registry.resolve(requestId: secondId, result: .success("duplicate")))
        XCTAssertFalse(registry.resolve(requestId: "unknown", result: .success("wrong")))
        XCTAssertEqual(registry.count, 1)
        XCTAssertTrue(registry.resolve(requestId: firstId, result: .success("first")))
        let firstValue = try await first.value
        XCTAssertEqual(firstValue, "first")
        XCTAssertEqual(registry.count, 0)
    }

    func test_registersBeforeEmitting() async throws {
        let registry = ClientSecretProviderRequestRegistry<String>()
        let value = try await registry.request { requestId in
            XCTAssertTrue(registry.resolve(requestId: requestId, result: .success("immediate")))
        }
        XCTAssertEqual(value, "immediate")
        XCTAssertEqual(registry.count, 0)
    }

    func test_cancellationAffectsOnlyItsRequest() async throws {
        let registry = ClientSecretProviderRequestRegistry<String>()
        let registered = expectation(description: "Both registered")
        registered.expectedFulfillmentCount = 2
        var firstId = ""
        var secondId = ""
        let first = Task { try await registry.request { firstId = $0; registered.fulfill() } }
        let second = Task { try await registry.request { secondId = $0; registered.fulfill() } }
        await fulfillment(of: [registered], timeout: 2)

        first.cancel()
        assertCancellation(await first.result)
        XCTAssertFalse(registry.resolve(requestId: firstId, result: .success("late")))
        XCTAssertEqual(registry.count, 1)
        XCTAssertTrue(registry.resolve(requestId: secondId, result: .success("second")))
        let value = try await second.value
        XCTAssertEqual(value, "second")
    }

    func test_alreadyCanceledTaskDoesNotEmit() async {
        let registry = ClientSecretProviderRequestRegistry<String>()
        let task = Task { try await registry.request { _ in XCTFail("Canceled task emitted") } }
        task.cancel()
        assertCancellation(await task.result)
        XCTAssertEqual(registry.count, 0)
    }

    func test_cancellationRacingWithAResponseStillCancelsTheCaller() async {
        let registry = ClientSecretProviderRequestRegistry<String>()
        let registered = expectation(description: "Registered")
        var requestId = ""
        let task = Task { try await registry.request { requestId = $0; registered.fulfill() } }
        await fulfillment(of: [registered], timeout: 2)
        task.cancel()
        // The cancellation handler has to hop to MainActor, so a response may
        // claim the continuation first. The canceled caller must still throw.
        registry.resolve(requestId: requestId, result: .success("late"))
        assertCancellation(await task.result)
        XCTAssertEqual(registry.count, 0)
        XCTAssertFalse(registry.resolve(requestId: requestId, result: .success("duplicate")))
    }

    func test_cancelAllDrainsEveryRequest() async {
        let registry = ClientSecretProviderRequestRegistry<String>()
        let registered = expectation(description: "Both registered")
        registered.expectedFulfillmentCount = 2
        let first = Task { try await registry.request { _ in registered.fulfill() } }
        let second = Task { try await registry.request { _ in registered.fulfill() } }
        await fulfillment(of: [registered], timeout: 2)

        registry.cancelAll()
        registry.cancelAll()
        assertCancellation(await first.result)
        assertCancellation(await second.result)
        XCTAssertEqual(registry.count, 0)
    }

    func test_invalidatedRegistryRejectsFutureRequests() async {
        let registry = ClientSecretProviderRequestRegistry<String>()
        registry.invalidate()
        do {
            _ = try await registry.request { _ in XCTFail("Invalidated registry emitted") }
            XCTFail("Request should fail")
        } catch {
            XCTAssertTrue(error is CancellationError)
        }
        XCTAssertEqual(registry.count, 0)
    }

    func test_emitterFailureDisposesOfTheRequest() async {
        let registry = ClientSecretProviderRequestRegistry<String>()
        do {
            _ = try await registry.request { _ in throw TestError.failed }
            XCTFail("Request should fail")
        } catch {
            XCTAssertTrue(error is TestError)
        }
        XCTAssertEqual(registry.count, 0)
    }

    func test_malformedSetupIntentResponseFailsMatchingRequest() async {
        let sdk = StripeSdkImpl()
        let registry = ClientSecretProviderRequestRegistry<String>()
        sdk.setupIntentClientSecretRequests = registry
        let registered = expectation(description: "Registered")
        var requestId = ""
        let task = Task { try await registry.request { requestId = $0; registered.fulfill() } }
        await fulfillment(of: [registered], timeout: 2)

        let responded = expectation(description: "Bridge settled")
        sdk.clientSecretProviderSetupIntentClientSecretCallback(
            result: ["requestId": requestId, "clientSecret": 123],
            resolver: { _ in responded.fulfill() }, rejecter: { _, _, _ in XCTFail("Unexpected rejection") }
        )
        await fulfillment(of: [responded], timeout: 2)
        assertFailure(await task.result, message: "Missing or invalid clientSecret")
        XCTAssertEqual(registry.count, 0)
    }

    func test_customerSessionFailureAndMalformedResponsesDoNotHang() async {
        let sdk = StripeSdkImpl()
        let registry = ClientSecretProviderRequestRegistry<CustomerSessionClientSecret>()
        sdk.customerSessionClientSecretRequests = registry
        let responses: [(NSDictionary, String)] = [
            (["clientSecret": "secret", "customerId": 123], "Missing or invalid customerId"),
            (["customerId": "cus_test"], "Missing or invalid clientSecret"),
            (["error": "Merchant failed"], "Merchant failed"),
            (["error": 123], "Invalid client secret provider error"),
        ]
        for (payload, message) in responses {
            let registered = expectation(description: "Registered")
            var requestId = ""
            let task = Task { try await registry.request { requestId = $0; registered.fulfill() } }
            await fulfillment(of: [registered], timeout: 2)
            let result = payload.mutableCopy() as! NSMutableDictionary
            result["requestId"] = requestId
            let responded = expectation(description: "Bridge settled")
            sdk.clientSecretProviderCustomerSessionClientSecretCallback(
                result: result,
                resolver: { _ in responded.fulfill() }, rejecter: { _, _, _ in XCTFail("Unexpected rejection") }
            )
            await fulfillment(of: [responded], timeout: 2)
            assertFailure(await task.result, message: message)
            XCTAssertEqual(registry.count, 0)
        }
    }

    func test_reinitializationAndInvalidationCancelBothProviders() async {
        for reinitialize in [true, false] {
            let sdk = StripeSdkImpl()
            let setup = ClientSecretProviderRequestRegistry<String>()
            let session = ClientSecretProviderRequestRegistry<CustomerSessionClientSecret>()
            sdk.setupIntentClientSecretRequests = setup
            sdk.customerSessionClientSecretRequests = session
            let registered = expectation(description: "Both registered")
            registered.expectedFulfillmentCount = 2
            var oldId = ""
            let first = Task { try await setup.request { oldId = $0; registered.fulfill() } }
            let second = Task { try await session.request { _ in registered.fulfill() } }
            await fulfillment(of: [registered], timeout: 2)

            if reinitialize {
                let initialized = expectation(description: "Initialized")
                sdk.initCustomerSheet(
                    params: ["intentConfiguration": [:]], customerAdapterOverrides: [:],
                    resolver: { _ in initialized.fulfill() }, rejecter: { _, _, _ in XCTFail("Unexpected rejection") }
                )
                await fulfillment(of: [initialized], timeout: 2)
                XCTAssertFalse(sdk.setupIntentClientSecretRequests === setup)
                XCTAssertFalse(sdk.customerSessionClientSecretRequests === session)
            } else {
                sdk.invalidateCustomerSheet()
            }
            assertCancellation(await first.result)
            assertCancellation(await second.result)
            XCTAssertEqual(setup.count, 0)
            XCTAssertEqual(session.count, 0)

            let responded = expectation(description: "Late response rejected")
            sdk.clientSecretProviderSetupIntentClientSecretCallback(
                result: ["requestId": oldId, "clientSecret": "late"],
                resolver: { result in
                    XCTAssertNotNil((result as? NSDictionary)?["error"])
                    responded.fulfill()
                }, rejecter: { _, _, _ in XCTFail("Unexpected rejection") }
            )
            await fulfillment(of: [responded], timeout: 2)
            do {
                _ = try await setup.request { _ in XCTFail("Old sheet emitted after cleanup") }
                XCTFail("Old registry should be closed")
            } catch {
                XCTAssertTrue(error is CancellationError)
            }
        }
    }

    private func assertCancellation<T>(_ result: Result<T, Error>, file: StaticString = #filePath, line: UInt = #line) {
        guard case .failure(let error) = result else {
            XCTFail("Expected cancellation", file: file, line: line)
            return
        }
        XCTAssertTrue(error is CancellationError, file: file, line: line)
    }

    private func assertFailure<T>(_ result: Result<T, Error>, message: String, file: StaticString = #filePath, line: UInt = #line) {
        guard case .failure(let error) = result else {
            XCTFail("Expected failure", file: file, line: line)
            return
        }
        XCTAssertEqual(error.localizedDescription, message, file: file, line: line)
    }

    private enum TestError: Error { case failed }
}
