//
//  ShippingAddressAppearanceMapperTests.swift
//  stripe-react-native
//
//  Created by George Birch on 10/21/26.
//

@testable import stripe_react_native
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import UIKit
import XCTest

@MainActor
final class ShippingAddressAppearanceMapperTests: XCTestCase {

    func test_map_mapsColorsInBothInterfaceStyles() throws {
        // Distinct values catch colors being dropped or assigned to a different field.
        let colors: [String: (field: KeyPath<ShippingAddressElement.Appearance.Colors, UIColor>, light: String, dark: String)] = [
            "primary": (\.primary, "#112233", "#102030"),
            "background": (\.background, "#223344", "#203040"),
            "componentBackground": (\.componentBackground, "#334455", "#304050"),
            "componentBorder": (\.componentBorder, "#445566", "#405060"),
            "componentDivider": (\.componentDivider, "#556677", "#506070"),
            "primaryText": (\.text, "#667788", "#607080"),
            "secondaryText": (\.textSecondary, "#778899", "#708090"),
            "componentText": (\.componentText, "#8899AA", "#8090A0"),
            "placeholderText": (\.componentPlaceholderText, "#99AABB", "#90A0B0"),
            "icon": (\.icon, "#AABBCC", "#A0B0C0"),
            "error": (\.danger, "#BBCCDD", "#B0C0D0"),
        ]
        let light = colors.mapValues { $0.light }
        let dark = colors.mapValues { $0.dark }
        let palettes: [(params: NSDictionary, usesThemePalettes: Bool)] = [
            (light as NSDictionary, false),
            (["light": light, "dark": dark] as NSDictionary, true),
        ]

        for palette in palettes {
            let appearance = try mapAppearance(["colors": palette.params])
            for (key, expected) in colors {
                let color = appearance.colors[keyPath: expected.field]
                let styles: [(UIUserInterfaceStyle, String)] = [
                    (.light, expected.light),
                    (.dark, palette.usesThemePalettes ? expected.dark : expected.light),
                ]
                for (style, hex) in styles {
                    XCTAssertEqual(
                        color.resolvedColor(with: UITraitCollection(userInterfaceStyle: style)),
                        UIColor(hexString: hex),
                        "Incorrect \(key) color for \(style)"
                    )
                }
            }
        }
    }

    func test_map_mapsInsetsAndPreservesOmittedEdges() throws {
        let defaults = ShippingAddressElement.Appearance().formInsets
        let cases: [(params: NSDictionary, expected: NSDirectionalEdgeInsets)] = [
            ([:], defaults),
            (
                ["left": 3.5, "top": 7.5, "right": 11.5, "bottom": 15.5],
                NSDirectionalEdgeInsets(top: 7.5, leading: 3.5, bottom: 15.5, trailing: 11.5)
            ),
            (
                ["left": 0, "bottom": 9.5],
                NSDirectionalEdgeInsets(top: defaults.top, leading: 0, bottom: 9.5, trailing: defaults.trailing)
            ),
        ]

        // Asymmetric edges also catch left/right or top/bottom being swapped.
        for testCase in cases {
            let appearance = try mapAppearance(["formInsetValues": testCase.params])
            XCTAssertEqual(appearance.formInsets, testCase.expected)
        }
    }

    func test_map_mapsPrimaryButtonAppearance() throws {
        let light = ["background": "#112233", "text": "#445566", "border": "#778899"]
        let dark = ["background": "#AABBCC", "text": "#DDEEFF", "border": "#102030"]
        let palettes: [(params: NSDictionary, usesThemePalettes: Bool)] = [
            (light as NSDictionary, false),
            (["light": light, "dark": dark] as NSDictionary, true),
        ]

        for palette in palettes {
            let button = try mapAppearance([
                "primaryButton": [
                    "colors": palette.params,
                    "shapes": ["borderRadius": 14.5, "borderWidth": 2.5, "height": 52.5],
                    "font": ["family": "Helvetica"],
                ],
            ]).primaryButton

            XCTAssertEqual(button.cornerRadius, 14.5)
            XCTAssertEqual(button.borderWidth, 2.5)
            XCTAssertEqual(button.height, 52.5)
            XCTAssertEqual(button.font?.fontName, "Helvetica")

            let colors: [(color: UIColor?, light: String, dark: String)] = [
                (button.backgroundColor, "#112233", "#AABBCC"),
                (button.textColor, "#445566", "#DDEEFF"),
                (button.borderColor, "#778899", "#102030"),
            ]
            for expected in colors {
                let color = try XCTUnwrap(expected.color)
                XCTAssertEqual(
                    color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)),
                    UIColor(hexString: expected.light)
                )
                XCTAssertEqual(
                    color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .dark)),
                    UIColor(hexString: palette.usesThemePalettes ? expected.dark : expected.light)
                )
            }
        }
    }

    private func mapAppearance(_ params: NSDictionary) throws -> ShippingAddressElement.Appearance {
        // Exercise the public configuration path, including the shipping-specific copy.
        let configuration = try CheckoutConfigurationMapper.map(
            params: [
                "clientSecret": "cs_test_secret_123",
                "returnURL": "example://checkout",
                "shippingAddressElement": ["appearance": params],
            ],
            merchantIdentifier: nil,
            didSelectPaymentOption: {}
        )
        return try XCTUnwrap(configuration.shippingAddressElement?.appearance)
    }
}
