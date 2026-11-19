import XCTest

/// Runs every iOS fixture in packages/bridge-contracts/fixtures through the
/// production mapper for its method and checks the shared and ios assertions.
/// See CONTRIBUTING.md, "Bridge contract fixtures".
@MainActor
final class BridgeContractTests: XCTestCase {
    func test_fixturesMatchTheIOSMappers() throws {
        let fixtures = try BridgeFixture.all()
        XCTAssertFalse(fixtures.isEmpty, "No bridge contract fixtures found in \(BridgeFixture.directory.path)")
        var checked = 0
        for fixture in fixtures where fixture.platforms.contains("ios") {
            guard let runner = BridgeRunners.forMethod[fixture.method] else {
                XCTFail("No iOS runner for \(fixture.method) (\(fixture.name))")
                continue
            }
            do {
                let failures = BridgeAssert.failures(fixture, try runner(fixture))
                if !failures.isEmpty {
                    XCTFail("\(fixture.name):\n  " + failures.joined(separator: "\n  "))
                }
            } catch {
                XCTFail("\(fixture.name): runner threw \(error)")
            }
            checked += 1
        }
        print("Bridge contract fixtures checked on iOS: \(checked)")
    }

    func test_lateResolutionCallbacksAreIgnoredAfterTheResolutionIsReleased() {
        var resolution: BridgeRunners.Resolution? = BridgeRunners.Resolution()
        let resolve = resolution!.resolve
        let reject = resolution!.reject
        resolution = nil

        resolve("late")
        reject("code", "message", nil)

        XCTAssertNil(resolution)
    }
}
