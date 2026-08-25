import Combine
import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

@MainActor
final class NativeCheckoutControllerInstance: CheckoutControllerInstance {
    enum Status: String {
        case ready
        case updating
        case confirming
        case destroyed
    }

    let checkout: Checkout
    let paymentElement: PaymentElement

    private weak var registry: CheckoutControllerRegistry?
    private let emitEvent: ([String: Any]) -> Void
    private var cancellables = Set<AnyCancellable>()
    private var controllerId: String?
    private var isConfirming = false
    private var isMutating = false
    private var isDestroyed = false

    init(
        checkout: Checkout,
        registry: CheckoutControllerRegistry,
        emitEvent: @escaping ([String: Any]) -> Void
    ) {
        self.checkout = checkout
        self.paymentElement = checkout.getPaymentElement()
        self.registry = registry
        self.emitEvent = emitEvent
    }

    func start(controllerId: String) {
        precondition(self.controllerId == nil)
        self.controllerId = controllerId

        checkout.$session
            .combineLatest(checkout.$isLoading)
            .sink { [weak self] session, isLoading in
                self?.emit(session: session, status: self?.status(isLoading: isLoading) ?? .destroyed)
            }
            .store(in: &cancellables)
    }

    func setConfirming(_ confirming: Bool) {
        guard !isDestroyed, isConfirming != confirming else {
            return
        }
        isConfirming = confirming
        emit(session: checkout.session, status: status(isLoading: checkout.isLoading))
    }

    func beginMutation() -> Bool {
        guard !isDestroyed, !isConfirming, !isMutating, !checkout.isLoading else {
            return false
        }
        isMutating = true
        emit(session: checkout.session, status: .updating)
        return true
    }

    func finishMutation() {
        guard !isDestroyed, isMutating else {
            return
        }
        isMutating = false
        emit(session: checkout.session, status: status(isLoading: checkout.isLoading))
    }

    func emitDestroyed() {
        guard !isDestroyed else {
            return
        }
        emit(session: checkout.session, status: .destroyed)
        isDestroyed = true
    }

    func destroy() {
        guard !isDestroyed || !cancellables.isEmpty else {
            return
        }
        isDestroyed = true
        cancellables.removeAll()
        // TODO(porter): Destroy native Checkout when the reviewed lifecycle API ships.
    }

    private func status(isLoading: Bool) -> Status {
        if isConfirming {
            return .confirming
        }
        return isMutating || isLoading ? .updating : .ready
    }

    private func emit(session: Checkout.Session, status: Status) {
        guard !isDestroyed,
              let controllerId,
              let sequence = registry?.nextEventSequence(for: controllerId) else {
            return
        }
        emitEvent([
            "controllerId": controllerId,
            "sequence": sequence,
            "status": status.rawValue,
            "session": CheckoutSessionSerializer.serialize(session),
        ])
    }
}
