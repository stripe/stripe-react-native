import XCTest

final class BridgeRunnersResolutionTests: XCTestCase {
    func test_lateResolutionCallbacksAreIgnoredAfterTheResolutionIsReleased() {
        var strong: BridgeRunners.Resolution? = BridgeRunners.Resolution()
        weak let resolution = strong
        let resolve = strong!.resolve
        let reject = strong!.reject
        strong = nil

        resolve("late")
        reject("code", "message", nil)

        XCTAssertNil(resolution)
    }
}
