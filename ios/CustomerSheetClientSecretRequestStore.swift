import Foundation

/// Keeps each native request paired with its JavaScript response, even when requests overlap.
final class CustomerSheetClientSecretRequestStore<Value> {
    private let lock = NSLock()
    private var pending: [String: CheckedContinuation<Value, Error>] = [:]

    func request(emit: (String) -> Void) async throws -> Value {
        let requestId = UUID().uuidString
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                lock.lock()
                pending[requestId] = continuation
                lock.unlock()

                // Cancellation can run before the continuation is registered.
                if Task.isCancelled {
                    cancel(requestId: requestId)
                } else {
                    emit(requestId)
                }
            }
        } onCancel: {
            cancel(requestId: requestId)
        }
    }

    @discardableResult
    func succeed(requestId: String, value: Value) -> Bool {
        guard let continuation = take(requestId: requestId) else { return false }
        continuation.resume(returning: value)
        return true
    }

    @discardableResult
    func fail(requestId: String, error: Error) -> Bool {
        guard let continuation = take(requestId: requestId) else { return false }
        continuation.resume(throwing: error)
        return true
    }

    func cancelAll() {
        lock.lock()
        let continuations = Array(pending.values)
        pending.removeAll()
        lock.unlock()
        continuations.forEach { $0.resume(throwing: CancellationError()) }
    }

    private func cancel(requestId: String) {
        fail(requestId: requestId, error: CancellationError())
    }

    private func take(requestId: String) -> CheckedContinuation<Value, Error>? {
        lock.lock()
        defer { lock.unlock() }
        return pending.removeValue(forKey: requestId)
    }
}
