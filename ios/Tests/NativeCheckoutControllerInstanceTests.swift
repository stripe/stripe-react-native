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

    func test_inlineViewReleasesReplacedAndDestroyedControllers() async throws {
        let sdk = StripeSdkImpl.shared
        let first = NativeCheckoutControllerInstance(checkout: try await makeCheckout(), emitEvent: { _ in })
        let second = NativeCheckoutControllerInstance(checkout: try await makeCheckout(), emitEvent: { _ in })
        let firstId = "first"
        let secondId = "second"
        sdk.checkoutControllers[firstId] = first
        sdk.checkoutControllers[secondId] = second
        defer {
            sdk.checkoutControllers.removeValue(forKey: firstId)?.destroy()
            sdk.checkoutControllers.removeValue(forKey: secondId)?.destroy()
        }
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 640))
        let view = CheckoutPaymentElementContainerView(frame: CGRect(x: 0, y: 0, width: 320, height: 1))
        view.controllerId = firstId
        var heights: [CGFloat] = []
        view.onHeightChanged = { event in heights.append(event?["height"] as? CGFloat ?? 0) }
        window.addSubview(view)
        view.layoutIfNeeded()
        XCTAssertTrue(view.subviews.first === first.paymentElement.uiView)
        XCTAssertGreaterThan(heights.first ?? 0, 0)
        let measurements = heights.count
        view.setNeedsLayout()
        view.layoutIfNeeded()
        XCTAssertEqual(heights.count, measurements)

        view.controllerId = secondId
        XCTAssertNil(first.paymentElement.uiView.superview)
        XCTAssertNil(first.paymentElement.uiView.delegate)
        sdk.checkoutControllers.removeValue(forKey: firstId)?.destroy()
        XCTAssertTrue(view.subviews.first === second.paymentElement.uiView)
        sdk.checkoutControllers.removeValue(forKey: secondId)?.destroy()
        XCTAssertTrue(view.subviews.isEmpty)
        XCTAssertNil(second.paymentElement.uiView.delegate)
        view.removeFromSuperview()
    }

    func test_sheetRejectsMissingPresenterAndDestroyedController() async throws {
        let sdk = StripeSdkImpl()
        let instance = NativeCheckoutControllerInstance(checkout: try await makeCheckout(), emitEvent: { _ in })
        let controllerId = "controller-1"
        sdk.checkoutControllers[controllerId] = instance
        defer { sdk.checkoutControllers.removeValue(forKey: controllerId)?.destroy() }

        for destroyed in [false, true] {
            if destroyed { sdk.checkoutControllers.removeValue(forKey: controllerId)?.destroy() }
            let rejected = expectation(description: "Invalid presentation rejects")
            sdk.presentCheckoutPaymentElement(controllerId: controllerId, resolver: { _ in
                XCTFail("Invalid presentation should reject")
                rejected.fulfill()
            }, rejecter: { code, message, _ in
                XCTAssertEqual(code, "Failed")
                XCTAssertEqual(message, destroyed
                    ? "Checkout controller `\(controllerId)` does not exist."
                    : "Checkout requires a presenting view controller.")
                rejected.fulfill()
            })
            await fulfillment(of: [rejected], timeout: 2)
        }
    }

    func test_confirmationRejectsConcurrentAttemptsAndSettlesOnDestruction() async throws {
        let checkout = try await makeCheckout()
        var statuses: [String] = []
        let instance = NativeCheckoutControllerInstance(checkout: checkout) { event in
            statuses.append(event["status"] as! String)
        }
        instance.start(controllerId: "confirming")
        var results: [Result<CheckoutController.ConfirmResult, Error>] = []
        let presenter = UIViewController()

        try instance.confirm(from: presenter) { results.append($0) }
        XCTAssertEqual(statuses.last, "confirming")
        XCTAssertThrowsError(try instance.confirm(from: presenter) { _ in
            XCTFail("A second confirmation must not start.")
        })
        instance.destroy()
        await Task.yield()

        XCTAssertEqual(results.count, 1)
        guard case .failure(let error) = results.first else {
            return XCTFail("Destruction must reject pending confirmation.")
        }
        XCTAssertTrue(error is CancellationError)
        XCTAssertEqual(statuses, ["ready", "confirming", "destroyed"])
        XCTAssertThrowsError(try instance.confirm(from: presenter) { _ in
            XCTFail("A destroyed controller must not confirm.")
        })
    }

    func test_nativeConfirmationFailureRestoresReady() async throws {
        let checkout = try await makeCheckout()
        var statuses: [String] = []
        let instance = NativeCheckoutControllerInstance(checkout: checkout) { event in
            statuses.append(event["status"] as! String)
        }
        instance.start(controllerId: "confirm-failure")
        defer { instance.destroy() }
        let finished = expectation(description: "Native confirmation result")
        try instance.confirm(from: UIViewController()) { result in
            guard case .success(.failed) = result else {
                XCTFail("Native Checkout should reject confirmation without a payment option.")
                finished.fulfill()
                return
            }
            finished.fulfill()
        }
        await fulfillment(of: [finished], timeout: 2)
        XCTAssertEqual(statuses.last, "ready")
        XCTAssertTrue(statuses.contains("confirming"))
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
