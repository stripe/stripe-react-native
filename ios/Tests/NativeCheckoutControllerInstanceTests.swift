import Foundation
@testable import stripe_react_native
@_spi(STP) import StripeCore
@testable @_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import XCTest

@MainActor
final class NativeCheckoutControllerInstanceTests: XCTestCase {
    func test_observesNativeSnapshotsAndStopsOnDestruction() async throws {
        let checkout = try await makeCheckout()
        var events: [[String: Any]] = []
        let instance = NativeCheckoutControllerInstance(checkout: checkout) {
            events.append($0)
        }
        let controllerId = "controller-1"
        instance.start(controllerId: controllerId)
        XCTAssertTrue(instance.paymentElement === checkout.getPaymentElement())
        XCTAssertEqual(events.last?["status"] as? String, "ready")

        checkout.isUpdating = true
        XCTAssertEqual(events.last?["status"] as? String, "updating")
        checkout.dangerouslySetSessionDirectly(try CheckoutTestFixtures.session(status: "expired"))
        checkout.isUpdating = false
        let session = try XCTUnwrap(events.last?["session"] as? [String: Any])
        XCTAssertEqual(session["status"] as? NSDictionary, ["type": "expired"])
        XCTAssertEqual(events.last?["status"] as? String, "ready")

        instance.destroy()
        instance.destroy()
        let countAfterDestroy = events.count
        checkout.isUpdating = true
        checkout.dangerouslySetSessionDirectly(try CheckoutTestFixtures.session())

        XCTAssertEqual(events.count, countAfterDestroy)
        XCTAssertEqual(events.filter { $0["status"] as? String == "destroyed" }.count, 1)
        XCTAssertEqual(events.last?["status"] as? String, "destroyed")
    }

    func test_invalidationCancelsPendingCreationTasks() async {
        let sdk = StripeSdkImpl()
        let canceled = expectation(description: "Pending creation canceled")
        let task = Task { @MainActor in
            do {
                try await Task.sleep(nanoseconds: 60_000_000_000)
                XCTFail("Pending creation should be canceled")
            } catch {
                canceled.fulfill()
            }
        }
        sdk.pendingCheckoutCreations["pending"] = task
        sdk.invalidateCheckoutControllers()
        await fulfillment(of: [canceled], timeout: 2)

        XCTAssertTrue(task.isCancelled)
        XCTAssertTrue(sdk.pendingCheckoutCreations.isEmpty)
    }

    private func makeCheckout() async throws -> CheckoutController {
        let sessionConfiguration = URLSessionConfiguration.ephemeral
        sessionConfiguration.protocolClasses = [CheckoutFixtureURLProtocol.self]
        let apiClient = STPAPIClient(publishableKey: "pk_test_123")
        apiClient.apiURL = URL(string: "https://checkout.test")!
        apiClient.urlSession = URLSession(configuration: sessionConfiguration)
        var configuration = CheckoutController.Configuration(
            clientSecret: "cs_test_secret_123",
            returnURL: "https://example.com/checkout"
        )
        configuration.apiClient = apiClient
        configuration.paymentElement = .init()
        var link = PaymentElement.LinkConfiguration()
        link.display = .never
        configuration.paymentElement?.linkConfiguration = link
        return try await CheckoutController(configuration: configuration)
    }
}

private final class CheckoutFixtureURLProtocol: URLProtocol {
    override static func canInit(with request: URLRequest) -> Bool {
        request.url?.host == "checkout.test"
    }

    override static func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        do {
            let data = try JSONSerialization.data(withJSONObject: CheckoutTestFixtures.response())
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
