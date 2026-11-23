//
//  ConnectInlineSheetRules.swift
//  stripe-react-native
//

import Foundation

/// Decides which windows an inline Connect component may show as sheets, and validates what Connect.js reports
/// about them.
enum ConnectInlineSheetRules {
    static let maxHeight = 10000

    /// Sheets come only from the component's own web view and the Connect.js origin.
    static func sheetId(
        forNewWindowURL url: URL?,
        isFromComponentWebView: Bool,
        isFromConnectJs: Bool,
        connectJsOrigin: URL
    ) -> String? {
        guard isFromComponentWebView, isFromConnectJs else { return nil }
        return sheetId(forWindowURL: url, connectJsOrigin: connectJsOrigin)
    }

    enum NavigationDecision: Equatable {
        case allow
        case block
        case blockAndOpenOutside
    }

    /// A sheet loads only the page it was opened with. After that it allows only changes within that page, and opens
    /// the links the user taps outside the app.
    static func decideSheetNavigation(
        url: URL?,
        windowURL: URL,
        isFirstNavigation: Bool,
        isLinkActivated: Bool
    ) -> NavigationDecision {
        guard let url else { return .block }
        if isFirstNavigation {
            return url == windowURL ? .allow : .block
        }
        if isSameDocument(url, as: windowURL) {
            return .allow
        }
        return isLinkActivated ? .blockAndOpenOutside : .block
    }

    private static func isSameDocument(_ url: URL, as other: URL) -> Bool {
        var lhs = URLComponents(url: url, resolvingAgainstBaseURL: false)
        var rhs = URLComponents(url: other, resolvingAgainstBaseURL: false)
        lhs?.fragment = nil
        rhs?.fragment = nil
        return lhs != nil && lhs == rhs
    }

    /// Only the component's own page may use the bridge: not its frames, and not sheets, which share its configuration.
    static func acceptsBridgeMessage(
        isFromComponentWebView: Bool,
        isMainFrame: Bool,
        scheme: String?,
        host: String?,
        port: Int?,
        connectJsOrigin: URL
    ) -> Bool {
        isFromComponentWebView && isMainFrame
            && isSameOrigin(scheme: scheme, host: host, port: port, as: connectJsOrigin)
    }

    /// Returns the sheet id for a window URL Connect.js opens for a sheet, e.g.
    /// `https://connect-js.stripe.com/accessory_layer_<hash>.html#layer_type=overlay&os_sheet=true&os_sheet_id=<id>`,
    /// or nil if the window isn't one.
    static func sheetId(forWindowURL url: URL?, connectJsOrigin: URL) -> String? {
        guard let url,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              isSameOrigin(scheme: components.scheme, host: components.host, port: components.port, as: connectJsOrigin),
              components.percentEncodedUser == nil,
              components.percentEncodedPassword == nil,
              components.percentEncodedQuery == nil,
              matchesAccessoryLayerPath(components.percentEncodedPath),
              let fragment = components.percentEncodedFragment,
              let params = uniqueParams(fragment),
              params["os_sheet"] == "true",
              let sheetId = params["os_sheet_id"],
              isValidSheetId(sheetId) else {
            return nil
        }
        return sheetId
    }

    static func isValidSheetId(_ sheetId: String) -> Bool {
        sheetId.range(of: "^[A-Za-z0-9-]{1,64}$", options: .regularExpression) != nil
    }

    static func clampHeight(_ height: Double) -> Int? {
        guard height.isFinite else { return nil }
        return min(maxHeight, max(0, Int(height.rounded(.up))))
    }

    /// `port` is nil, or 0 as in `WKSecurityOrigin`, for the scheme's default port.
    static func isSameOrigin(scheme: String?, host: String?, port: Int?, as origin: URL) -> Bool {
        guard let scheme, let host, let originScheme = origin.scheme, let originHost = origin.host else {
            return false
        }
        let normalizedPort = port == 0 ? nil : port
        return scheme.lowercased() == originScheme.lowercased()
            && host.lowercased() == originHost.lowercased()
            && normalizedPort == origin.port
    }

