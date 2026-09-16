import Combine
import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

/// Owns a native Checkout controller and its session observation for the bridge.
@MainActor
final class NativeCheckoutControllerInstance {
    private enum Status: String {
        case ready
        case updating
        case destroyed
    }

    let checkout: CheckoutController
    let paymentElement: PaymentElement
    private(set) lazy var session = CheckoutSessionSerializer.serialize(checkout.session)

    private let emitEvent: ([String: Any]) -> Void
    private var observation: AnyCancellable?
    private var controllerId: String?
    private var destructionObservers: [UUID: () -> Void] = [:]
    private var isDestroyed = false
    private var serverUpdates: [String: CheckoutServerUpdate] = [:]

    init(
        checkout: CheckoutController,
        emitEvent: @escaping ([String: Any]) -> Void
    ) {
        self.checkout = checkout
        self.paymentElement = checkout.getPaymentElement()
        self.emitEvent = emitEvent
    }

    /// Starts native snapshot observation for this bridge identifier.
    func start(controllerId: String) {
        precondition(self.controllerId == nil && !isDestroyed)
        self.controllerId = controllerId

        observation = checkout.$session
            .map(CheckoutSessionSerializer.serialize)
            .combineLatest(checkout.$isUpdating)
            .sink { [weak self] session, isUpdating in
                guard let self, !isDestroyed else { return }
                self.session = session
                emit(status: isUpdating ? .updating : .ready)
            }
    }

    func runServerUpdate(
        operationId: String,
        request: @escaping () -> Void,
        completion: @escaping (Error?) -> Void
    ) {
        guard !isDestroyed, serverUpdates[operationId] == nil else {
            completion(CancellationError())
            return
        }
        let operation = CheckoutServerUpdate(completion: completion)
        serverUpdates[operationId] = operation
        Task { @MainActor in
            defer { serverUpdates.removeValue(forKey: operationId) }
            do {
                try await checkout.runServerUpdate {
                    try await operation.requestCallback(request)
                }
                operation.finish(error: nil)
            } catch {
                operation.finish(error: error)
            }
        }
    }

    func completeServerUpdate(operationId: String, error: String?) {
        let callbackError = error.map {
            NSError(domain: "CheckoutServerUpdate", code: 0, userInfo: [NSLocalizedDescriptionKey: $0])
        }
        serverUpdates[operationId]?.completeCallback(error: callbackError)
    }

    /// Releases views when their controller is destroyed before they unmount.
    func observeDestruction(_ observer: @escaping () -> Void) -> AnyCancellable {
        guard !isDestroyed else {
            observer()
            return AnyCancellable {}
        }
        let id = UUID()
        destructionObservers[id] = observer
        return AnyCancellable { [weak self] in self?.destructionObservers.removeValue(forKey: id) }
    }

    func destroy() {
        guard !isDestroyed else { return }
        isDestroyed = true
        let observers = Array(destructionObservers.values)
        destructionObservers.removeAll()
        observers.forEach { $0() }
        let updates = Array(serverUpdates.values)
        serverUpdates.removeAll()
        updates.forEach { $0.finish(error: CancellationError()) }
        observation?.cancel()
        observation = nil
        emit(status: .destroyed)
        // The pinned iOS SDK has no explicit destruction API. Removing this
        // instance from the registry releases its Checkout and Payment Element.
    }

    private func emit(status: Status) {
        guard let controllerId else {
            return
        }
        emitEvent([
            "controllerId": controllerId,
            "status": status.rawValue,
            "session": session,
        ])
    }
}
