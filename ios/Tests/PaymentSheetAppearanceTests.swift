@testable import stripe_react_native
@_spi(EmbeddedPaymentElementPrivateBeta) import StripePaymentSheet
import XCTest

class PaymentSheetAppearanceTests: XCTestCase {

    // MARK: - Full Appearance Configuration

    func test_buildAppearanceFromParams_fullConfiguration() throws {
        let params: NSDictionary = [
            "colors": [
                "primary": "#123456",
                "background": "#123456",
                "componentBackground": "#123456",
                "componentBorder": "#123456",
                "componentDivider": "#123456",
                "componentText": "#123456",
                "primaryText": "#123456",
                "secondaryText": "#123456",
                "placeholderText": "#123456",
                "icon": "#123456",
                "error": "#123456",
            ],
            "shapes": [
                "borderRadius": 42.0,
                "borderWidth": 42.0,
            ],
            "font": [
                "scale": 42.0
            ],
            "primaryButton": [
                "colors": [
                    "background": "#123456",
                    "text": "#123456",
                    "border": "#123456",
                    "successBackgroundColor": "#123456",
                    "successTextColor": "#123456",
                ],
                "shapes": [
                    "borderRadius": 42.0,
                    "borderWidth": 42.0,
                    "height": 42.0,
                ],
            ],
            "formInsetValues": [
                "left": 42.0,
                "top": 42.0,
                "right": 42.0,
                "bottom": 42.0,
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        // Verify basic properties
        XCTAssertEqual(appearance.cornerRadius, 42.0)
        XCTAssertEqual(appearance.borderWidth, 42.0)
        XCTAssertEqual(appearance.font.sizeScaleFactor, 42.0)

        // Verify primary button
        XCTAssertEqual(appearance.primaryButton.cornerRadius, 42.0)
        XCTAssertEqual(appearance.primaryButton.borderWidth, 42.0)
        XCTAssertEqual(appearance.primaryButton.height, 42.0)

        // Verify form insets
        XCTAssertEqual(appearance.formInsets.top, 42.0)
        XCTAssertEqual(appearance.formInsets.leading, 42.0)
        XCTAssertEqual(appearance.formInsets.bottom, 42.0)
        XCTAssertEqual(appearance.formInsets.trailing, 42.0)
    }

    func test_buildAppearanceFromParams_partialConfiguration() throws {
        let params: NSDictionary = [
            "colors": [
                "primary": "#123456",
                "componentBackground": "#123456",
                "componentDivider": "#123456",
                "primaryText": "#123456",
                "placeholderText": "#123456",
                "error": "#123456",
            ],
            "shapes": [
                "borderRadius": 42.0
            ],
            "primaryButton": [
                "colors": [
                    "background": "#123456",
                    "border": "#123456",
                ],
                "shapes": [
                    "borderRadius": 42.0,
                    "height": 42.0,
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        // Verify properties that were set
        XCTAssertEqual(appearance.cornerRadius, 42.0)
        XCTAssertEqual(appearance.primaryButton.cornerRadius, 42.0)
        XCTAssertEqual(appearance.primaryButton.height, 42.0)

        // Border width should use default since it wasn't provided
        XCTAssertEqual(appearance.borderWidth, PaymentSheet.Appearance.default.borderWidth)
    }

    // MARK: - Embedded Payment Element - FlatWithRadio

    func test_buildEmbeddedAppearance_flatWithRadio_full() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "flatWithRadio",
                    "additionalInsets": 42.0,
                    "flat": [
                        "separatorThickness": 42.0,
                        "topSeparatorEnabled": true,
                        "bottomSeparatorEnabled": true,
                        "separatorColor": "#123456",
                        "separatorInsets": [
                            "left": 42.0,
                            "right": 42.0,
                        ],
                        "radio": [
                            "selectedColor": "#123456",
                            "unselectedColor": "#123456",
                        ],
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        // Verify embedded payment element settings
        XCTAssertEqual(appearance.embeddedPaymentElement.row.additionalInsets, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorThickness, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.topSeparatorEnabled, true)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.bottomSeparatorEnabled, true)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorInsets?.left, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorInsets?.right, 42.0)
    }

    func test_buildEmbeddedAppearance_flatWithRadio_partial() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "flatWithRadio",
                    "flat": [
                        "separatorThickness": 42.0,
                        "topSeparatorEnabled": false,
                        "separatorColor": "#123456",
                        "radio": [
                            "selectedColor": "#123456"
                        ],
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorThickness, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.topSeparatorEnabled, false)
    }

    // MARK: - Embedded Payment Element - FlatWithCheckmark

    func test_buildEmbeddedAppearance_flatWithCheckmark_full() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "flatWithCheckmark",
                    "additionalInsets": 42.0,
                    "flat": [
                        "separatorThickness": 42.0,
                        "topSeparatorEnabled": true,
                        "bottomSeparatorEnabled": true,
                        "separatorColor": "#123456",
                        "separatorInsets": [
                            "left": 42.0,
                            "right": 42.0,
                        ],
                        "checkmark": [
                            "color": "#123456"
                        ],
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.additionalInsets, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorThickness, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.topSeparatorEnabled, true)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.bottomSeparatorEnabled, true)
    }

