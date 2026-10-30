@testable import stripe_react_native
@_spi(PaymentMethodMessagingElementPreview) @_spi(STP) import StripePaymentSheet
import UIKit
import XCTest

@MainActor
final class PaymentMethodMessagingElementViewTests: XCTestCase {
    func test_lateResultsDoNotReplaceCustomAppearanceOrEmitEvents() async throws {
        for staleResult in staleResults() {
            let harness = Harness()
            let firstTask = try await startLoad(harness) { harness.view.configuration = configuration() }
            let secondTask = try await startLoad(harness) {
                harness.view.appearance = ["style": "dark", "textColor": "#123456"]
            }
            XCTAssertEqual(harness.loader.configurations[0].appearance.style, .automatic)
            XCTAssertEqual(harness.loader.configurations[1].appearance.style, .alwaysDark)
            XCTAssertEqual(harness.loader.configurations[1].appearance.textColor, UIColor(hexString: "#123456"))

            let current = StubElement()
            harness.loader.complete(1, with: .success(current))
            await secondTask.value
            XCTAssertTrue(harness.view.subviews.first === current.view)
            XCTAssertEqual(harness.statuses, ["loading", "loading", "loaded"])
            let heights = harness.heights
            let events = harness.events as NSArray

            harness.loader.complete(0, with: staleResult)
            await firstTask.value
            XCTAssertTrue(harness.view.subviews.first === current.view)
            XCTAssertEqual(harness.view.subviews.count, 1)
            XCTAssertEqual(harness.heights, heights)
            XCTAssertEqual(harness.events as NSArray, events)
        }
    }

    func test_staleResultsAreIgnoredWhileLatestLoadIsPending() async throws {
        for staleResult in staleResults() {
            let harness = Harness()
            let firstTask = try await startLoad(harness) { harness.view.configuration = configuration() }
            let secondTask = try await startLoad(harness) { harness.view.configuration = configuration(amount: 2000) }
            XCTAssertEqual(harness.loader.configurations[1].amount, 2000)

            harness.loader.complete(0, with: staleResult)
            await firstTask.value
            XCTAssertTrue(harness.view.subviews.isEmpty)
            XCTAssertTrue(harness.heights.isEmpty)
            XCTAssertEqual(harness.statuses, ["loading", "loading"])

            let current = StubElement()
            harness.loader.complete(1, with: .success(current))
            await secondTask.value
            XCTAssertTrue(harness.view.subviews.first === current.view)
            XCTAssertEqual(harness.statuses, ["loading", "loading", "loaded"])
        }
    }

    func test_invalidConfigurationInvalidatesPendingLoad() async throws {
        let harness = Harness()
        let task = try await startLoad(harness) { harness.view.configuration = configuration() }

        harness.view.configuration = ["currency": "usd"]
        XCTAssertEqual(harness.statuses, ["loading", "failed"])
        XCTAssertEqual((harness.events.last?["error"] as? NSDictionary)?["code"] as? String, "InvalidConfiguration")
        harness.loader.complete(0, with: .success(StubElement()))
        await task.value
        XCTAssertEqual(harness.statuses, ["loading", "failed"])
        XCTAssertTrue(harness.heights.isEmpty)
        XCTAssertTrue(harness.view.subviews.isEmpty)
    }

    func test_supersededTaskDoesNotStartOrEmitLoading() async throws {
        let harness = Harness()
        var supersededTask: Task<Void, Never>?
        let currentTask = try await startLoad(harness) {
            harness.view.configuration = configuration()
            supersededTask = try XCTUnwrap(harness.view.configurationTask)
            harness.view.appearance = ["style": "dark"]
        }
        await supersededTask?.value
        XCTAssertEqual(harness.loader.configurations.count, 1)
        XCTAssertEqual(harness.loader.configurations[0].appearance.style, .alwaysDark)
        XCTAssertEqual(harness.statuses, ["loading"])

        harness.loader.complete(0, with: .success(nil))
        await currentTask.value
        XCTAssertEqual(harness.statuses, ["loading", "no_content"])
    }

