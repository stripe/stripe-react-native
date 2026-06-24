@testable import stripe_react_native
@_spi(ReactNativeSDK) import StripePaymentSheet
import XCTest

class CurrencySelectorAppearanceTests: XCTestCase {

    func test_buildAppearanceFromParams_nilInput_returnsDefault() {
        let appearance = CurrencySelectorAppearance.buildAppearanceFromParams(params: nil)
        let defaultAppearance = Checkout.CurrencySelectorView.Appearance()

        XCTAssertEqual(appearance.cornerRadius, defaultAppearance.cornerRadius)
        XCTAssertEqual(appearance.borderWidth, defaultAppearance.borderWidth)
        XCTAssertEqual(appearance.contentVerticalPadding, defaultAppearance.contentVerticalPadding)
        XCTAssertEqual(appearance.labelContent, defaultAppearance.labelContent)
    }

    func test_buildAppearanceFromParams_colorStrings() {
        let params: NSDictionary = [
            "background": "#111111",
            "selectedBackground": "#222222",
            "borderColor": "#333333",
            "textColor": "#444444",
            "selectedTextColor": "#555555",
            "textSecondaryColor": "#666666",
            "dangerColor": "#777777",
        ]

        let appearance = CurrencySelectorAppearance.buildAppearanceFromParams(params: params)

        XCTAssertEqual(appearance.background, UIColor(hexString: "#111111"))
        XCTAssertEqual(appearance.selectedBackground, UIColor(hexString: "#222222"))
        XCTAssertEqual(appearance.border, UIColor(hexString: "#333333"))
        XCTAssertEqual(appearance.text, UIColor(hexString: "#444444"))
        XCTAssertEqual(appearance.selectedText, UIColor(hexString: "#555555"))
        XCTAssertEqual(appearance.textSecondary, UIColor(hexString: "#666666"))
        XCTAssertEqual(appearance.danger, UIColor(hexString: "#777777"))
    }

    func test_buildAppearanceFromParams_themedColor() {
        let params: NSDictionary = [
            "textColor": [
                "light": "#000000",
                "dark": "#FFFFFF",
            ],
        ]

        let appearance = CurrencySelectorAppearance.buildAppearanceFromParams(params: params)

        XCTAssertEqual(
            appearance.text.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)),
            UIColor(hexString: "#000000")
        )
        XCTAssertEqual(
            appearance.text.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)),
            UIColor(hexString: "#FFFFFF")
        )
    }

    func test_buildAppearanceFromParams_dimensions() {
        let params: NSDictionary = [
            "cornerRadius": 12.0,
            "borderWidth": 2.0,
            "contentVerticalPadding": 6.0,
        ]

        let appearance = CurrencySelectorAppearance.buildAppearanceFromParams(params: params)

        XCTAssertEqual(appearance.cornerRadius, 12)
        XCTAssertEqual(appearance.borderWidth, 2)
        XCTAssertEqual(appearance.contentVerticalPadding, 6)
    }

    func test_buildAppearanceFromParams_font() {
        let params: NSDictionary = [
            "font": [
                "family": "Helvetica",
                "scale": 1.2,
            ],
        ]

        let appearance = CurrencySelectorAppearance.buildAppearanceFromParams(params: params)

        XCTAssertEqual(appearance.font.fontName, "Helvetica")
        XCTAssertEqual(appearance.sizeScaleFactor, 1.2)
    }

    func test_buildAppearanceFromParams_labelContent() {
        let automatic = CurrencySelectorAppearance.buildAppearanceFromParams(
            params: ["labelContent": "automatic"]
        )
        let currencyCode = CurrencySelectorAppearance.buildAppearanceFromParams(
            params: ["labelContent": "currencyCode"]
        )
        let amount = CurrencySelectorAppearance.buildAppearanceFromParams(
            params: ["labelContent": "amount"]
        )

        XCTAssertEqual(automatic.labelContent, .automatic)
        XCTAssertEqual(currencyCode.labelContent, .currencyCode)
        XCTAssertEqual(amount.labelContent, .amount)
    }
}