    func test_buildEmbeddedAppearance_flatWithCheckmark_partial() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "flatWithCheckmark",
                    "flat": [
                        "separatorThickness": 42.0,
                        "bottomSeparatorEnabled": false,
                        "separatorColor": "#123456",
                        "checkmark": [
                            "color": "#123456"
                        ],
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorThickness, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.bottomSeparatorEnabled, false)
    }

    // MARK: - Embedded Payment Element - FlatWithDisclosure

    func test_buildEmbeddedAppearance_flatWithDisclosure_full() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "flatWithDisclosure",
                    "additionalInsets": 42.0,
                    "flat": [
                        "separatorThickness": 42.0,
                        "topSeparatorEnabled": true,
                        "bottomSeparatorEnabled": true,
                        "separatorColor": "#123456",
                        "separatorInsets": [
                            "left": 42.0,
                            "right": 42.0,
                        ],
                        "disclosure": [
                            "color": "#123456"
                        ],
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.additionalInsets, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorThickness, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.topSeparatorEnabled, true)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.bottomSeparatorEnabled, true)
    }

    func test_buildEmbeddedAppearance_flatWithDisclosure_partial() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "flatWithDisclosure",
                    "flat": [
                        "separatorThickness": 42.0,
                        "separatorColor": "#123456",
                        "disclosure": [
                            "color": "#123456"
                        ],
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.flat.separatorThickness, 42.0)
    }

    // MARK: - Embedded Payment Element - FloatingButton

    func test_buildEmbeddedAppearance_floatingButton_full() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "floatingButton",
                    "additionalInsets": 42.0,
                    "floating": [
                        "spacing": 42.0
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.additionalInsets, 42.0)
        XCTAssertEqual(appearance.embeddedPaymentElement.row.floating.spacing, 42.0)
    }

    func test_buildEmbeddedAppearance_floatingButton_partial() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "floatingButton",
                    "floating": [
                        "spacing": 42.0
                    ],
                ],
            ],
        ]

        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)

        XCTAssertEqual(appearance.embeddedPaymentElement.row.floating.spacing, 42.0)
    }

    // MARK: - Error Cases

    func test_buildAppearanceFromParams_nilInput_returnsDefault() throws {
        let appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: nil)

        // Should return default appearance
        XCTAssertEqual(appearance.cornerRadius, PaymentSheet.Appearance.default.cornerRadius)
        XCTAssertEqual(appearance.borderWidth, PaymentSheet.Appearance.default.borderWidth)
    }

    func test_buildAppearanceFromParams_invalidRowStyle_throwsError() throws {
        let params: NSDictionary = [
            "embeddedPaymentElement": [
                "row": [
                    "style": "invalidStyle"
                ],
            ],
        ]

        XCTAssertThrowsError(
            try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)
        ) { error in
            XCTAssertTrue(error is PaymentSheetAppearanceError)
            if case PaymentSheetAppearanceError.invalidRowStyle(let style) = error {
                XCTAssertEqual(style, "invalidStyle")
            } else {
                XCTFail("Expected invalidRowStyle error")
            }
        }
    }

    func test_buildAppearanceFromParams_missingFont_throwsError() throws {
        let params: NSDictionary = [
            "font": [
                "family": "NonExistentFont123"
            ],
        ]

        XCTAssertThrowsError(
            try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)
        ) { error in
            XCTAssertTrue(error is PaymentSheetAppearanceError)
            if case PaymentSheetAppearanceError.missingFont(let fontName) = error {
                XCTAssertEqual(fontName, "NonExistentFont123")
            } else {
                XCTFail("Expected missingFont error")
            }
        }
    }

    func test_buildAppearanceFromParams_invalidHexColor_throwsError() throws {
        let params: NSDictionary = [
            "colors": [
                "primary": "#12"  // Too short
            ],
        ]

        XCTAssertThrowsError(
            try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)
        ) { error in
            XCTAssertTrue(error is PaymentSheetAppearanceError)
        }
    }

    func test_buildAppearanceFromParams_mismatchedAppearanceModes_throwsError() throws {
        let params: NSDictionary = [
            "colors": [
                "light": [
                    "primary": "#123456"
                ],
                // Missing dark mode
            ],
        ]

        XCTAssertThrowsError(
            try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params)
        ) { error in
            XCTAssertTrue(error is PaymentSheetAppearanceError)
            if case PaymentSheetAppearanceError.missingAppearanceMode = error {
                // Success
            } else {
                XCTFail("Expected missingAppearanceMode error")
            }
        }
    }
}
