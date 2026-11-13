import Foundation
@testable import stripe_react_native
@_spi(ReactNativeSDK) import StripeCore
@testable @_spi(ReactNativeSDK) import StripePaymentSheet
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
        XCTAssertEqual(events.last?["status"] as? String, "ready")

        checkout.isUpdating = true
        XCTAssertEqual(events.last?["status"] as? String, "updating")
        checkout.dangerouslySetSessionDirectly(try CheckoutTestFixtures.session(status: "expired"))
        checkout.isUpdating = false
        let session = try XCTUnwrap(events.last?["session"] as? [String: Any])
        XCTAssertEqual(session["status"] as? NSDictionary, ["type": "expired"])
        XCTAssertEqual(events.last?["status"] as? String, "ready")

        let countBeforeDestroy = events.count
        instance.destroy()
        instance.destroy()
        checkout.isUpdating = true
        checkout.dangerouslySetSessionDirectly(try CheckoutTestFixtures.session())

        XCTAssertEqual(events.count, countBeforeDestroy)
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
        let firstElement = first.checkout.getPaymentElement()
        let secondElement = second.checkout.getPaymentElement()
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
        XCTAssertTrue(view.subviews.first === firstElement.uiView)
        XCTAssertGreaterThan(heights.first ?? 0, 0)
        let measurements = heights.count
        view.setNeedsLayout()
        view.layoutIfNeeded()
        XCTAssertEqual(heights.count, measurements)

        view.controllerId = secondId
        XCTAssertNil(firstElement.uiView.superview)
        XCTAssertNil(firstElement.uiView.delegate)
        sdk.checkoutControllers.removeValue(forKey: firstId)?.destroy()
        XCTAssertTrue(view.subviews.first === secondElement.uiView)
        sdk.checkoutControllers.removeValue(forKey: secondId)?.destroy()
        XCTAssertTrue(view.subviews.isEmpty)
        XCTAssertNil(secondElement.uiView.delegate)
        view.removeFromSuperview()
    }

    func test_sheetRejectsMissingPresenterAndDestroyedController() async throws {
        let sdk = StripeSdkImpl()
        sdk.checkoutPresentingViewControllerProvider = { nil }
        let instance = NativeCheckoutControllerInstance(checkout: try await makeCheckout(), emitEvent: { _ in })
        let controllerId = "controller-1"
        sdk.checkoutControllers[controllerId] = instance
        defer { sdk.checkoutControllers.removeValue(forKey: controllerId)?.destroy() }

        let confirmationRejected = expectation(description: "Confirmation without a presenter rejects")
        sdk.confirmCheckout(controllerId: controllerId, resolver: { _ in
            XCTFail("Invalid confirmation should reject")
            confirmationRejected.fulfill()
        }, rejecter: { code, message, error in
            XCTAssertEqual(code, "Failed")
            XCTAssertEqual(message, "Checkout requires a visible presenting view controller.")
            // Bridge precondition failures show customers a generic message.
            XCTAssertEqual(
                (error as NSError?)?.userInfo["localizedMessage"] as? String,
                checkoutUnexpectedErrorMessage()
            )
            confirmationRejected.fulfill()
        })
        await fulfillment(of: [confirmationRejected], timeout: 2)

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

    func test_rejectionErrorAddsCustomerFacingMessage() {
        let nativeError = NSError(
            domain: "CheckoutTest",
            code: 7,
            userInfo: [NSLocalizedDescriptionKey: "This promotion code is invalid."]
        )
        let rejection = checkoutRejectionError(nativeError)
        XCTAssertEqual(rejection.domain, "CheckoutTest")
        XCTAssertEqual(rejection.code, 7)
        XCTAssertEqual(rejection.localizedDescription, "This promotion code is invalid.")
        XCTAssertEqual(rejection.userInfo["localizedMessage"] as? String, "This promotion code is invalid.")

        // Bridge errors describe integration problems, so customers see a generic message.
        XCTAssertEqual(
            checkoutRejectionError(CheckoutBridgeError.destroyed).userInfo["localizedMessage"] as? String,
            checkoutUnexpectedErrorMessage()
        )
    }

    func test_confirmationRejectsConcurrentAttemptsAndCancelsIfDestroyedBeforeStarting() async throws {
        let checkout = try await makeCheckout()
        var statuses: [String] = []
        let instance = NativeCheckoutControllerInstance(checkout: checkout) { event in
            statuses.append(event["status"] as! String)
        }
        instance.start(controllerId: "confirming")
        let presenter = UIViewController()
        let finished = expectation(description: "Confirmation finished")
        var result: CheckoutElementsController.ConfirmResult?

        try instance.confirm(from: presenter) {
            result = $0
            finished.fulfill()
        }
        XCTAssertEqual(statuses.last, "confirming")
        XCTAssertThrowsError(try instance.confirm(from: presenter) { _ in
            XCTFail("A second confirmation must not start.")
        })
        instance.destroy()
        await fulfillment(of: [finished], timeout: 2)

        guard case .canceled = result else {
            return XCTFail("Expected .canceled, got \(String(describing: result)).")
        }
        XCTAssertEqual(statuses, ["ready", "confirming"])
        XCTAssertThrowsError(try instance.confirm(from: presenter) { _ in
            XCTFail("A destroyed controller must not confirm.")
        })
    }

    func test_expressCheckoutResultPublishesCurrentSessionBeforeResultAndStopsAfterDestroy() async throws {
        let checkout = try await makeCheckout()
        var emitted: [String] = []
        var results: [[String: Any]] = []
        let instance = NativeCheckoutControllerInstance(
            checkout: checkout,
            emitExpressCheckoutResult: { event in
                emitted.append("result")
                results.append(event)
            },
            emitEvent: { _ in emitted.append("update") }
        )
        instance.start(controllerId: "express-result")
        emitted.removeAll()

        instance.handleExpressCheckoutResult(.canceled)

        XCTAssertEqual(emitted, ["update", "result"])
        XCTAssertEqual(results.last?["controllerId"] as? String, "express-result")
        XCTAssertNotNil(results.last?["result"])

        instance.destroy()
        instance.handleExpressCheckoutResult(.canceled)
        XCTAssertEqual(emitted, ["update", "result"])
    }

    func test_expressCheckoutViewMeasuresAndDetaches() async throws {
        let checkout = try await makeCheckout(expressCheckout: true)
        let element = checkout.getExpressCheckoutElement()
        let instance = NativeCheckoutControllerInstance(checkout: checkout, expressCheckoutElement: element, emitEvent: { _ in })
        let sdk = StripeSdkImpl.shared
        let controllerId = "express-view"
        sdk.checkoutControllers[controllerId] = instance
        defer { sdk.checkoutControllers.removeValue(forKey: controllerId)?.destroy() }
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 640))
        let view = CheckoutExpressCheckoutElementContainerView(frame: CGRect(x: 0, y: 0, width: 320, height: 1))
        var heights: [CGFloat] = []
        var heightUpdate: XCTestExpectation?
        view.controllerId = controllerId
        view.onHeightChanged = { event in
            heights.append(event?["height"] as? CGFloat ?? -1)
            heightUpdate?.fulfill()
            heightUpdate = nil
        }
        window.addSubview(view)
        view.layoutIfNeeded()
        XCTAssertTrue(element.uiView.superview === view)
        XCTAssertEqual(heights.last, 0)

        var configuration = CheckoutElementsController.Configuration(clientSecret: "cs_test_secret", returnURL: "example://checkout")
        configuration.expressCheckoutElement = .init(completion: { _ in })
        let updated = expectation(description: "Session height updated")
        heightUpdate = updated
        checkout.dangerouslySetSessionDirectly(try CheckoutTestFixtures.session(
            configuration: configuration, paymentMethods: ["card", "link"]
        ))
        await fulfillment(of: [updated], timeout: 2)
        XCTAssertEqual(heights.last, 44)
        let count = heights.count
        view.setNeedsLayout()
        view.layoutIfNeeded()
        XCTAssertEqual(heights.count, count)
        view.frame.size.width = 200
        view.layoutIfNeeded()
        XCTAssertEqual(element.uiView.bounds.width, 200)
        XCTAssertEqual(heights.last, 44)

        let collapsed = expectation(description: "Unavailable wallets collapse the element")
        heightUpdate = collapsed
        checkout.dangerouslySetSessionDirectly(try CheckoutTestFixtures.session())
        await fulfillment(of: [collapsed], timeout: 2)
        XCTAssertEqual(heights.last, 0)

        view.removeFromSuperview()
        XCTAssertNil(element.uiView.superview)
        window.addSubview(view)
        view.layoutIfNeeded()
        XCTAssertTrue(element.uiView.superview === view)
        XCTAssertEqual(heights.last, 0)
        instance.destroy()
        XCTAssertNil(element.uiView.superview)
        XCTAssertTrue(view.subviews.isEmpty)
        view.controllerId = nil
    }

    private func makeCheckout(expressCheckout: Bool = false) async throws -> CheckoutElementsController {
        let sessionConfiguration = URLSessionConfiguration.ephemeral
        sessionConfiguration.protocolClasses = [CheckoutFixtureURLProtocol.self]
        let apiClient = STPAPIClient(publishableKey: "pk_test_123")
        apiClient.apiURL = URL(string: "https://checkout.test")!
        apiClient.urlSession = URLSession(configuration: sessionConfiguration)
        var configuration = CheckoutElementsController.Configuration(
            clientSecret: "cs_test_secret_123",
            returnURL: "https://example.com/checkout"
        )
        configuration.apiClient = apiClient
        configuration.paymentElement = .init()
        if expressCheckout { configuration.expressCheckoutElement = .init(completion: { _ in }) }
        return try await CheckoutElementsController(configuration: configuration)
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
