@testable import stripe_react_native
import XCTest

final class ConnectInlineSheetRulesTests: XCTestCase {
    private let origin = URL(string: "https://connect-js.stripe.com")!

    private func sheetId(_ url: String) -> String? {
        ConnectInlineSheetRules.sheetId(forWindowURL: URL(string: url), connectJsOrigin: origin)
    }

    func test_sheetId_acceptsAccessoryLayerSheetURL() {
        XCTAssertEqual(
            sheetId("https://connect-js.stripe.com/accessory_layer_3f9a.html#layer_type=overlay&os_sheet=true&os_sheet_id=sheet-1"),
            "sheet-1"
        )
    }

    func test_sheetId_rejectsLookalikeHost() {
        XCTAssertNil(sheetId("https://connect-js.stripe.com.evil.example/accessory_layer_3f9a.html#os_sheet=true&os_sheet_id=sheet-1"))
    }

    func test_sheetId_rejectsRepeatedParameters() {
        XCTAssertNil(sheetId("https://connect-js.stripe.com/accessory_layer_3f9a.html#os_sheet=true&os_sheet_id=sheet-1&os_sheet_id=sheet-2"))
    }
}
