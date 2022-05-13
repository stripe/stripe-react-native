//
//  PaymentSheetAppearance.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 5/11/22.
//
@_spi(STP) import Stripe

extension StripeSdk {
    func buildPaymentSheetAppearance(userParams: NSDictionary) throws -> PaymentSheet.Appearance {
        var appearance = PaymentSheet.Appearance()
        
        if let fontParams = userParams["font"] as? NSDictionary {
            appearance.font = try buildFont(params: fontParams)
        }
        if let colorParams = userParams["colors"] as? NSDictionary {
            appearance.colors = buildColors(params: colorParams)
        }
        if let shapeParams = userParams["shapes"] as? NSDictionary {
            appearance.cornerRadius = shapeParams["borderRadius"] as? CGFloat ?? PaymentSheet.Appearance.default.cornerRadius
            appearance.borderWidth = shapeParams["borderWidth"] as? CGFloat ?? PaymentSheet.Appearance.default.borderWidth
            if let shadowParams = shapeParams["shadow"] as? NSDictionary {
                appearance.shadow = buildShadow(params: shadowParams)
            }
        }
        if let primaryButtonParams = userParams["primaryButton"] as? NSDictionary {
            appearance.primaryButton = try buildPrimaryButton(params: primaryButtonParams)
        }
        
        return appearance
    }
    
    private func buildFont(params: NSDictionary) throws -> Stripe.PaymentSheet.Appearance.Font {
        var font = Stripe.PaymentSheet.Appearance.Font()
        if let fontName = params["name"] as? String {
            guard let customFont = UIFont(name: fontName, size: UIFont.systemFontSize) else {
                throw PaymentSheetAppearanceError.missingFont(fontName)
            }
            font.base = customFont
        }
        font.sizeScaleFactor = params["scale"] as? CGFloat ?? PaymentSheet.Appearance.default.font.sizeScaleFactor
        return font
    }
    
    private func buildColors(params: NSDictionary) -> Stripe.PaymentSheet.Appearance.Colors {
        var colors = Stripe.PaymentSheet.Appearance.Colors()
        
        colors.primary = StripeSdk.hexToUIColor(hex: params["primary"] as? String) ?? PaymentSheet.Appearance.default.colors.primary
        colors.background = StripeSdk.hexToUIColor(hex: params["background"] as? String) ?? PaymentSheet.Appearance.default.colors.background
        colors.componentBackground = StripeSdk.hexToUIColor(hex: params["componentBackground"] as? String) ?? PaymentSheet.Appearance.default.colors.componentBackground
        colors.componentBorder = StripeSdk.hexToUIColor(hex: params["componentBorder"] as? String) ?? PaymentSheet.Appearance.default.colors.componentBorder
        colors.componentDivider = StripeSdk.hexToUIColor(hex: params["componentDivider"] as? String) ?? PaymentSheet.Appearance.default.colors.componentDivider
        colors.text = StripeSdk.hexToUIColor(hex: params["text"] as? String) ?? PaymentSheet.Appearance.default.colors.text
        colors.textSecondary = StripeSdk.hexToUIColor(hex: params["textSecondary"] as? String) ?? PaymentSheet.Appearance.default.colors.textSecondary
        colors.componentText = StripeSdk.hexToUIColor(hex: params["componentText"] as? String) ?? PaymentSheet.Appearance.default.colors.componentText
        colors.componentPlaceholderText = StripeSdk.hexToUIColor(hex: params["componentPlaceholderText"] as? String) ?? PaymentSheet.Appearance.default.colors.componentPlaceholderText
        colors.icon = StripeSdk.hexToUIColor(hex: params["icon"] as? String) ?? PaymentSheet.Appearance.default.colors.icon
        colors.danger = StripeSdk.hexToUIColor(hex: params["danger"] as? String) ?? PaymentSheet.Appearance.default.colors.danger
        
        return colors
    }
    
    private func buildShadow(params: NSDictionary) -> PaymentSheet.Appearance.Shadow {
        var shadow = PaymentSheet.Appearance.Shadow()
        
        if let color = StripeSdk.hexToUIColor(hex: params["color"] as? String) {
            shadow.color = color
        }
        if let opacity = params["opacity"] as? CGFloat {
            shadow.opacity = opacity
        }
        if let radius = params["borderRadius"] as? CGFloat {
            shadow.radius = radius
        }
        if let offsetParams = params["offset"] as? NSDictionary {
            if let x = offsetParams["x"] as? CGFloat, let y = offsetParams["y"] as? CGFloat {
                shadow.offset = CGSize(width: x, height:y)
            }
        }

        return shadow
    }
    
    private func buildPrimaryButton(params: NSDictionary) throws -> PaymentSheet.Appearance.PrimaryButton {
        var primaryButton = PaymentSheet.Appearance.PrimaryButton()
        
        if let fontName = (params["font"] as? NSDictionary)?["name"] as? String {
            guard let customFont = UIFont(name: fontName, size: UIFont.systemFontSize) else {
                throw PaymentSheetAppearanceError.missingFont(fontName)
            }
            primaryButton.font = customFont
        }
        if let shapeParams = params["shapes"] as? NSDictionary {
            if let borderRadius = shapeParams["borderRadius"] as? CGFloat {
                primaryButton.cornerRadius = borderRadius
            }
            if let borderWidth = shapeParams["borderWidth"] as? CGFloat {
                primaryButton.borderWidth = borderWidth
            }
            if let shadowParams = shapeParams["shadow"] as? NSDictionary {
                primaryButton.shadow = buildShadow(params: shadowParams)
            }
        }
        if let colorParams = params["colors"] as? NSDictionary {
            if let background = colorParams["background"] as? String {
                primaryButton.backgroundColor = StripeSdk.hexToUIColor(hex: background)
            }
            if let text = colorParams["text"] as? String {
                primaryButton.textColor = StripeSdk.hexToUIColor(hex: text)
            }
            if let componentBorderColor = StripeSdk.hexToUIColor(hex: colorParams["componentBorder"] as? String) {
                primaryButton.borderColor = componentBorderColor
            }
        }
        
        return primaryButton
    }

    private static func hexToUIColor (hex: String?) -> UIColor? {
        guard let hex = hex else { return nil }
        
        let color = hex
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
            .uppercased()

        var rgbValue: UInt64 = 0
        Scanner(string: color).scanHexInt64(&rgbValue)

        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: CGFloat(1.0)
        )
    }
}

enum PaymentSheetAppearanceError : Error {
    case missingFont(String)
}
    
extension PaymentSheetAppearanceError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .missingFont(let string):
            return NSLocalizedString("Failed to find font: \(string)", comment: "Failed to set font")
        }
    }
}


