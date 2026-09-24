import Foundation

/// Waits for one JS server-update callback.
@MainActor
final class CheckoutServerUpdate {
    private var callback: CheckedContinuation<Void, Error>?
    private var isCanceled = false

    func requestCallback(_ request: () -> Void) async throws {
        try await withTaskCancellationHandler {
            try Task.checkCancellation()
            guard !isCanceled else { throw CancellationError() }
            try await withCheckedThrowingContinuation { continuation in
                callback = continuation
                request()
            }
        } onCancel: {
            Task { @MainActor in
                self.completeCallback(error: CancellationError())
            }
        }
    }

    func completeCallback(error: Error?) {
        let callback = callback
        self.callback = nil
        if let error {
            callback?.resume(throwing: error)
        } else {
            callback?.resume()
        }
    }

    func cancel() {
        isCanceled = true
        completeCallback(error: CancellationError())
    }
}
