import Foundation

/// Pending Fabric direct-event queue for PaymentMethodMessagingElement.
/// Enqueues configure/height payloads while the emitter is nil, flushes once
/// attached, and invalidates (generation bump + drop) on recycle so stale
/// completions cannot refill or deliver into the next element.
@objc(PMMEDirectEventQueue)
public final class PMMEDirectEventQueue: NSObject {
    @objc public private(set) var generation: UInt = 0

    private var pendingConfigureResult: NSDictionary?
    private var pendingHeightChanged: NSDictionary?

    @objc public func enqueueConfigureResult(_ event: NSDictionary) {
        pendingConfigureResult = event
    }

    @objc public func enqueueHeightChanged(_ event: NSDictionary) {
        pendingHeightChanged = event
    }

    @objc public func invalidate() {
        generation &+= 1
        pendingConfigureResult = nil
        pendingHeightChanged = nil
    }

    @objc(flushWithConfigureDeliver:heightDeliver:)
    public func flush(
        configureDeliver: ((NSDictionary) -> Void)?,
        heightDeliver: ((NSDictionary) -> Void)?
    ) {
        let configure = pendingConfigureResult
        let height = pendingHeightChanged
        pendingConfigureResult = nil
        pendingHeightChanged = nil

        if let configure {
            configureDeliver?(configure)
        }
        if let height {
            heightDeliver?(height)
        }
    }
}