    private static func matchesAccessoryLayerPath(_ path: String) -> Bool {
        path.range(of: "^/accessory_layer_[A-Za-z0-9]+\\.html$", options: .regularExpression) != nil
    }

    /// Parses `a=1&b=2`, or returns nil if a name repeats, since parsers disagree on which value wins.
    private static func uniqueParams(_ encoded: String) -> [String: String]? {
        var params: [String: String] = [:]
        for pair in encoded.split(separator: "&", omittingEmptySubsequences: false) {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            guard let name = parts[0].removingPercentEncoding,
                  let value = (parts.count > 1 ? parts[1] : "").removingPercentEncoding,
                  params[name] == nil else {
                return nil
            }
            params[name] = value
        }
        return params
    }
}

/// Tracks each sheet from the window Connect.js opens to the window closing, and says what the sheet should do.
///
/// A sheet appears after its first `sheetChanged`. A dismissible sheet goes away when the user dismisses it, and
/// Connect.js gets `sheetClosed`. For a sheet that isn't dismissible, Connect.js gets `sheetCloseRequested` and
/// decides, closing the window if the dialog closes.
struct ConnectInlineSheetLifecycle {
    enum Phase: Equatable {
        case awaitingFirstChange
        case shown
        case gone
    }

    enum Action: Equatable {
        case present(sheetId: String, height: Int, dismissible: Bool)
        case update(sheetId: String, height: Int, dismissible: Bool)
        case dismiss(sheetId: String)
        case sendSheetClosed(sheetId: String)
        case sendSheetCloseRequested(sheetId: String)
        case release(sheetId: String)
    }

    private(set) var phases: [String: Phase] = [:]

    /// Returns false for an id that's already open, so a second window can't take over its sheet.
    mutating func windowOpened(sheetId: String) -> Bool {
        guard phases[sheetId] == nil else { return false }
        phases[sheetId] = .awaitingFirstChange
        return true
    }

    mutating func sheetChanged(sheetId: String, height: Int, dismissible: Bool) -> [Action] {
        switch phases[sheetId] {
        case .awaitingFirstChange:
            phases[sheetId] = .shown
            return [.present(sheetId: sheetId, height: height, dismissible: dismissible)]
        case .shown:
            return [.update(sheetId: sheetId, height: height, dismissible: dismissible)]
        case .gone, nil:
            return []
        }
    }

    /// The user dismissed a dismissible sheet, or the sheet went away with the screen behind it.
    mutating func sheetDismissed(sheetId: String) -> [Action] {
        guard phases[sheetId] == .shown else { return [] }
        phases[sheetId] = .gone
        return [.sendSheetClosed(sheetId: sheetId)]
    }

    /// The user tried to dismiss a sheet that isn't dismissible.
    func closeRequested(sheetId: String) -> [Action] {
        phases[sheetId] == .shown ? [.sendSheetCloseRequested(sheetId: sheetId)] : []
    }

    /// Connect.js called `window.close()`.
    mutating func windowClosed(sheetId: String) -> [Action] {
        switch phases.removeValue(forKey: sheetId) {
        case .shown:
            return [.dismiss(sheetId: sheetId), .sendSheetClosed(sheetId: sheetId), .release(sheetId: sheetId)]
        case .awaitingFirstChange, .gone:
            return [.release(sheetId: sheetId)]
        case nil:
            return []
        }
    }

    /// The component loaded a new page or went away, so no sheet belongs to it anymore.
    mutating func reset() -> [Action] {
        let actions = phases.keys.sorted().flatMap { sheetId -> [Action] in
            phases[sheetId] == .shown
                ? [.dismiss(sheetId: sheetId), .release(sheetId: sheetId)]
                : [.release(sheetId: sheetId)]
        }
        phases = [:]
        return actions
    }
}
