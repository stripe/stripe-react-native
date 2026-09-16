import Foundation
import PassKit
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

enum CheckoutConfigurationMapperError: LocalizedError, Equatable {
    case unsupportedValue(path: String, value: String)
    case unsupportedField(String)
    case missingMerchantIdentifier

    var errorDescription: String? {
        switch self {
        case .unsupportedValue(let path, let value):
            return "Unsupported Checkout configuration value `\(value)` for `\(path)`."
        case .unsupportedField(let field):
            return "The installed Stripe iOS SDK does not support setting `\(field)` for Checkout."
        case .missingMerchantIdentifier:
            return "Apple Pay requires `merchantIdentifier` in StripeProvider or initStripe."
        }
    }
}

@MainActor
enum CheckoutConfigurationMapper {
    static func map(
        params: NSDictionary,
        merchantIdentifier: String?,
        didSelectPaymentOption: @escaping () -> Void
    ) throws -> CheckoutController.Configuration {
        let clientSecret = params["clientSecret"] as? String ?? ""
        let returnURL = params["returnURL"] as? String ?? ""

        var configuration = CheckoutController.Configuration(
            clientSecret: clientSecret,
            returnURL: returnURL
        )
        configuration.merchantDisplayName = params["merchantDisplayName"] as? String
        if let style = params["style"] as? String {
            configuration.userInterfaceStyle = try mapUserInterfaceStyle(style)
        }

        let defaultsParams = params["defaults"] as? NSDictionary
        configuration.defaults = mapDefaults(defaultsParams)

        configuration.paymentElement = try mapPaymentElement(
            params["paymentElement"] as? NSDictionary,
            merchantIdentifier: merchantIdentifier,
            didSelectPaymentOption: didSelectPaymentOption
        )
        return configuration
    }

    private static func mapDefaults(
        _ params: NSDictionary?
    ) -> CheckoutController.Configuration.Defaults {
        var defaults = CheckoutController.Configuration.Defaults()

        if let billingParams = params?["billingDetails"] as? NSDictionary {
            var billingDetails = CheckoutController.Configuration.Defaults.BillingDetails()
            billingDetails.name = billingParams["name"] as? String
            billingDetails.address = mapAddress(billingParams["address"] as? NSDictionary)
            defaults.billingDetails = billingDetails
        }

        if let shippingParams = params?["shippingDetails"] as? NSDictionary {
            var shippingDetails = CheckoutController.Configuration.Defaults.ShippingDetails()
            shippingDetails.name = shippingParams["name"] as? String
            shippingDetails.address = mapAddress(shippingParams["address"] as? NSDictionary)
            defaults.shippingDetails = shippingDetails
        }

        defaults.email = params?["email"] as? String
        defaults.phone = params?["phone"] as? String

        return defaults
    }

    private static func mapAddress(
        _ params: NSDictionary?
    ) -> CheckoutController.Address? {
        guard let params else {
            return nil
        }
        return CheckoutController.Address(
            country: params["country"] as? String ?? "",
            line1: params["line1"] as? String,
            line2: params["line2"] as? String,
            city: params["city"] as? String,
            state: params["state"] as? String,
            postalCode: params["postalCode"] as? String
        )
    }

    private static func mapPaymentElement(
        _ params: NSDictionary?,
        merchantIdentifier: String?,
        didSelectPaymentOption: @escaping () -> Void
    ) throws -> PaymentElement.Configuration {
        var configuration = PaymentElement.Configuration()
        guard let params else {
            return configuration
        }

        try rejectUnsupportedFields(params, path: "paymentElement", fields: ["useAutocompleteEndpoints"])
        if let applePayParams = params["applePay"] as? NSDictionary {
            guard let merchantIdentifier, !merchantIdentifier.isEmpty else {
                throw CheckoutConfigurationMapperError.missingMerchantIdentifier
            }
            configuration.applePayConfiguration = PaymentElement.ApplePayConfiguration(
                merchantId: merchantIdentifier,
                buttonType: try mapApplePayButtonType(applePayParams["buttonType"] as? String)
            )
        }

        if let linkParams = params["link"] as? NSDictionary {
            var linkConfiguration = PaymentElement.LinkConfiguration()
            if let display = linkParams["display"] as? String {
                linkConfiguration.display = try mapLinkDisplay(display)
            }
            configuration.linkConfiguration = linkConfiguration
        }

        if let behavior = params["savePaymentMethodOptInBehavior"] as? String {
            configuration.savePaymentMethodOptInBehavior = try mapSavePaymentMethodOptInBehavior(behavior)
        }

        if let appearance = params["appearance"] as? NSDictionary {
            configuration.appearance = try PaymentSheetAppearance.buildAppearanceFromParams(
                userParams: appearance
            )
        }

        if let preferredNetworks = params["preferredNetworks"] as? [NSNumber] {
            configuration.preferredNetworks = try mapPreferredNetworks(preferredNetworks)
        }

        if let billingDetails = params["billingDetailsCollectionConfiguration"] as? NSDictionary {
            configuration.billingDetailsCollectionConfiguration = try mapBillingDetailsCollection(
                billingDetails,
                default: configuration.billingDetailsCollectionConfiguration
            )
        }
        configuration.removeSavedPaymentMethodMessage = params["removeSavedPaymentMethodMessage"] as? String
        configuration.paymentMethodOrder = params["paymentMethodOrder"] as? [String]
        if let opensCardScannerAutomatically = params["opensCardScannerAutomatically"] as? Bool {
            configuration.opensCardScannerAutomatically = opensCardScannerAutomatically
        }

        if let termsDisplay = params["termsDisplay"] as? [String: String] {
            configuration.termsDisplay = try mapTermsDisplay(termsDisplay)
        }

        if let paymentMethodLayout = params["paymentMethodLayout"] as? String {
            configuration.paymentMethodLayout = try mapPaymentMethodLayout(paymentMethodLayout)
        }
        if let displaysMandateText = params["displaysMandateText"] as? Bool {
            configuration.displaysMandateText = displaysMandateText
        }
        if let rowSelectionBehavior = params["rowSelectionBehavior"] as? NSDictionary {
            configuration.rowSelectionBehavior = try mapRowSelectionBehavior(
                rowSelectionBehavior,
                didSelectPaymentOption: didSelectPaymentOption
            )
        }

        return configuration
    }

