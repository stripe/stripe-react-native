import Foundation
@_spi(PrivateBetaCustomerSheet) import StripePaymentSheet

/// Owns the pending CustomerSession requests for one CustomerSheet instance.
@MainActor
final class CustomerSessionRequestRegistry {
    private var pending: [String: CheckedContinuation<CustomerSessionClientSecret, Error>] = [:]
    private var isInvalidated = false

    func request(emit: (String) throws -> Void) async throws -> CustomerSessionClientSecret {
        let requestId = UUID().uuidString
        return try await withTaskCancellationHandler {
            try Task.checkCancellation()
            guard !isInvalidated else { throw CancellationError() }
            return try await withCheckedThrowingContinuation { continuation in
                pending[requestId] = continuation
                do {
                    try emit(requestId)
                } catch {
                    complete(requestId: requestId, result: .failure(error))
                }
            }
        } onCancel: {
            Task { @MainActor in
                self.complete(requestId: requestId, result: .failure(CancellationError()))
            }
        }
    }

    @discardableResult
    func complete(requestId: String, result: Result<CustomerSessionClientSecret, Error>) -> Bool {
        guard let continuation = pending.removeValue(forKey: requestId) else { return false }
        continuation.resume(with: result)
        return true
    }

    func invalidate() {
        // Retired sheet closures must not start new requests after replacement.
        isInvalidated = true
        let continuations = Array(pending.values)
        pending.removeAll()
        continuations.forEach { $0.resume(throwing: CancellationError()) }
    }
}
