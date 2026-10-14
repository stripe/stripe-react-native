import Combine
import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import UIKit

/// Owns a native Checkout controller and its session observation for the bridge.
@MainActor
final class NativeCheckoutControllerInstance {
    private enum Status: String {
        case ready
        case updating
        case confirming
    }

    let checkout: CheckoutController
    let currencySelectorElement: CurrencySelectorElement?
    private(set) lazy var session = CheckoutSessionSerializer.serialize(checkout.session)

    private let emitEvent: ([String: Any]) -> Void
    private var observation: AnyCancellable?
    private var controllerId: String?
    private var destructionObservers: [UUID: () -> Void] = [:]
    private var isDestroyed = false
    private var confirmation: (
        task: Task<Void, Never>,
        completion: (Result<CheckoutController.ConfirmResult, Error>) -> Void
    )?
    private var serverUpdateContinuations: [String: CheckedContinuation<Void, Error>] = [:]

    init(
        checkout: CheckoutController,
        currencySelectorElement: CurrencySelectorElement? = nil,
        emitEvent: @escaping ([String: Any]) -> Void
    ) {
        self.checkout = checkout
        self.currencySelectorElement = currencySelectorElement
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
                emit(status: confirmation != nil ? .confirming : (isUpdating ? .updating : .ready))
            }
    }

    /// Adapts native confirmation to the lifetime of this bridge controller.
    func confirm(
        from presenter: UIViewController,
        completion: @escaping (Result<CheckoutController.ConfirmResult, Error>) -> Void
    ) throws {
        guard !isDestroyed else { throw CheckoutBridgeError.destroyed }
        guard confirmation == nil else { throw CheckoutBridgeError.confirmationInProgress }
        let task = Task { @MainActor [weak self, checkout] in
            guard !Task.isCancelled else { return }
            let result = await checkout.confirm(from: presenter)
            guard let self, let confirmation else { return }
            self.confirmation = nil
            session = CheckoutSessionSerializer.serialize(checkout.session)
            emit(status: checkout.isUpdating ? .updating : .ready)
            confirmation.completion(.success(result))
        }
        confirmation = (task, completion)
        emit(status: .confirming)
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
        if let confirmation {
            self.confirmation = nil
            confirmation.task.cancel()
            confirmation.completion(.failure(CancellationError()))
        }
        let observers = Array(destructionObservers.values)
        destructionObservers.removeAll()
        observers.forEach { $0() }
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