    private static func mapBillingDetailsCollection(
        _ params: NSDictionary,
        default defaultConfiguration: PaymentElement.BillingDetailsCollectionConfiguration
    ) throws -> PaymentElement.BillingDetailsCollectionConfiguration {
        try rejectUnsupportedFields(
            params,
            path: "paymentElement.billingDetailsCollectionConfiguration",
            fields: ["name", "phone", "attachDefaultsToPaymentMethod"]
        )
        var configuration = defaultConfiguration
        if let address = params["address"] as? String {
            configuration.address = try mapAddressCollectionMode(address)
        }
        return configuration
    }

    private static func mapAddressCollectionMode(
        _ value: String
    ) throws -> PaymentElement.BillingDetailsCollectionConfiguration.AddressCollectionMode {
        switch value {
        case "automatic": return .automatic
        case "full": return .full
        default: throw unsupported(value, at: "paymentElement.billingDetailsCollectionConfiguration.address")
        }
    }

    private static func mapSavePaymentMethodOptInBehavior(
        _ value: String
    ) throws -> PaymentElement.SavePaymentMethodOptInBehavior {
        switch value {
        case "automatic": return .automatic
        case "requiresOptIn": return .requiresOptIn
        case "requiresOptOut": return .requiresOptOut
        default: throw unsupported(value, at: "paymentElement.savePaymentMethodOptInBehavior")
        }
    }

    private static func mapPaymentMethodLayout(
        _ value: String
    ) throws -> PaymentElement.PaymentMethodLayout {
        switch value {
        case "Horizontal": return .horizontal
        case "Vertical": return .vertical
        case "Automatic": return .automatic
        default: throw unsupported(value, at: "paymentElement.paymentMethodLayout")
        }
    }

    private static func mapRowSelectionBehavior(
        _ params: NSDictionary,
        didSelectPaymentOption: @escaping () -> Void
    ) throws -> PaymentElement.Configuration.RowSelectionBehavior {
        switch params["type"] as? String {
        case nil, "default": return .default
        case "immediateAction": return .immediateAction(didSelectPaymentOption: didSelectPaymentOption)
        case .some(let value): throw unsupported(value, at: "paymentElement.rowSelectionBehavior.type")
        }
    }

    private static func mapLinkDisplay(
        _ value: String
    ) throws -> PaymentElement.LinkConfiguration.Display {
        switch value {
        case "automatic": return .automatic
        case "never": return .never
        default: throw unsupported(value, at: "paymentElement.link.display")
        }
    }

    private static func mapApplePayButtonType(_ value: String?) throws -> PKPaymentButtonType? {
        guard let value else {
            return nil
        }
        let rawValue: Int = switch value {
        case "plain": 0
        case "buy": 1
        case "setUp": 2
        case "inStore": 3
        case "donate": 4
        case "checkout": 5
        case "book": 6
        case "subscribe": 7
        case "reload": 8
        case "addMoney": 9
        case "topUp": 10
        case "order": 11
        case "rent": 12
        case "support": 13
        case "contribute": 14
        case "tip": 15
        case "continue": 16
        default: throw unsupported(value, at: "paymentElement.applePay.buttonType")
        }
        return PKPaymentButtonType(rawValue: rawValue)
    }

    private static func mapPreferredNetworks(_ values: [NSNumber]) throws -> [STPCardBrand] {
        try values.map { value in
            guard let brand = Mappers.intToCardBrand(int: value.intValue) else {
                throw unsupported(String(value.intValue), at: "paymentElement.preferredNetworks")
            }
            return brand
        }
    }

    private static func mapTermsDisplay(
        _ values: [String: String]
    ) throws -> [STPPaymentMethodType: PaymentSheet.TermsDisplay] {
        try values.reduce(into: [:]) { result, item in
            let paymentMethodType = STPPaymentMethodType.fromIdentifier(item.key)
            guard paymentMethodType != .unknown else {
                throw unsupported(item.key, at: "paymentElement.termsDisplay")
            }
            switch item.value {
            case "automatic": result[paymentMethodType] = .automatic
            case "never": result[paymentMethodType] = .never
            default: throw unsupported(item.value, at: "paymentElement.termsDisplay.\(item.key)")
            }
        }
    }

    private static func mapUserInterfaceStyle(_ value: String) throws -> PaymentSheet.UserInterfaceStyle {
        switch value {
        case "alwaysLight": return .alwaysLight
        case "alwaysDark": return .alwaysDark
        case "automatic": return .automatic
        default: throw unsupported(value, at: "style")
        }
    }

    private static func rejectUnsupportedFields(_ params: NSDictionary, path: String, fields: [String]) throws {
        for field in fields {
            if let value = params[field], !(value is NSNull) {
                throw CheckoutConfigurationMapperError.unsupportedField("\(path).\(field)")
            }
        }
    }

    private static func unsupported(_ value: String, at path: String) -> CheckoutConfigurationMapperError {
        .unsupportedValue(path: path, value: value)
    }
}
