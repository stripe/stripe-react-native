@testable import stripe_react_native
import UIKit
import XCTest

final class AuBECSDebitFormViewTests: XCTestCase {

    func test_didSetProps_formStyleOnlyUpdate_preservesFormInstance() {
        let view = AuBECSDebitFormView(frame: CGRect(x: 0, y: 0, width: 320, height: 200))
        view.companyName = "Acme" as NSString
        view.didSetProps()

        guard let firstInstance = view.auBecsFormView else {
            XCTFail("Expected STPAUBECSDebitFormView after first didSetProps")
            return
        }

        view.formStyle = ["fontSize": 18, "textColor": "#111111"]
        view.didSetProps()

        XCTAssertTrue(view.auBecsFormView === firstInstance)
    }

    func test_didSetProps_companyNameChange_rebuildsForm() {
        let view = AuBECSDebitFormView(frame: CGRect(x: 0, y: 0, width: 320, height: 200))
        view.companyName = "Acme" as NSString
        view.didSetProps()

        guard let firstInstance = view.auBecsFormView else {
            XCTFail("Expected STPAUBECSDebitFormView after first didSetProps")
            return
        }

        view.companyName = "OtherCo" as NSString
        view.didSetProps()

        XCTAssertFalse(view.auBecsFormView === firstInstance)
    }
}
