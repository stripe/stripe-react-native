import Foundation
import PassKit
import UIKit

/// One fixture from packages/bridge-contracts/fixtures, as iOS sees it.
struct BridgeFixture {
    let name: String
    let method: String
    let platforms: [String]
    let input: NSDictionary
    /// shared and ios assertions, keyed by dot path.
    let expected: [(key: String, value: Any)]

    func dictionary(_ param: String) -> NSDictionary? { input[param] as? NSDictionary }
    func string(_ param: String) -> String? { input[param] as? String }
    func array(_ param: String) -> NSArray? { input[param] as? NSArray }
    func bool(_ param: String) -> Bool { input[param] as? Bool ?? false }

    static let directory: URL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("packages/bridge-contracts/fixtures")

    /// Comma-separated family directory names. Set by `test-bridge.mjs --families=`
    /// through xcodebuild's `TEST_RUNNER_` prefix. Absent means every fixture.
    static func allowedFamilies() -> Set<String>? {
        // getenv sees setenv from a test. ProcessInfo.environment does not.
        guard let rawPointer = getenv("BRIDGE_FIXTURE_FAMILIES") else { return nil }
        let raw = String(cString: rawPointer)
        let names = raw.split(separator: ",").map {
            $0.trimmingCharacters(in: .whitespacesAndNewlines)
        }.filter { !$0.isEmpty }
        return names.isEmpty ? nil : Set(names)
    }

    static func all() throws -> [BridgeFixture] {
        // Resolve symlinks on both sides so names stay relative (/tmp is /private/tmp).
        let root = directory.resolvingSymlinksInPath()
        let allowed = allowedFamilies()
        let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)?
            .compactMap { ($0 as? URL)?.resolvingSymlinksInPath() }
            .filter { $0.pathExtension == "json" }
            .filter { file in
                guard let allowed else { return true }
                let relative = String(file.path.dropFirst(root.path.count + 1))
                let family = relative.split(separator: "/").first.map(String.init) ?? ""
                return allowed.contains(family)
            }
            .sorted { $0.path < $1.path } ?? []
        return try files.map { file in
            let json = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as! NSDictionary
            let expect = json["expect"] as? NSDictionary ?? [:]
            var expected: [(key: String, value: Any)] = []
            for block in ["shared", "ios"] {
                guard let values = expect[block] as? NSDictionary else { continue }
                for key in values.allKeys.compactMap({ $0 as? String }).sorted() {
                    expected.append((key, values[key]!))
                }
            }
            return BridgeFixture(
                name: String(file.path.dropFirst(root.path.count + 1)),
                method: json["method"] as! String,
                platforms: json["platforms"] as? [String] ?? ["ios", "android"],
                input: json["input"] as? NSDictionary ?? [:],
                expected: expected
            )
        }
    }
}

/// What a runner observed after calling the production mapper. Assertion keys
/// are dot paths into `roots`; `aliases` rewrite a logical key prefix to the
/// native path when the two platforms name a property differently.
struct BridgeObservation {
    var roots: [String: Any?]
    var aliases: [String: String] = [:]
}

enum BridgeAssert {
    private static let enumDescriptionPattern = try! NSRegularExpression(
        pattern: #"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$"#
    )

    static let present = "$present"

    private enum Resolved {
        case missing
        case value(Any?)
    }

    static func failures(_ fixture: BridgeFixture, _ observation: BridgeObservation) -> [String] {
        var failures: [String] = []
        for (key, expected) in fixture.expected {
            let segments = applyAlias(key, observation.aliases).split(separator: ".").map(String.init)
            var actual: Resolved = observation.roots.keys.contains(segments[0])
                ? .value(observation.roots[segments[0]].flatMap { $0 })
                : .missing
            for segment in segments.dropFirst() { actual = child(actual, segment) }
            match(expected, actual, key, &failures)
        }
        return failures
    }

    private static func applyAlias(_ key: String, _ aliases: [String: String]) -> String {
        guard let match = aliases.keys
            .filter({ key == $0 || key.hasPrefix($0 + ".") })
            .max(by: { $0.count < $1.count }) else { return key }
        return aliases[match]! + key.dropFirst(match.count)
    }

    private static func match(_ expected: Any, _ actual: Resolved, _ path: String, _ failures: inout [String]) {
        if let marker = expected as? String, marker == present {
            if case .value(let value) = actual, normalize(value) != nil { return }
            failures.append("\(path): expected a value, found \(describe(actual))")
            return
        }
        if expected is NSNull {
            if case .value(let value) = actual, normalize(value) != nil {
                failures.append("\(path): expected null, found \(describe(actual))")
            }
            return
        }
        guard case .value(let raw) = actual else {
            failures.append("\(path): not found (expected \(expected))")
            return
        }
        if let object = expected as? NSDictionary {
            if object.count == 0, (normalize(raw) as? [String: Any])?.isEmpty != true {
                failures.append("\(path): expected an empty object, found \(describe(actual))")
            }
            for case let key as String in object.allKeys {
                match(object[key]!, child(actual, key), "\(path).\(key)", &failures)
            }
            return
        }
        if let array = expected as? NSArray {
            guard let list = asArray(unwrap(raw)) else {
                failures.append("\(path): expected a list, found \(describe(actual))")
                return
            }
            guard list.count == array.count else {
                failures.append("\(path): expected \(array.count) items, found \(list.count): \(describe(actual))")
                return
            }
            for (index, item) in list.enumerated() {
                match(array[index], .value(item), "\(path).\(index)", &failures)
            }
            return
        }
        let normalized = normalize(raw)
        let equal: Bool
        if let expectedNumber = expected as? NSNumber, !isBool(expectedNumber), let actualNumber = normalized as? Double {
            equal = expectedNumber.doubleValue == actualNumber
        } else if let expectedNumber = expected as? NSNumber, isBool(expectedNumber) {
            equal = (normalized as? Bool) == expectedNumber.boolValue
        } else if let expectedString = expected as? String {
            equal = (normalized as? String) == expectedString
        } else {
            equal = false
        }
        if !equal { failures.append("\(path): expected \(expected), found \(describe(actual))") }
    }

