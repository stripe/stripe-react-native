@testable import stripe_react_native
@_spi(PaymentMethodMessagingElementPreview) @_spi(STP) import StripePaymentSheet
import XCTest

class PaymentMethodMessagingElementConfigTests: XCTestCase {

    // MARK: - Appearance Configuration Tests

    func test_buildAppearanceFromParams_fullConfiguration() throws {
        let params: NSDictionary = [
            "style": "dark",
            "font": [
                "family": "Helvetica",
                "scale": 1.5,
            ],
            "textColor": "#123456",
            "linkTextColor": "#654321",
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Verify style
        XCTAssertEqual(appearance.style, .alwaysDark)

        // Verify font
        XCTAssertNotNil(appearance.font)
        XCTAssertEqual(appearance.font.fontName, "Helvetica")

        // Verify colors
        XCTAssertNotNil(appearance.textColor)
        XCTAssertNotNil(appearance.infoIconColor)
    }

    func test_buildAppearanceFromParams_partialConfiguration() throws {
        let params: NSDictionary = [
            "style": "light",
            "textColor": "#123456",
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Verify properties that were set
        XCTAssertEqual(appearance.style, .alwaysLight)
        XCTAssertNotNil(appearance.textColor)

        // Font should use default since it wasn't provided
        XCTAssertEqual(appearance.font, PaymentMethodMessagingElement.Appearance().font)
    }

    func test_buildAppearanceFromParams_nilInput_returnsDefault() throws {
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: nil)

        // Should return default appearance
        XCTAssertEqual(appearance.style, PaymentMethodMessagingElement.Appearance().style)
        XCTAssertEqual(appearance.font, PaymentMethodMessagingElement.Appearance().font)
    }

    func test_buildAppearanceFromParams_emptyDictionary_returnsDefault() throws {
        let params: NSDictionary = [:]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Should return default appearance
        XCTAssertEqual(appearance.style, PaymentMethodMessagingElement.Appearance().style)
        XCTAssertEqual(appearance.font, PaymentMethodMessagingElement.Appearance().font)
    }

    // MARK: - Style Tests

    func test_buildAppearanceFromParams_darkStyle() throws {
        let params: NSDictionary = ["style": "dark"]
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)
        XCTAssertEqual(appearance.style, .alwaysDark)
    }