    func test_appearanceBeforeConfigurationIsIncludedInFirstLoad() async throws {
        let harness = Harness()
        harness.view.appearance = ["style": "dark"]
        XCTAssertNil(harness.view.configurationTask)
        let task = try await startLoad(harness) { harness.view.configuration = configuration() }
        XCTAssertEqual(harness.loader.configurations[0].appearance.style, .alwaysDark)
        harness.loader.complete(0, with: .success(StubElement()))
        await task.value
        XCTAssertEqual(harness.statuses, ["loading", "loaded"])
    }

    func test_currentFailureAndNoContentRemovePreviouslyLoadedView() async throws {
        for result in [PaymentMethodMessagingElementLoadResult.success(nil), .failure(testError())] {
            let harness = Harness()
            let firstTask = try await startLoad(harness) { harness.view.configuration = configuration() }
            let element = StubElement()
            harness.loader.complete(0, with: .success(element))
            await firstTask.value
            XCTAssertTrue(harness.view.subviews.first === element.view)

            let secondTask = try await startLoad(harness) { harness.view.configuration = configuration(amount: 2000) }
            harness.loader.complete(1, with: result)
            await secondTask.value
            XCTAssertTrue(harness.view.subviews.isEmpty)
            XCTAssertNil(element.view.superview)
            XCTAssertEqual(harness.heights.last, 0)
            switch result {
            case .success:
                XCTAssertEqual(harness.statuses.last, "no_content")
            case .failure:
                XCTAssertEqual(harness.statuses.last, "failed")
                XCTAssertEqual(harness.events.last?["message"] as? String, "Test load failed")
            }
        }
    }

    private func startLoad(_ harness: Harness, update: () throws -> Void) async throws -> Task<Void, Never> {
        let started = expectation(description: "Load started")
        harness.loader.onStart = { started.fulfill() }
        try update()
        let task = try XCTUnwrap(harness.view.configurationTask)
        await fulfillment(of: [started], timeout: 2)
        return task
    }

    private func configuration(amount: Int = 1000) -> NSDictionary {
        ["amount": amount, "currency": "usd"]
    }

    private func testError() -> NSError {
        NSError(domain: "Test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Test load failed"])
    }

    private func staleResults() -> [PaymentMethodMessagingElementLoadResult] {
        [.success(StubElement()), .success(nil), .failure(testError())]
    }
}

@MainActor
private final class StubElement: PaymentMethodMessagingElementInstance {
    let view = UIView(frame: CGRect(x: 0, y: 0, width: 320, height: 24))
}

@MainActor
private final class ControlledLoader {
    var configurations: [PaymentMethodMessagingElement.Configuration] = []
    var onStart: (() -> Void)?
    private var continuations: [Int: CheckedContinuation<PaymentMethodMessagingElementLoadResult, Never>] = [:]

    func create(_ configuration: PaymentMethodMessagingElement.Configuration) async -> PaymentMethodMessagingElementLoadResult {
        let index = configurations.count
        configurations.append(configuration)
        return await withCheckedContinuation { continuation in
            continuations[index] = continuation
            onStart?()
        }
    }

    func complete(_ index: Int, with result: PaymentMethodMessagingElementLoadResult) {
        guard let continuation = continuations.removeValue(forKey: index) else {
            return XCTFail("No pending load at index \(index)")
        }
        continuation.resume(returning: result)
    }
}

@MainActor
private final class Harness {
    let view = PaymentMethodMessagingElementContainerView(frame: CGRect(x: 0, y: 0, width: 320, height: 1))
    let loader = ControlledLoader()
    var events: [[String: Any]] = []
    var heights: [CGFloat] = []
    var statuses: [String] { events.compactMap { $0["status"] as? String } }

    init() {
        view.createMessagingElement = { [loader] in await loader.create($0) }
        view.emitConfigureResult = { [weak self] in self?.events.append($0) }
        view.emitHeight = { [weak self] in self?.heights.append($0["height"] as? CGFloat ?? 0) }
    }
}
