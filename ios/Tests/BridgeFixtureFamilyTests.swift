import XCTest

final class BridgeFixtureFamilyTests: XCTestCase {
    func test_familyFilterLimitsFixturesAndAnEmptyValueLoadsEveryFixture() throws {
        unsetenv("BRIDGE_FIXTURE_FAMILIES")
        let all = try BridgeFixture.all()
        XCTAssertFalse(all.isEmpty)
        let families = Set(all.compactMap { $0.name.split(separator: "/").first.map(String.init) })
        XCTAssertGreaterThan(families.count, 1)
        let only = families.sorted()[0]
        setenv("BRIDGE_FIXTURE_FAMILIES", only, 1)
        defer { unsetenv("BRIDGE_FIXTURE_FAMILIES") }

        let filtered = try BridgeFixture.all()
        XCTAssertFalse(filtered.isEmpty)
        XCTAssertTrue(filtered.allSatisfy { $0.name.hasPrefix(only + "/") })
        XCTAssertTrue(all.contains { !$0.name.hasPrefix(only + "/") })
        XCTAssertFalse(filtered.contains { !$0.name.hasPrefix(only + "/") })

        setenv("BRIDGE_FIXTURE_FAMILIES", "", 1)
        let emptied = try BridgeFixture.all()
        XCTAssertEqual(emptied.map(\.name), all.map(\.name))
    }
}
