import Foundation

/// Resources owned by one Checkout controller registered with the bridge.
///
/// Concrete instances own the native Checkout object, its stable Payment
/// Element and presenter, observation tokens, and pending operations.
@MainActor
protocol CheckoutControllerInstance: AnyObject {
    /// Releases all resources owned by this instance. Must be idempotent and run on the main thread.
    func destroy()
}

/// Stores Checkout controllers behind opaque identifiers used by JavaScript.
@MainActor
final class CheckoutControllerRegistry {
    private struct Entry {
        let instance: any CheckoutControllerInstance
        var eventSequence = 0
    }

    private let makeControllerId: () -> String
    private var entries: [String: Entry] = [:]

    init(makeControllerId: @escaping () -> String = { UUID().uuidString }) {
        self.makeControllerId = makeControllerId
    }

    var count: Int {
        return entries.count
    }

    @discardableResult
    func register(_ instance: any CheckoutControllerInstance) -> String {
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
        return entries[controllerId]?.instance as? Instance
    }

    /// Returns the next sequence number for an event from this controller.
    /// Returns `nil` after the controller has been removed.
    func nextEventSequence(for controllerId: String) -> Int? {
        guard var entry = entries[controllerId] else {
            return nil
        }

        entry.eventSequence += 1
        entries[controllerId] = entry
        return entry.eventSequence
    }

    @discardableResult
    func remove(controllerId: String) -> Bool {
        let instance = entries.removeValue(forKey: controllerId)?.instance

        instance?.destroy()
        return instance != nil
    }

    func removeAll() {
        let instances = entries.values.map(\.instance)
        entries.removeAll()

        instances.forEach { $0.destroy() }
    }
}
