@testable import stripe_react_native
import XCTest

final class PMMEDirectEventQueueTests: XCTestCase {
    func test_enqueueWithoutConsumer_flushDeliversFailedConfigureStatus() {
        let queue = PMMEDirectEventQueue()
        var delivered: NSDictionary?

        queue.enqueueConfigureResult([
            "result": [
                "status": "failed",
                "message": "currency is required",
                "code": "InvalidConfiguration",
            ] as [String: Any],
        ])

        queue.flush(
            configureDeliver: { event in
                delivered = event
            },
            heightDeliver: nil
        )

        let result = delivered?["result"] as? NSDictionary
        XCTAssertEqual(result?["status"] as? String, "failed")
        XCTAssertEqual(result?["message"] as? String, "currency is required")
        XCTAssertEqual(result?["code"] as? String, "InvalidConfiguration")
    }

    func test_invalidateDropsPendingAndBumpsGeneration() {
        let queue = PMMEDirectEventQueue()
        let generationBefore = queue.generation
        var configureDelivered: NSDictionary?
        var heightDelivered: NSDictionary?

        queue.enqueueConfigureResult([
            "result": ["status": "loaded"] as [String: Any],
        ])
        queue.enqueueHeightChanged([
            "height": 42,
            "viewTag": 1,
        ])

        queue.invalidate()

        XCTAssertEqual(queue.generation, generationBefore &+ 1)

        queue.flush(
            configureDeliver: { event in
                configureDelivered = event
            },
            heightDeliver: { event in
                heightDelivered = event
            }
        )

        XCTAssertNil(configureDelivered)
        XCTAssertNil(heightDelivered)
    }

    func test_staleGenerationCallbacksAreIgnoredByCallers() {
        let queue = PMMEDirectEventQueue()
        let capturedGeneration = queue.generation
        var deliveryCount = 0

        queue.invalidate()

        // Mirrors Fabric component-view callback gating on queue.generation.
        let deliverIfCurrent: (NSDictionary) -> Void = { _ in
            guard queue.generation == capturedGeneration else { return }
            deliveryCount += 1
        }

        deliverIfCurrent(["result": ["status": "loaded"] as [String: Any]])
        XCTAssertEqual(deliveryCount, 0)
        XCTAssertNotEqual(queue.generation, capturedGeneration)
    }
}