    private static func describe(_ resolved: Resolved) -> String {
        guard case .value(let value) = resolved else { return "<missing>" }
        guard let normalized = normalize(value) else { return "nil" }
        if let string = normalized as? String { return "\"\(string)\"" }
        return "\(normalized)"
    }

    private static func isBool(_ number: NSNumber) -> Bool {
        CFGetTypeID(number) == CFBooleanGetTypeID()
    }

    /// Unwraps any level of Optional.
    static func unwrap(_ value: Any?) -> Any? {
        guard let value else { return nil }
        let mirror = Mirror(reflecting: value)
        if mirror.displayStyle == .optional {
            return mirror.children.first.flatMap { unwrap($0.value) }
        }
        return value
    }

    /// Converts a native leaf to the JSON-like value fixtures assert on.
    static func normalize(_ value: Any?) -> Any? {
        guard let value = unwrap(value) else { return nil }
        switch value {
        case is NSNull: return nil
        case let number as NSNumber where type(of: value) is NSNumber.Type:
            return isBool(number) ? number.boolValue : number.doubleValue
        case let bool as Bool: return bool
        case let string as String: return string
        case let number as NSNumber: return number.doubleValue
        case let number as CGFloat: return Double(number)
        case let color as UIColor: return hex(color)
        case let url as URL: return url.absoluteString
        case let dictionary as NSDictionary:
            var result: [String: Any] = [:]
            for (key, item) in dictionary { result["\(key)"] = normalize(item) ?? NSNull() }
            return result
        default:
            if let list = asArray(value) { return list.map { normalize($0) ?? NSNull() } }
            let mirror = Mirror(reflecting: value)
            // Some enums print with their module and type, so keep only the case name.
            if mirror.displayStyle == .enum, mirror.children.isEmpty {
                return "\(value)".split(separator: ".").last.map(String.init) ?? "\(value)"
            }
            if mirror.displayStyle == .enum, let label = mirror.children.first?.label { return label }
            let description = "\(value)"
            let range = NSRange(description.startIndex..., in: description)
            if enumDescriptionPattern.firstMatch(in: description, range: range) != nil {
                return description.split(separator: ".").last.map(String.init)
            }
            return description
        }
    }

    private static func hex(_ color: UIColor) -> String {
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        color.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        let component = { (value: CGFloat) in String(format: "%02x", Int((value * 255).rounded())) }
        return "#" + component(red) + component(green) + component(blue) + (alpha < 1 ? component(alpha) : "")
    }

    private static func asArray(_ value: Any?) -> [Any]? {
        guard let value else { return nil }
        if let array = value as? NSArray { return array.map { $0 } }
        let mirror = Mirror(reflecting: value)
        if mirror.displayStyle == .collection || mirror.displayStyle == .set {
            return mirror.children.map { $0.value }
        }
        return nil
    }

    private static func child(_ resolved: Resolved, _ segment: String) -> Resolved {
        guard case .value(let wrapped) = resolved, let value = unwrap(wrapped) else { return .missing }
        if let dictionary = value as? NSDictionary {
            if let item = dictionary[segment] { return .value(item) }
            if let entry = dictionary.first(where: { "\(normalize($0.key) ?? "")" == segment }) {
                return .value(entry.value)
            }
            return .missing
        }
        if let list = asArray(value) {
            guard let index = Int(segment), list.indices.contains(index) else { return .missing }
            return .value(list[index])
        }
        var mirror: Mirror? = Mirror(reflecting: value)
        if mirror?.displayStyle == .enum, let payload = mirror?.children.first {
            if payload.label == segment { return .value(payload.value) }
            let payloadMirror = Mirror(reflecting: payload.value)
            // A single associated value has no label to match, such as
            // `.disallowed(brands:)`, so any segment names it.
            if payloadMirror.displayStyle != .tuple { return .value(payload.value) }
            mirror = payloadMirror
        }
        while let current = mirror {
            for candidate in [segment, "_" + segment, "$__lazy_storage_$_" + segment] {
                if let match = current.children.first(where: { $0.label == candidate }) {
                    return .value(match.value)
                }
            }
            mirror = current.superclassMirror
        }
        // PassKit encodes Immediate, Deferred, and Recurring as the item class.
        // `type` is only final versus pending, so it cannot tell them apart.
        if segment == "paymentType", let item = value as? PKPaymentSummaryItem {
            return .value(cartSummaryPaymentType(item))
        }
        if let object = value as? NSObject, object.responds(to: NSSelectorFromString(segment)) {
            return .value(object.value(forKey: segment))
        }
        return .missing
    }

    private static func cartSummaryPaymentType(_ item: PKPaymentSummaryItem) -> String {
        if item is PKRecurringPaymentSummaryItem { return "Recurring" }
        if item is PKDeferredPaymentSummaryItem { return "Deferred" }
        return "Immediate"
    }
}
