@testable import stripe_react_native
@_spi(STP) import StripePaymentSheet
import UIKit
import XCTest

#if canImport(StripeCryptoOnramp)
@_spi(CryptoOnrampAlpha) import StripeCryptoOnramp
class OnrampMappersTests: XCTestCase {

    func test_mapToLinkAppearance_fullConfigurationMapsDynamicColorsAndPrimaryButton() {
        let params: [String: Any?] = [
            "style": "ALWAYS_DARK",
            "lightColors": [
                "primary": "#FF0000",
                "contentOnPrimary": "#FFFFFF",
                "borderSelected": "#00FF00",
            ],
            "darkColors": [
                "primary": "#0000FF",
                "contentOnPrimary": "#000000",
                "borderSelected": "#FF00FF",
            ],
            "primaryButton": [
                "cornerRadius": CGFloat(12),
                "height": CGFloat(48),
            ],
        ]

        let appearance = Mappers.mapToLinkAppearance(params)

        XCTAssertEqual(appearance.style, .alwaysDark)
        XCTAssertTrue(appearance.reduceLinkBranding)
        XCTAssertEqual(appearance.primaryButton?.cornerRadius, CGFloat(12))
        XCTAssertEqual(appearance.primaryButton?.height, CGFloat(48))

        assertColor(
            appearance.colors?.primary,
            matches: "#FF0000",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
        assertColor(
            appearance.colors?.primary,
            matches: "#0000FF",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
        assertColor(
            appearance.colors?.contentOnPrimary,
            matches: "#FFFFFF",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
        assertColor(
            appearance.colors?.contentOnPrimary,
            matches: "#000000",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
        assertColor(
            appearance.colors?.selectedBorder,
            matches: "#00FF00",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
        assertColor(
            appearance.colors?.selectedBorder,
            matches: "#FF00FF",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
    }

    func test_mapToLinkAppearance_partialPrimaryButtonIsIgnored() {
        let params: [String: Any?] = [
            "primaryButton": [
                "cornerRadius": CGFloat(12),
            ],
        ]

        let appearance = Mappers.mapToLinkAppearance(params)

        XCTAssertNil(appearance.colors)
        XCTAssertNil(appearance.primaryButton)
        XCTAssertEqual(appearance.style, .automatic)
        XCTAssertTrue(appearance.reduceLinkBranding)
    }

    func test_mapToLinkAppearance_styleAlwaysLight() {
        let appearance = Mappers.mapToLinkAppearance(["style": "ALWAYS_LIGHT"])

        XCTAssertEqual(appearance.style, .alwaysLight)
        XCTAssertNil(appearance.colors)
        XCTAssertNil(appearance.primaryButton)
        XCTAssertTrue(appearance.reduceLinkBranding)
    }

    func test_mapToLinkAppearance_unknownStyleDefaultsToAutomatic() {
        let appearance = Mappers.mapToLinkAppearance(["style": "SOMETHING_UNKNOWN"])

        XCTAssertEqual(appearance.style, .automatic)
    }

    func test_mapToLinkAppearance_emptyParamsReturnsDefaults() {
        let appearance = Mappers.mapToLinkAppearance([:])

        XCTAssertNil(appearance.colors)
        XCTAssertNil(appearance.primaryButton)
        XCTAssertEqual(appearance.style, .automatic)
        XCTAssertTrue(appearance.reduceLinkBranding)
    }

    func test_mapToLinkAppearance_onlyLightColorsUsesStaticColor() {
        let params: [String: Any?] = [
            "lightColors": [
                "primary": "#FF0000",
                "contentOnPrimary": "#FFFFFF",
                "borderSelected": "#00FF00",
            ],
        ]

        let appearance = Mappers.mapToLinkAppearance(params)

        XCTAssertNotNil(appearance.colors)
        // The static light color should resolve the same in both trait collections.
        assertColor(
            appearance.colors?.primary,
            matches: "#FF0000",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
        assertColor(
            appearance.colors?.primary,
            matches: "#FF0000",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
        assertColor(
            appearance.colors?.contentOnPrimary,
            matches: "#FFFFFF",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
        assertColor(
            appearance.colors?.selectedBorder,
            matches: "#00FF00",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
    }

    func test_mapToLinkAppearance_onlyDarkColorsUsesStaticColor() {
        let params: [String: Any?] = [
            "darkColors": [
                "primary": "#0000FF",
                "contentOnPrimary": "#000000",
                "borderSelected": "#FF00FF",
            ],
        ]

        let appearance = Mappers.mapToLinkAppearance(params)

        XCTAssertNotNil(appearance.colors)
        assertColor(
            appearance.colors?.primary,
            matches: "#0000FF",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
        assertColor(
            appearance.colors?.primary,
            matches: "#0000FF",
            traitCollection: UITraitCollection(userInterfaceStyle: .dark)
        )
        assertColor(
            appearance.colors?.contentOnPrimary,
            matches: "#000000",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
        assertColor(
            appearance.colors?.selectedBorder,
            matches: "#FF00FF",
            traitCollection: UITraitCollection(userInterfaceStyle: .light)
        )
    }

    func test_mapToKycAddress_trimsWhitespaceAndDropsEmptyValues() {
        let address = Mappers.mapToKycAddress([
            "city": " New York ",
            "country": " US ",
            "line1": " 123 Main St ",
            "line2": "   ",
            "postalCode": " 10001 ",
            "state": " NY ",
        ])

        XCTAssertEqual(address.city, "New York")
        XCTAssertEqual(address.country, "US")
        XCTAssertEqual(address.line1, "123 Main St")
        XCTAssertNil(address.line2)
        XCTAssertEqual(address.postalCode, "10001")
        XCTAssertEqual(address.state, "NY")
    }

    func test_mapToKycInfo_fullMapNormalizesNestedFields() throws {
        let result = try Mappers.mapToKycInfo([
            "firstName": " Jane ",
            "lastName": " Doe ",
            "idNumber": " 123456789 ",
            "address": [
                "city": " San Francisco ",
                "country": " US ",
                "line1": " 123 Main St ",
                "line2": "   ",
                "postalCode": " 94105 ",
                "state": " CA ",
            ],
            "dateOfBirth": [
                "day": NSNumber(value: 15),
                "month": 6,
                "year": 1990,
            ],
        ])

        XCTAssertEqual(result.firstName, "Jane")
        XCTAssertEqual(result.lastName, "Doe")
        XCTAssertEqual(result.idNumber, "123456789")
        XCTAssertEqual(
            result.address,
            Address(
                city: "San Francisco",
                country: "US",
                line1: "123 Main St",
                line2: nil,
                postalCode: "94105",
                state: "CA"
            )
        )
        XCTAssertEqual(
            result.dateOfBirth,
            KycInfo.DateOfBirth(day: 15, month: 6, year: 1990)
        )
    }

    func test_mapToKycInfo_invalidAddressThrowsInvalidField() {
        XCTAssertThrowsError(
            try Mappers.mapToKycInfo([
                "address": "not-a-map",
            ])
        ) { error in
            guard case let Mappers.KycInfoError.invalidField(field) = error else {
                return XCTFail("Expected invalidField error, got \(error)")
            }

            XCTAssertEqual(field, "address")
        }
    }

    func test_mapToKycInfo_invalidDateOfBirthThrowsInvalidField() {
        XCTAssertThrowsError(
            try Mappers.mapToKycInfo([
                "dateOfBirth": [
                    "day": "15",
                    "month": 6,
                    "year": 1990,
                ],
            ])
        ) { error in
            guard case let Mappers.KycInfoError.invalidField(field) = error else {
                return XCTFail("Expected invalidField error, got \(error)")
            }

            XCTAssertEqual(field, "dateOfBirth")
        }
    }

    func test_mapToKycInfo_missingDateOfBirthSubfieldsThrows() {
        XCTAssertThrowsError(
            try Mappers.mapToKycInfo([
                "dateOfBirth": [
                    "month": 6,
                    "year": 1990,
                ],
            ])
        ) { error in
            guard case let Mappers.KycInfoError.invalidField(field) = error else {
                return XCTFail("Expected invalidField error, got \(error)")
            }

            XCTAssertEqual(field, "dateOfBirth")
        }
    }

    func test_mapToKycInfo_emptyParamsReturnsAllNil() throws {
        let result = try Mappers.mapToKycInfo([:])

        XCTAssertNil(result.firstName)
        XCTAssertNil(result.lastName)
        XCTAssertNil(result.idNumber)
        XCTAssertNil(result.address)
        XCTAssertNil(result.dateOfBirth)
    }

    func test_mapFromKycInfo_fullInfoMapsNestedValues() {
        let result = Mappers.mapFromKycInfo(
            KycInfo(
                firstName: "Jane",
                lastName: "Doe",
                idNumber: "123456789",
                address: Address(
                    city: "San Francisco",
                    country: "US",
                    line1: "123 Main St",
                    line2: "Apt 4",
                    postalCode: "94105",
                    state: "CA"
                ),
                dateOfBirth: KycInfo.DateOfBirth(day: 15, month: 6, year: 1990)
            )
        )

        XCTAssertEqual(result["firstName"] as? String, "Jane")
        XCTAssertEqual(result["lastName"] as? String, "Doe")
        XCTAssertEqual(result["idNumber"] as? String, "123456789")

        let address = result["address"] as? [String: String]
        XCTAssertEqual(address?["city"], "San Francisco")
        XCTAssertEqual(address?["country"], "US")
        XCTAssertEqual(address?["line1"], "123 Main St")
        XCTAssertEqual(address?["line2"], "Apt 4")
        XCTAssertEqual(address?["postalCode"], "94105")
        XCTAssertEqual(address?["state"], "CA")

        let dateOfBirth = result["dateOfBirth"] as? [String: Int]
        XCTAssertEqual(dateOfBirth?["day"], 15)
        XCTAssertEqual(dateOfBirth?["month"], 6)
        XCTAssertEqual(dateOfBirth?["year"], 1990)
    }

    func test_mapFromKycInfo_omitsNilFields() {
        let result = Mappers.mapFromKycInfo(
            KycInfo(
                firstName: "Jane",
                lastName: nil,
                idNumber: nil,
                address: nil,
                dateOfBirth: nil
            )
        )

        XCTAssertEqual(result["firstName"] as? String, "Jane")
        XCTAssertNil(result["lastName"])
        XCTAssertNil(result["idNumber"])
        XCTAssertNil(result["address"])
        XCTAssertNil(result["dateOfBirth"])
    }

    func test_mapFromKycInfo_partialAddressOmitsNilFields() {
        let result = Mappers.mapFromKycInfo(
            KycInfo(
                firstName: nil,
                lastName: nil,
                idNumber: nil,
                address: Address(
                    city: "New York",
                    country: "US",
                    line1: nil,
                    line2: nil,
                    postalCode: nil,
                    state: nil
                ),
                dateOfBirth: nil
            )
        )

        let address = result["address"] as? [String: String]
        XCTAssertNotNil(address)
        XCTAssertEqual(address?["city"], "New York")
        XCTAssertEqual(address?["country"], "US")
        XCTAssertNil(address?["line1"])
        XCTAssertNil(address?["line2"])
        XCTAssertNil(address?["postalCode"])
        XCTAssertNil(address?["state"])
    }

    func test_mapFromKycAddress_partialAddressOmitsNilFields() {
        let result = Mappers.mapFromKycAddress(
            Address(
                city: "New York",
                country: nil,
                line1: nil,
                line2: nil,
                postalCode: "10001",
                state: nil
            )
        )

        XCTAssertEqual(result["city"] as? String, "New York")
        XCTAssertEqual(result["postalCode"] as? String, "10001")
        XCTAssertNil(result["country"])
        XCTAssertNil(result["line1"])
        XCTAssertNil(result["line2"])
        XCTAssertNil(result["state"])
    }

    func test_mapFromDateOfBirth_returnsAllThreeFields() {
        let result = Mappers.mapFromDateOfBirth(
            KycInfo.DateOfBirth(day: 15, month: 6, year: 1990)
        )

        XCTAssertEqual(result, ["day": 15, "month": 6, "year": 1990])
    }

    func test_paymentMethodDisplayDataToMap_mapsAllSupportedTypes() {
        assertPaymentMethodDisplayDataMap(
            type: .card,
            label: "Link",
            sublabel: "Visa •••• 4242",
            expectedType: "Card"
        )
        assertPaymentMethodDisplayDataMap(
            type: .bankAccount,
            label: "Link",
            sublabel: "Bank of America •••• 6789",
            expectedType: "BankAccount"
        )
        assertPaymentMethodDisplayDataMap(
            type: .applePay,
            label: "Apple Pay",
            sublabel: nil,
            expectedType: "ApplePay"
        )
    }

    private func assertPaymentMethodDisplayDataMap(
        type: PaymentMethodDisplayData.PaymentMethodType,
        label: String,
        sublabel: String?,
        expectedType: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let result = Mappers.paymentMethodDisplayDataToMap(
            PaymentMethodDisplayData(
                paymentMethodType: type,
                icon: makeTestIcon(),
                label: label,
                sublabel: sublabel
            )
        )

        XCTAssertEqual(result["type"], expectedType, file: file, line: line)
        XCTAssertEqual(result["label"], label, file: file, line: line)
        XCTAssertTrue(
            result["icon"]?.hasPrefix("data:image/png;base64,") == true,
            file: file,
            line: line
        )

        if let sublabel {
            XCTAssertEqual(result["sublabel"], sublabel, file: file, line: line)
        } else {
            XCTAssertNil(result["sublabel"], file: file, line: line)
        }
    }

    private func makeTestIcon() -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 1, height: 1))
        return renderer.image { context in
            UIColor.red.setFill()
            context.cgContext.fill(CGRect(x: 0, y: 0, width: 1, height: 1))
        }
    }

    private func assertColor(
        _ color: UIColor?,
        matches expectedHex: String,
        traitCollection: UITraitCollection,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard let color else {
            return XCTFail("Expected color to be present", file: file, line: line)
        }

        let expectedColor = UIColor(hexString: expectedHex)
        let resolvedColor = color.resolvedColor(with: traitCollection)
        let resolvedExpectedColor = expectedColor.resolvedColor(with: traitCollection)

        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0

        var expectedRed: CGFloat = 0
        var expectedGreen: CGFloat = 0
        var expectedBlue: CGFloat = 0
        var expectedAlpha: CGFloat = 0

        XCTAssertTrue(
            resolvedColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha),
            file: file,
            line: line
        )
        XCTAssertTrue(
            resolvedExpectedColor.getRed(
                &expectedRed,
                green: &expectedGreen,
                blue: &expectedBlue,
                alpha: &expectedAlpha
            ),
            file: file,
            line: line
        )

        XCTAssertEqual(red, expectedRed, accuracy: 0.001, file: file, line: line)
        XCTAssertEqual(green, expectedGreen, accuracy: 0.001, file: file, line: line)
        XCTAssertEqual(blue, expectedBlue, accuracy: 0.001, file: file, line: line)
        XCTAssertEqual(alpha, expectedAlpha, accuracy: 0.001, file: file, line: line)
    }
}
#endif
