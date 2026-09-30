import Combine
import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

/// Owns a native Checkout controller and its session observation for the bridge.
@MainActor
final class NativeCheckoutControllerInstance {
    private enum Status: String {
        case ready
        case updating
    }

    let checkout: CheckoutController
    private(set) lazy var session = CheckoutSessionSerializer.serialize(checkout.session)

    private let emitEvent: ([String: Any]) -> Void
    private var observation: AnyCancellable?
    private var controllerId: String?
    private var isDestroyed = false
    private var serverUpdateContinuations: [String: CheckedContinuation<Void, Error>] = [:]

    init(
        checkout: CheckoutController,
        emitEvent: @escaping ([String: Any]) -> Void
    ) {
        self.checkout = checkout
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
        request: @escaping () -> Void
    ) async throws {
        do {
            try await checkout.runServerUpdate {
                try await withTaskCancellationHandler {
                    try Task.checkCancellation()
                    guard !self.isDestroyed, self.serverUpdateContinuations[operationId] == nil else {
                        throw CancellationError()
                    }
                    try await withCheckedThrowingContinuation { continuation in
                        self.serverUpdateContinuations[operationId] = continuation
                        request()
                    }
                } onCancel: {
                    Task { @MainActor [weak self] in
                        self?.completeServerUpdate(operationId: operationId, error: CancellationError())
                    }
                }
            }
        } catch {
            if isDestroyed { throw CancellationError() }
            throw error
        }
    }

    func completeServerUpdate(operationId: String, error: String?) {
        let callbackError = error.map {
            NSError(domain: "CheckoutServerUpdate", code: 0, userInfo: [NSLocalizedDescriptionKey: $0])
        }
        completeServerUpdate(operationId: operationId, error: callbackError)
    }

    func destroy() {
        guard !isDestroyed else { return }
        isDestroyed = true
        let updates = serverUpdateContinuations
        serverUpdateContinuations.removeAll()
        updates.values.forEach { $0.resume(throwing: CancellationError()) }
        observation?.cancel()
        observation = nil
        // The pinned iOS SDK has no explicit destruction API. Removing this
        // instance from the registry releases its Checkout and Payment Element.
    }

    private func completeServerUpdate(operationId: String, error: Error?) {
        guard let continuation = serverUpdateContinuations.removeValue(forKey: operationId) else { return }
        if let error {
            continuation.resume(throwing: error)
        } else {
            continuation.resume()
        }
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
