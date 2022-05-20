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
            appearance.colors = try buildColors(params: colorParams)
        }
        if let shapeParams = userParams["shapes"] as? NSDictionary {
            appearance.cornerRadius = shapeParams["borderRadius"] as? CGFloat ?? PaymentSheet.Appearance.default.cornerRadius
            appearance.borderWidth = shapeParams["borderWidth"] as? CGFloat ?? PaymentSheet.Appearance.default.borderWidth
            if let shadowParams = shapeParams["shadow"] as? NSDictionary {
                appearance.shadow = try buildShadow(params: shadowParams)
            }
        }
        if let primaryButtonParams = userParams["primaryButton"] as? NSDictionary {
            appearance.primaryButton = try buildPrimaryButton(params: primaryButtonParams)
        }
        
        return appearance
    }
    
    private func buildFont(params: NSDictionary) throws -> Stripe.PaymentSheet.Appearance.Font {
        var font = Stripe.PaymentSheet.Appearance.Font()
        if let fontName = params["family"] as? String {
            guard let customFont = UIFont(name: fontName, size: UIFont.systemFontSize) else {
                throw PaymentSheetAppearanceError.missingFont(fontName)
            }
            font.base = customFont
        }
        font.sizeScaleFactor = params["scale"] as? CGFloat ?? PaymentSheet.Appearance.default.font.sizeScaleFactor
        return font
    }
    
    private func buildColors(params: NSDictionary) throws -> Stripe.PaymentSheet.Appearance.Colors {
        var colors = Stripe.PaymentSheet.Appearance.Colors()
        
        if (params.object(forKey: "light") != nil && params.object(forKey: "dark") == nil ||
            params.object(forKey: "dark") != nil && params.object(forKey: "light") == nil) {
            throw PaymentSheetAppearanceError.missingAppearanceMode
        }
        
        let lightModeParams = params["light"] as? NSDictionary ?? params
        let darkModeParams = params["dark"] as? NSDictionary ?? params
        
        colors.primary = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "primary", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.primary
        colors.background = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "background", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.background
        colors.componentBackground = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "componentBackground", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.componentBackground
        colors.componentBorder = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "componentBorder", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.componentBorder
        colors.componentDivider = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "componentDivider", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.componentDivider
        colors.text = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "primaryText", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.text
        colors.textSecondary = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "secondaryText", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.textSecondary
        colors.componentText = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "componentText", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.componentText
        colors.componentPlaceholderText = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "placeholderText", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.componentPlaceholderText
        colors.icon = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "icon", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.icon
        colors.danger = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "error", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.colors.danger
        
        return colors
    }
    
    private func buildShadow(params: NSDictionary) throws -> PaymentSheet.Appearance.Shadow {
        var shadow = PaymentSheet.Appearance.Shadow()
        
        if let color = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "color", lightParams: params, darkParams: params) {
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
        
        if let fontName = (params["font"] as? NSDictionary)?["family"] as? String {
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
                primaryButton.shadow = try buildShadow(params: shadowParams)
            }
        }
        if let colorParams = params["colors"] as? NSDictionary {
            if (colorParams.object(forKey: "light") != nil && colorParams.object(forKey: "dark") == nil ||
                colorParams.object(forKey: "dark") != nil && colorParams.object(forKey: "light") == nil) {
                throw PaymentSheetAppearanceError.missingAppearanceMode
            }
            
            let lightModeParams = colorParams["light"] as? NSDictionary ?? colorParams
            let darkModeParams = colorParams["dark"] as? NSDictionary ?? colorParams
            
            primaryButton.backgroundColor = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "background", lightParams: lightModeParams, darkParams: darkModeParams)
            primaryButton.textColor = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "text", lightParams: lightModeParams, darkParams: darkModeParams)
            primaryButton.borderColor = try StripeSdk.buildUserInterfaceStyleAwareColor(key: "border", lightParams: lightModeParams, darkParams: darkModeParams) ?? PaymentSheet.Appearance.default.primaryButton.borderColor
        }
        
        return primaryButton
    }
    
    private static func buildUserInterfaceStyleAwareColor(key: String, lightParams: NSDictionary, darkParams: NSDictionary) throws -> UIColor? {
        guard let lightHexString = lightParams[key] as? String, let darkHexString = darkParams[key] as? String else {
            return nil
        }
        
        let lightColor = try StripeSdk.hexStringToUIColor(inputString: lightHexString)
        let darkColor = try StripeSdk.hexStringToUIColor(inputString: darkHexString)
        
        if #available(iOS 13.0, *) {
            return UIColor.init { traits in
                return traits.userInterfaceStyle == .dark ? darkColor : lightColor
            }
        } else {
            return lightColor
        }
    }
    
    private static func hexStringToUIColor(inputString: String) throws -> UIColor {
        let color = inputString
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
            .uppercased()
        let colorWithAlpha: String = try {
            switch color.count {
            case 6:
                return color + "FF"
            case 8:
                return color
            default:
                throw PaymentSheetAppearanceError.unexpectedHexStringLength(color)
            }
        }()
        
        var rgbValue: UInt64 = 0
        Scanner(string: colorWithAlpha).scanHexInt64(&rgbValue)
        
        return UIColor(
            red: CGFloat((rgbValue & 0xFF000000) >> 24) / 255.0,
            green: CGFloat((rgbValue & 0x00FF0000) >> 16) / 255.0,
            blue: CGFloat((rgbValue & 0x0000FF00) >> 8) / 255.0,
            alpha: CGFloat(rgbValue & 0x000000FF) / 255.0
        )
    }
}

enum PaymentSheetAppearanceError : Error {
    case missingFont(String)
    case unexpectedHexStringLength(String)
    case missingAppearanceMode
}
    
extension PaymentSheetAppearanceError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .missingFont(let string):
            return NSLocalizedString("Failed to find font: \(string)", comment: "Failed to set font")
        case .missingAppearanceMode:
            return NSLocalizedString("Failed to set Payment Sheet colors. When providing 'colors.light' or 'colors.dark', you must provide both.", comment: "Failed to set font")
        case .unexpectedHexStringLength(let string):
            return NSLocalizedString("Expected hex string of length either 6 or 8, but received string: \(string)", comment: "Failed to set color")
        }
    }
}


