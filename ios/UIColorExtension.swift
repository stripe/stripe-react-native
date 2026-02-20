//
//  UIColorExtension.swift
//  CocoaAsyncSocket
//
//  Created by Arkadiusz Kubaczkowski on 24/11/2020.
//

extension UIColor {
    public convenience init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int = UInt64()
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(red: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: CGFloat(a) / 255)
    }

    // Parse color strings including hex (#RRGGBB, #RGB, #AARRGGBB), rgb(), rgba(), hsl(), and hsla()
    public convenience init(colorString: String) {
        let trimmed = colorString.trimmingCharacters(in: .whitespaces).lowercased()

        // Check for hex color
        if trimmed.hasPrefix("#") {
            self.init(hexString: trimmed)
            return
        }

        // Check for rgb/rgba
        if trimmed.hasPrefix("rgb") {
            if let color = UIColor.parseRGBString(trimmed) {
                self.init(cgColor: color.cgColor)
                return
            }
        }

        // Check for hsl/hsla
        if trimmed.hasPrefix("hsl") {
            if let color = UIColor.parseHSLString(trimmed) {
                self.init(cgColor: color.cgColor)
                return
            }
        }

        // Fallback to black
        self.init(red: 0, green: 0, blue: 0, alpha: 1)
    }

    private static func parseRGBString(_ string: String) -> UIColor? {
        // Parse rgb(r, g, b) or rgba(r, g, b, a)
        let pattern = "rgba?\\s*\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)"
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: string, range: NSRange(string.startIndex..., in: string)) else {
            return nil
        }

        let nsString = string as NSString
        let r = CGFloat((nsString.substring(with: match.range(at: 1)) as NSString).floatValue) / 255.0
        let g = CGFloat((nsString.substring(with: match.range(at: 2)) as NSString).floatValue) / 255.0
        let b = CGFloat((nsString.substring(with: match.range(at: 3)) as NSString).floatValue) / 255.0

        var a: CGFloat = 1.0
        if match.range(at: 4).location != NSNotFound {
            a = CGFloat((nsString.substring(with: match.range(at: 4)) as NSString).floatValue)
        }

        return UIColor(red: r, green: g, blue: b, alpha: a)
    }

    private static func parseHSLString(_ string: String) -> UIColor? {
        // Parse hsl(h, s%, l%) or hsla(h, s%, l%, a)
        let pattern = "hsla?\\s*\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)%\\s*,\\s*([\\d.]+)%(?:\\s*,\\s*([\\d.]+))?\\s*\\)"
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: string, range: NSRange(string.startIndex..., in: string)) else {
            return nil
        }

        let nsString = string as NSString
        let h = CGFloat((nsString.substring(with: match.range(at: 1)) as NSString).floatValue) / 360.0
        let s = CGFloat((nsString.substring(with: match.range(at: 2)) as NSString).floatValue) / 100.0
        let l = CGFloat((nsString.substring(with: match.range(at: 3)) as NSString).floatValue) / 100.0

        var a: CGFloat = 1.0
        if match.range(at: 4).location != NSNotFound {
            a = CGFloat((nsString.substring(with: match.range(at: 4)) as NSString).floatValue)
        }

        return UIColor(hue: h, saturation: s, brightness: l, alpha: a)
    }
}
