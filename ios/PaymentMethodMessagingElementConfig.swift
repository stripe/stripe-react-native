//
//  PaymentMethodMessagingElementConfig.swift
//  stripe-react-native
//
//  Created by Tyler Clawson on 2/18/26.
//

@_spi(PaymentMethodMessagingElementPreview) @_spi(STP) import StripePaymentSheet

internal class PaymentMethodMessagingElementConfig {
    class func buildAppearanceFromParams(params: NSDictionary?) -> PaymentMethodMessagingElement.Appearance {
        var appearance = PaymentMethodMessagingElement.Appearance()

        guard let params = params else { return appearance }

        // Parse theme/style
        if let styleString = params["style"] as? String {
            switch styleString {
            case "dark":
                appearance.style = .alwaysDark
            case "flat":
                appearance.style = .flat
            case "light":
                appearance.style = .alwaysLight
            default:
                appearance.style = .automatic
            }
        }

        // Parse font
        if let fontParams = params["font"] as? NSDictionary {
            let scale = fontParams["scale"] as? CGFloat ?? 1
            if let fontFamily = fontParams["family"] as? String,
               let customFont = UIFont(name: fontFamily, size: UIFont.systemFontSize * scale) {
                appearance.font = customFont
            }
        }

        // Parse colors
        if let textColorHex = parseThemedColor(params: params, key: "textColor") {
            appearance.textColor = textColorHex
        }

        if let linkTextColorHex = parseThemedColor(params: params, key: "linkTextColor") {
            appearance.linkTextColor = linkTextColorHex
        }

        return appearance
    }

    private class func parseThemedColor(params: NSDictionary, key: String) -> UIColor? {
        // Check if it's a dictionary with light/dark keys
        if let colorDict = params[key] as? [String: String] {
            let lightHex = colorDict["light"]
            let darkHex = colorDict["dark"]

            if let light = lightHex, let dark = darkHex {
                return UIColor { traitCollection in
                    return traitCollection.userInterfaceStyle == .dark
                        ? UIColor(hexString: dark)
                        : UIColor(hexString: light)
                }
            }
        }

        // Check if it's a plain string
        if let colorString = params[key] as? String {
            return UIColor(hexString: colorString)
        }

        return nil
    }

    class func buildPaymentMethodMessagingElementConfiguration(
        params: NSDictionary
    ) -> (error: NSDictionary?, configuration: PaymentMethodMessagingElement.Configuration?) {

        // Parse required parameters
        guard let amount = params["amount"] as? Int else {
            let error: NSDictionary = [
                "code": "InvalidConfiguration",
                "message": "amount is required",
            ]
            return (error, nil)
        }

        guard let currency = params["currency"] as? String else {
            let error: NSDictionary = [
                "code": "InvalidConfiguration",
                "message": "currency is required",
            ]
            return (error, nil)
        }

        // Parse optional parameters
        let locale = params["locale"] as? String
        let country = params["country"] as? String

        var paymentMethodTypes: [STPPaymentMethodType]?
        if let paymentMethodTypesArray = params["paymentMethodTypes"] as? [String] {
            paymentMethodTypes = paymentMethodTypesArray.map {
                STPPaymentMethodType.fromIdentifier($0)
            }
        }

        let configuration = PaymentMethodMessagingElement.Configuration(
            amount: amount,
            currency: currency,
            locale: locale,
            countryCode: country,
            paymentMethodTypes: paymentMethodTypes
        )

        return (nil, configuration)
    }
}
