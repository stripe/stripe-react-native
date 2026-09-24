import Foundation

/// Owns requests for one provider on one CustomerSheet instance.
@MainActor
final class ClientSecretProviderRequestRegistry<Value> {
    private var pending: [String: CheckedContinuation<Value, Error>] = [:]
    private var isInvalidated = false

    var count: Int { pending.count }

    func request(emit: (String) throws -> Void) async throws -> Value {
        let requestId = UUID().uuidString
        return try await withTaskCancellationHandler {
            try Task.checkCancellation()
            guard !isInvalidated else { throw CancellationError() }
            let value: Value = try await withCheckedThrowingContinuation { continuation in
                pending[requestId] = continuation
                do {
                    try emit(requestId)
                } catch {
                    resolve(requestId: requestId, result: .failure(error))
                }
            }
            try Task.checkCancellation()
            return value
        } onCancel: {
            Task { @MainActor in
                self.cancel(requestId: requestId)
            }
        }
    }

    @discardableResult
    func resolve(requestId: String, result: Result<Value, Error>) -> Bool {
        guard let continuation = pending.removeValue(forKey: requestId) else { return false }
        continuation.resume(with: result)
        return true
    }

    func cancel(requestId: String) {
        resolve(requestId: requestId, result: .failure(CancellationError()))
    }

    func cancelAll() {
        let continuations = Array(pending.values)
        pending.removeAll()
        continuations.forEach { $0.resume(throwing: CancellationError()) }
    }

    /// Old sheet closures must not create new requests after replacement or teardown.
    func invalidate() {
        isInvalidated = true
        cancelAll()
    }
}
