import Foundation

/// Resources owned by one Checkout controller registered with the bridge.
///
/// Concrete instances own the native Checkout object, its stable Payment
/// Element and presenter, observation tokens, and pending operations.
protocol CheckoutControllerInstance: AnyObject {
    /// Releases all resources owned by this instance. Implementations must be idempotent.
    func destroy()
}

/// Stores Checkout controllers behind opaque identifiers used by JavaScript.
final class CheckoutControllerRegistry {
    private struct Entry {
        let instance: any CheckoutControllerInstance
        var eventSequence = 0
    }

    private let lock = NSLock()
    private let makeControllerId: () -> String
    private var entries: [String: Entry] = [:]

    init(makeControllerId: @escaping () -> String = { UUID().uuidString }) {
        self.makeControllerId = makeControllerId
    }

    var count: Int {
        lock.lock()
        defer { lock.unlock() }
        return entries.count
    }

    @discardableResult
    func register(_ instance: any CheckoutControllerInstance) -> String {
        lock.lock()
        defer { lock.unlock() }

        var controllerId = makeControllerId()
        while entries[controllerId] != nil {
            controllerId = makeControllerId()
        }

        entries[controllerId] = Entry(instance: instance)
        return controllerId
    }

    func instance<Instance: CheckoutControllerInstance>(
        for controllerId: String,
        as _: Instance.Type = Instance.self
    ) -> Instance? {
        lock.lock()
        defer { lock.unlock() }
        return entries[controllerId]?.instance as? Instance
    }

    /// Returns the next sequence number for an event from this controller.
    /// Returns `nil` after the controller has been removed.
    func nextEventSequence(for controllerId: String) -> Int? {
        lock.lock()
        defer { lock.unlock() }

        guard var entry = entries[controllerId] else {
            return nil
        }

        entry.eventSequence += 1
        entries[controllerId] = entry
        return entry.eventSequence
    }

    @discardableResult
    func remove(controllerId: String) -> Bool {
        let instance: (any CheckoutControllerInstance)?

        lock.lock()
        instance = entries.removeValue(forKey: controllerId)?.instance
        lock.unlock()

        instance?.destroy()
        return instance != nil
    }

    func removeAll() {
        let instances: [any CheckoutControllerInstance]

        lock.lock()
        instances = entries.values.map(\.instance)
        entries.removeAll()
        lock.unlock()

        instances.forEach { $0.destroy() }
    }
}
