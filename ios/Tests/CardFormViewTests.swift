@testable import stripe_react_native
import UIKit
import XCTest

final class CardFormViewTests: XCTestCase {

    func test_didSetProps_styleOnlyUpdate_preservesCardFormInstance() {
        let view = CardFormView(frame: CGRect(x: 0, y: 0, width: 320, height: 200))
        view.cardStyle = ["type": "standard"]
        view.didSetProps()

        guard let firstInstance = view.cardForm else {
            XCTFail("Expected STPCardFormView after first didSetProps")
            return
        }
        firstTextField(in: firstInstance, classNameContaining: "CardNumberInput")?.text =
            "4242424242424242"

        view.cardStyle = [
            "type": "standard",
            "backgroundColor": "#FFFFFF",
            "borderColor": "#000000",
        ]
        view.disabled = true
        view.didSetProps()

        XCTAssertTrue(view.cardForm === firstInstance)
        XCTAssertEqual(
            firstTextField(in: view.cardForm, classNameContaining: "CardNumberInput")?.text,
            "4242424242424242"
        )
        XCTAssertEqual(view.cardForm?.isUserInteractionEnabled, false)
    }

    func test_didSetProps_cardStyleTypeChange_rebuildsCardForm() {
        let view = CardFormView(frame: CGRect(x: 0, y: 0, width: 320, height: 200))
        view.cardStyle = ["type": "standard"]
        view.didSetProps()

        guard let firstInstance = view.cardForm else {
            XCTFail("Expected STPCardFormView after first didSetProps")
            return
        }

        view.cardStyle = ["type": "borderless"]
        view.didSetProps()

        XCTAssertFalse(view.cardForm === firstInstance)
    }

    func test_onFocusChange_emitsWhenNumberFieldBeginsEditing() {
        let view = CardFormView(frame: CGRect(x: 0, y: 0, width: 320, height: 200))
        var focusedFields: [String] = []
        view.onFocusChange = { payload in
            guard let payload = payload,
                  let field = payload["focusedField"] as? String else {
                return
            }
            focusedFields.append(field)
        }

        view.didSetProps()

        guard let cardForm = view.cardForm else {
            XCTFail("Expected STPCardFormView after didSetProps")
            return
        }

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.addSubview(view)
        window.makeKeyAndVisible()

        guard let numberField = firstTextField(
            in: cardForm,
            classNameContaining: "CardNumberInput"
        ) else {
            XCTFail("Expected card number text field")
            return
        }

        XCTAssertTrue(numberField.becomeFirstResponder())
        RunLoop.main.run(until: Date().addingTimeInterval(0.1))

        XCTAssertEqual(focusedFields, ["CardNumber"])
    }

    private func firstTextField(in view: UIView?, classNameContaining needle: String) -> UITextField? {
        guard let view = view else {
            return nil
        }
        if let field = view as? UITextField,
           NSStringFromClass(type(of: field)).contains(needle) {
            return field
        }
        for subview in view.subviews {
            if let field = firstTextField(in: subview, classNameContaining: needle) {
                return field
            }
        }
        return nil
    }
}
