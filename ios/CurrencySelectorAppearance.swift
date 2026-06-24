//
//  CurrencySelectorAppearance.swift
//  stripe-react-native
//
//  Created by Nick Porter on 6/24/26.
//

@_spi(ReactNativeSDK) import StripePaymentSheet
import UIKit

internal class CurrencySelectorAppearance {
    class func buildAppearanceFromParams(params: NSDictionary?) -> Checkout.CurrencySelectorView.Appearance {
        var appearance = Checkout.CurrencySelectorView.Appearance()

        guard let params = params else { return appearance }

        if let background = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.BACKGROUND) {
            appearance.background = background
        }
        if let selectedBackground = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.SELECTED_BACKGROUND) {
            appearance.selectedBackground = selectedBackground
        }
        if let borderColor = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.BORDER_COLOR) {
            appearance.border = borderColor
        }
        if let textColor = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.TEXT_COLOR) {
            appearance.text = textColor
        }
        if let selectedTextColor = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.SELECTED_TEXT_COLOR) {
            appearance.selectedText = selectedTextColor
        }
        if let textSecondaryColor = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.TEXT_SECONDARY_COLOR) {
            appearance.textSecondary = textSecondaryColor
        }
        if let dangerColor = parseThemedColor(params: params, key: CurrencySelectorAppearanceKeys.DANGER_COLOR) {
            appearance.danger = dangerColor
        }

        if let cornerRadius = params[CurrencySelectorAppearanceKeys.CORNER_RADIUS] as? CGFloat {
            appearance.cornerRadius = cornerRadius
        }
        if let borderWidth = params[CurrencySelectorAppearanceKeys.BORDER_WIDTH] as? CGFloat {
            appearance.borderWidth = borderWidth
        }
        if let contentVerticalPadding = params[CurrencySelectorAppearanceKeys.CONTENT_VERTICAL_PADDING] as? CGFloat {
            appearance.contentVerticalPadding = contentVerticalPadding
        }

        if let fontParams = params[CurrencySelectorAppearanceKeys.FONT] as? NSDictionary {
            if let family = fontParams[CurrencySelectorAppearanceKeys.FAMILY] as? String,
               let customFont = UIFont(name: family, size: appearance.font.pointSize) {
                appearance.font = customFont
            }
            if let scale = fontParams[CurrencySelectorAppearanceKeys.SCALE] as? CGFloat {
                appearance.sizeScaleFactor = scale
            }
        }

        if let labelContent = params[CurrencySelectorAppearanceKeys.LABEL_CONTENT] as? String {
            switch labelContent {
            case CurrencySelectorAppearanceKeys.CURRENCY_CODE:
                appearance.labelContent = .currencyCode
            case CurrencySelectorAppearanceKeys.AMOUNT:
                appearance.labelContent = .amount
            case CurrencySelectorAppearanceKeys.AUTOMATIC:
                appearance.labelContent = .automatic
            default:
                break
            }
        }

        return appearance
    }

    private class func parseThemedColor(params: NSDictionary, key: String) -> UIColor? {
        if let colorDict = params[key] as? [String: String] {
            let light = colorDict[CurrencySelectorAppearanceKeys.LIGHT]
            let dark = colorDict[CurrencySelectorAppearanceKeys.DARK]
            guard light != nil || dark != nil else { return nil }
            return UIColor { traitCollection in
                let hex = traitCollection.userInterfaceStyle == .dark
                    ? (dark ?? light!)
                    : (light ?? dark!)
                return UIColor(hexString: hex)
            }
        }

        if let colorString = params[key] as? String {
            return UIColor(hexString: colorString)
        }

        return nil
    }
}

private enum CurrencySelectorAppearanceKeys {
    static let LIGHT = "light"
    static let DARK = "dark"

    static let BACKGROUND = "background"
    static let SELECTED_BACKGROUND = "selectedBackground"
    static let BORDER_COLOR = "borderColor"
    static let TEXT_COLOR = "textColor"
    static let SELECTED_TEXT_COLOR = "selectedTextColor"
    static let TEXT_SECONDARY_COLOR = "textSecondaryColor"
    static let DANGER_COLOR = "dangerColor"

    static let CORNER_RADIUS = "cornerRadius"
    static let BORDER_WIDTH = "borderWidth"
    static let CONTENT_VERTICAL_PADDING = "contentVerticalPadding"

    static let FONT = "font"
    static let FAMILY = "family"
    static let SCALE = "scale"

    static let LABEL_CONTENT = "labelContent"
    static let AUTOMATIC = "automatic"
    static let CURRENCY_CODE = "currencyCode"
    static let AMOUNT = "amount"
}