    func test_buildAppearanceFromParams_lightStyle() throws {
        let params: NSDictionary = ["style": "light"]
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)
        XCTAssertEqual(appearance.style, .alwaysLight)
    }

    func test_buildAppearanceFromParams_flatStyle() throws {
        let params: NSDictionary = ["style": "flat"]
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)
        XCTAssertEqual(appearance.style, .flat)
    }

    func test_buildAppearanceFromParams_automaticStyle() throws {
        let params: NSDictionary = ["style": "automatic"]
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)
        XCTAssertEqual(appearance.style, .automatic)
    }

    func test_buildAppearanceFromParams_invalidStyle_usesAutomatic() throws {
        let params: NSDictionary = ["style": "invalidStyle"]
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)
        XCTAssertEqual(appearance.style, .automatic)
    }

    // MARK: - Font Tests

    func test_buildAppearanceFromParams_fontWithFamilyAndScale() throws {
        let params: NSDictionary = [
            "font": [
                "family": "Helvetica",
                "scale": 2.0,
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        XCTAssertNotNil(appearance.font)
        XCTAssertEqual(appearance.font.fontName, "Helvetica")
    }

    func test_buildAppearanceFromParams_fontWithFamilyOnly() throws {
        let params: NSDictionary = [
            "font": [
                "family": "Helvetica"
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        XCTAssertNotNil(appearance.font)
        XCTAssertEqual(appearance.font.fontName, "Helvetica")
    }

    func test_buildAppearanceFromParams_fontWithScaleOnly() throws {
        let params: NSDictionary = [
            "font": [
                "scale": 2.0
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Should use default font since family wasn't provided
        XCTAssertEqual(appearance.font, PaymentMethodMessagingElement.Appearance().font)
    }

    func test_buildAppearanceFromParams_invalidFontFamily() throws {
        let params: NSDictionary = [
            "font": [
                "family": "NonExistentFont123",
                "scale": 1.5,
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Should use default font since the font doesn't exist
        XCTAssertEqual(appearance.font, PaymentMethodMessagingElement.Appearance().font)
    }

    // MARK: - Color Tests

    func test_buildAppearanceFromParams_textColorString() throws {
        let params: NSDictionary = [
            "textColor": "#FF5733"
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        XCTAssertNotNil(appearance.textColor)
    }

    func test_buildAppearanceFromParams_linkTextColorString() throws {
        let params: NSDictionary = [
            "linkTextColor": "#33FF57"
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        XCTAssertNotNil(appearance.infoIconColor)
    }

    func test_buildAppearanceFromParams_themedColors() throws {
        let params: NSDictionary = [
            "textColor": [
                "light": "#000000",
                "dark": "#FFFFFF",
            ],
            "linkTextColor": [
                "light": "#0000FF",
                "dark": "#FF0000",
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        XCTAssertNotNil(appearance.textColor)
        XCTAssertNotNil(appearance.infoIconColor)
    }

    func test_buildAppearanceFromParams_themedColorMissingDark() throws {
        let params: NSDictionary = [
            "textColor": [
                "light": "#000000"
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Should be default since dark mode is missing
        XCTAssertEqual(appearance.textColor, .label)
    }

    func test_buildAppearanceFromParams_themedColorMissingLight() throws {
        let params: NSDictionary = [
            "textColor": [
                "dark": "#FFFFFF"
            ],
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: params)

        // Should be default since light mode is missing
        XCTAssertEqual(appearance.textColor, .label)
    }

    // MARK: - Configuration Tests

    func test_buildConfiguration_fullConfiguration() throws {
        let params: NSDictionary = [
            "amount": 1000,
            "currency": "usd",
            "locale": "en_US",
            "country": "US",
            "paymentMethodTypes": ["card", "affirm", "afterpay_clearpay"],
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNil(error)
        XCTAssertNotNil(configuration)

        XCTAssertEqual(configuration?.amount, 1000)
        XCTAssertEqual(configuration?.currency, "usd")
        XCTAssertEqual(configuration?.locale, "en_US")
        XCTAssertEqual(configuration?.countryCode, "US")
        XCTAssertEqual(configuration?.paymentMethodTypes?.count, 3)
    }

    func test_buildConfiguration_minimalConfiguration() throws {
        let params: NSDictionary = [
            "amount": 1000,
            "currency": "usd",
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNil(error)
        XCTAssertNotNil(configuration)

        XCTAssertEqual(configuration?.amount, 1000)
        XCTAssertEqual(configuration?.currency, "usd")
    }

    func test_buildConfiguration_partialConfiguration() throws {
        let params: NSDictionary = [
            "amount": 2000,
            "currency": "eur",
            "locale": "fr_FR",
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNil(error)
        XCTAssertNotNil(configuration)

        XCTAssertEqual(configuration?.amount, 2000)
        XCTAssertEqual(configuration?.currency, "eur")
        XCTAssertEqual(configuration?.locale, "fr_FR")
        XCTAssertNil(configuration?.countryCode)
        XCTAssertNil(configuration?.paymentMethodTypes)
    }

    func test_buildConfiguration_withPaymentMethodTypes() throws {
        let params: NSDictionary = [
            "amount": 1500,
            "currency": "gbp",
            "paymentMethodTypes": ["card", "klarna"],
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNil(error)
        XCTAssertNotNil(configuration)

        XCTAssertEqual(configuration?.amount, 1500)
        XCTAssertEqual(configuration?.currency, "gbp")
        XCTAssertEqual(configuration?.paymentMethodTypes?.count, 2)
    }

    // MARK: - Configuration Error Tests

    func test_buildConfiguration_missingAmount() throws {
        let params: NSDictionary = [
            "currency": "usd"
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNotNil(error)
        XCTAssertNil(configuration)

        let errorCode = error?["code"] as? String
        let errorMessage = error?["message"] as? String

        XCTAssertEqual(errorCode, "InvalidConfiguration")
        XCTAssertEqual(errorMessage, "amount is required")
    }

    func test_buildConfiguration_missingCurrency() throws {
        let params: NSDictionary = [
            "amount": 1000
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNotNil(error)
        XCTAssertNil(configuration)

        let errorCode = error?["code"] as? String
        let errorMessage = error?["message"] as? String

        XCTAssertEqual(errorCode, "InvalidConfiguration")
        XCTAssertEqual(errorMessage, "currency is required")
    }

    func test_buildConfiguration_emptyPaymentMethodTypes() throws {
        let params: NSDictionary = [
            "amount": 1000,
            "currency": "usd",
            "paymentMethodTypes": [],
        ]

        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: params)

        XCTAssertNil(error)
        XCTAssertNotNil(configuration)

        XCTAssertEqual(configuration?.paymentMethodTypes?.count, 0)
    }

    // MARK: - Integration Tests

    func test_buildAppearanceAndConfiguration_together() throws {
        let appearanceParams: NSDictionary = [
            "style": "dark",
            "textColor": "#FFFFFF",
            "font": [
                "family": "Helvetica",
                "scale": 1.2,
            ],
        ]

        let configParams: NSDictionary = [
            "amount": 5000,
            "currency": "usd",
            "locale": "en_US",
            "country": "US",
        ]

        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: appearanceParams)
        let (error, configuration) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(params: configParams)

        // Verify appearance
        XCTAssertEqual(appearance.style, .alwaysDark)
        XCTAssertNotNil(appearance.textColor)
        XCTAssertNotNil(appearance.font)

        // Verify configuration
        XCTAssertNil(error)
        XCTAssertNotNil(configuration)
        XCTAssertEqual(configuration?.amount, 5000)
        XCTAssertEqual(configuration?.currency, "usd")
        XCTAssertEqual(configuration?.locale, "en_US")
        XCTAssertEqual(configuration?.countryCode, "US")
    }
}
