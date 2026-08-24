@testable import stripe_react_native
import XCTest

final class CheckoutControllerRegistryTests: XCTestCase {
    func test_register_storesMultipleControllersBehindOpaqueIdentifiers() {
        var controllerIds = ["controller-1", "controller-2"].makeIterator()
        let registry = CheckoutControllerRegistry {
            controllerIds.next()!
        }
        let first = TestCheckoutControllerInstance()
        let second = TestCheckoutControllerInstance()

        let firstId = registry.register(first)
        let secondId = registry.register(second)
        let storedFirst: TestCheckoutControllerInstance? = registry.instance(for: firstId)
        let storedSecond: TestCheckoutControllerInstance? = registry.instance(for: secondId)

        XCTAssertEqual(firstId, "controller-1")
        XCTAssertEqual(secondId, "controller-2")
        XCTAssertTrue(storedFirst === first)
        XCTAssertTrue(storedSecond === second)
        XCTAssertEqual(registry.count, 2)
    }

    func test_nextEventSequence_ordersEventsPerController() {
        var controllerIds = ["controller-1", "controller-2"].makeIterator()
        let registry = CheckoutControllerRegistry {
            controllerIds.next()!
        }
        let firstId = registry.register(TestCheckoutControllerInstance())
        let secondId = registry.register(TestCheckoutControllerInstance())

        XCTAssertEqual(registry.nextEventSequence(for: firstId), 1)
        XCTAssertEqual(registry.nextEventSequence(for: firstId), 2)
        XCTAssertEqual(registry.nextEventSequence(for: secondId), 1)
    }

    func test_remove_destroysControllerAndRejectsFutureEvents() {
        let registry = CheckoutControllerRegistry(makeControllerId: { "controller-1" })
        let instance = TestCheckoutControllerInstance()
        let controllerId = registry.register(instance)

        XCTAssertTrue(registry.remove(controllerId: controllerId))

        XCTAssertEqual(instance.destroyCallCount, 1)
        XCTAssertNil(registry.instance(for: controllerId) as TestCheckoutControllerInstance?)
        XCTAssertNil(registry.nextEventSequence(for: controllerId))
        XCTAssertFalse(registry.remove(controllerId: controllerId))
        XCTAssertEqual(instance.destroyCallCount, 1)
    }

    func test_removeAll_destroysEveryControllerOnce() {
        var controllerIds = ["controller-1", "controller-2"].makeIterator()
        let registry = CheckoutControllerRegistry {
            controllerIds.next()!
        }
        let first = TestCheckoutControllerInstance()
        let second = TestCheckoutControllerInstance()
        registry.register(first)
        registry.register(second)

        registry.removeAll()
        registry.removeAll()

        XCTAssertEqual(first.destroyCallCount, 1)
        XCTAssertEqual(second.destroyCallCount, 1)
        XCTAssertEqual(registry.count, 0)
    }
}

private final class TestCheckoutControllerInstance: CheckoutControllerInstance {
    private(set) var destroyCallCount = 0

    func destroy() {
        destroyCallCount += 1
    }
}
