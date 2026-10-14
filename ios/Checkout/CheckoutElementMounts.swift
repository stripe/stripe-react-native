import UIKit

@MainActor
protocol CheckoutElementMountHost: AnyObject {
    func relinquishElementForAnotherHost()
    func mountElementIfAvailable()
}

/// Transfers an SDK-owned view to the most recently mounted React Native host.
@MainActor
enum CheckoutElementMounts {
    private struct WeakHost {
        weak var view: UIView?
    }

    private static var hostsByElement: [ObjectIdentifier: [WeakHost]] = [:]

    static func claim(_ elementView: UIView, for host: UIView & CheckoutElementMountHost) -> Bool {
        if let current = elementView.superview, current !== host {
            guard let current = current as? CheckoutElementMountHost else { return false }
            current.relinquishElementForAnotherHost()
        }

        let key = ObjectIdentifier(elementView)
        var hosts = hostsByElement[key] ?? []
        hosts.removeAll { $0.view == nil || $0.view === host }
        hosts.append(WeakHost(view: host))
        hostsByElement[key] = hosts
        return true
    }

    static func release(_ elementView: UIView, from host: UIView & CheckoutElementMountHost) {
        let key = ObjectIdentifier(elementView)
        var hosts = hostsByElement[key] ?? []
        hosts.removeAll { $0.view == nil || $0.view === host }
        hostsByElement[key] = hosts.isEmpty ? nil : hosts

        guard elementView.superview == nil else { return }
        let previousHost = hosts.reversed()
            .compactMap(\.view)
            .first { $0.window != nil }
        (previousHost as? CheckoutElementMountHost)?.mountElementIfAvailable()
    }
}
