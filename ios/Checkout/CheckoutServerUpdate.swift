import Foundation

/// Holds one JS callback and completes its bridge promise exactly once.
@MainActor
final class CheckoutServerUpdate {
    private var callback: CheckedContinuation<Void, Error>?
    private var completion: ((Error?) -> Void)?

    init(completion: @escaping (Error?) -> Void) {
        self.completion = completion
    }

    func requestCallback(_ request: () -> Void) async throws {
        try await withTaskCancellationHandler {
            try Task.checkCancellation()
            guard completion != nil else { throw CancellationError() }
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

    func finish(error: Error?) {
        guard let completion else { return }
        self.completion = nil
        completeCallback(error: error ?? CancellationError())
        completion(error)
    }
}
