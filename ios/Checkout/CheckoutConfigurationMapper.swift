import Foundation
import PassKit
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

enum CheckoutConfigurationMapperError: LocalizedError, Equatable {
    case missingRequiredString(String)
    case missingAddressCountry(String)
    case missingMerchantIdentifier

    var errorDescription: String? {
        switch self {
        case .missingRequiredString(let name):
            return "Checkout configuration requires `\(name)`."
        case .missingAddressCountry(let path):
            return "Checkout configuration requires `\(path).country` when an address is provided."
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
    ) throws -> Checkout.Configuration {
        guard let clientSecret = nonEmptyString(params["clientSecret"]) else {
            throw CheckoutConfigurationMapperError.missingRequiredString("clientSecret")
        }
        guard let returnURL = nonEmptyString(params["returnURL"]) else {
            throw CheckoutConfigurationMapperError.missingRequiredString("returnURL")
        }

        var configuration = Checkout.Configuration(
            clientSecret: clientSecret,
            returnURL: returnURL
        )
        configuration.merchantDisplayName = params["merchantDisplayName"] as? String
        configuration.userInterfaceStyle = Mappers.mapToUserInterfaceStyle(params["style"] as? String)

        let defaultsParams = params["defaults"] as? NSDictionary
        configuration.defaults = try mapDefaults(defaultsParams)

        let paymentElementParams = params["paymentElement"] as? NSDictionary
        configuration.paymentElement = try mapPaymentElement(
            paymentElementParams,
            didSelectPaymentOption: didSelectPaymentOption
        )

        let applePayParams = paymentElementParams?["applePay"] as? NSDictionary
        if let applePayParams {
            guard nonEmptyString(applePayParams["merchantCountryCode"]) != nil else {
                throw CheckoutConfigurationMapperError.missingRequiredString(
                    "paymentElement.applePay.merchantCountryCode"
                )
            }
            guard let merchantIdentifier = nonEmptyString(merchantIdentifier) else {
                throw CheckoutConfigurationMapperError.missingMerchantIdentifier
            }
            configuration.applePayConfiguration = Checkout.ApplePayConfiguration(
                merchantId: merchantIdentifier,
                buttonType: mapApplePayButtonType(applePayParams["buttonType"] as? String)
            )
            // TODO(porter): Pass merchantCountryCode when the reviewed native setter ships.
            // configuration.applePayConfiguration?.merchantCountryCode =
            //     applePayParams["merchantCountryCode"] as? String
        }

        if let linkParams = paymentElementParams?["link"] as? NSDictionary {
            configuration.linkConfiguration = Checkout.LinkConfiguration(
                display: mapLinkDisplay(linkParams["display"] as? String)
            )
        }

        return configuration
    }

    private static func mapDefaults(
        _ params: NSDictionary?
    ) throws -> Checkout.Configuration.Defaults {
        var defaults = Checkout.Configuration.Defaults()

        if let billingParams = params?["billingDetails"] as? NSDictionary {
            var billingDetails = Checkout.Configuration.Defaults.BillingDetails()
            billingDetails.name = billingParams["name"] as? String
            billingDetails.address = try mapAddress(
                billingParams["address"] as? NSDictionary,
                path: "defaults.billingDetails.address"
            )
            defaults.billingDetails = billingDetails
        }

        if let shippingParams = params?["shippingDetails"] as? NSDictionary {
            var shippingDetails = Checkout.Configuration.Defaults.ShippingDetails()
            shippingDetails.name = shippingParams["name"] as? String
            shippingDetails.address = try mapAddress(
                shippingParams["address"] as? NSDictionary,
                path: "defaults.shippingDetails.address"
            )
            defaults.shippingDetails = shippingDetails
        }

        // TODO(porter): Uncomment when the reviewed native setters ship.
        // defaults.email = params?["email"] as? String
        // defaults.phone = params?["phone"] as? String

        return defaults
    }

    private static func mapAddress(
        _ params: NSDictionary?,
        path: String
    ) throws -> Checkout.Address? {
        guard let params else {
            return nil
        }
        guard let country = nonEmptyString(params["country"]) else {
            throw CheckoutConfigurationMapperError.missingAddressCountry(path)
        }

        return Checkout.Address(
            country: country,
            line1: params["line1"] as? String,
            line2: params["line2"] as? String,
            city: params["city"] as? String,
            state: params["state"] as? String,
            postalCode: params["postalCode"] as? String
        )
    }

    private static func mapPaymentElement(
        _ params: NSDictionary?,
        didSelectPaymentOption: @escaping () -> Void
    ) throws -> PaymentElement.Configuration {
        var configuration = PaymentElement.Configuration()
        guard let params else {
            return configuration
        }

        configuration.savePaymentMethodOptInBehavior = mapSavePaymentMethodOptInBehavior(
            params["savePaymentMethodOptInBehavior"] as? String
        )

        if let appearance = params["appearance"] as? NSDictionary {
            configuration.appearance = try PaymentSheetAppearance.buildAppearanceFromParams(
                userParams: appearance
            )
        }

        if let preferredNetworks = params["preferredNetworks"] as? [NSNumber] {
            configuration.preferredNetworks = preferredNetworks.compactMap {
                Mappers.intToCardBrand(int: $0.intValue)
            }
        }

        configuration.billingDetailsCollectionConfiguration = mapBillingDetailsCollection(
            params["billingDetailsCollectionConfiguration"] as? NSDictionary,
            default: configuration.billingDetailsCollectionConfiguration
        )
        configuration.removeSavedPaymentMethodMessage = params["removeSavedPaymentMethodMessage"] as? String
        configuration.paymentMethodOrder = params["paymentMethodOrder"] as? [String]
        configuration.opensCardScannerAutomatically = params["opensCardScannerAutomatically"] as? Bool ?? false

        if let termsDisplay = StripeSdkImpl.mapToTermsDisplay(params: params) {
            configuration.termsDisplay = termsDisplay
        }

        configuration.paymentMethodLayout = mapPaymentMethodLayout(
            params["paymentMethodLayout"] as? String
        )
        configuration.displaysMandateText = params["displaysMandateText"] as? Bool ?? false
        configuration.rowSelectionBehavior = mapRowSelectionBehavior(
            params["rowSelectionBehavior"] as? NSDictionary,
            didSelectPaymentOption: didSelectPaymentOption
        )

        return configuration
    }

    private static func mapBillingDetailsCollection(
        _ params: NSDictionary?,
        default defaultConfiguration: PaymentElement.BillingDetailsCollectionConfiguration
    ) -> PaymentElement.BillingDetailsCollectionConfiguration {
        var configuration = defaultConfiguration
        configuration.name = mapCollectionMode(params?["name"] as? String)
        configuration.phone = mapCollectionMode(params?["phone"] as? String)
        configuration.address = mapAddressCollectionMode(params?["address"] as? String)
        configuration.attachDefaultsToPaymentMethod =
            params?["attachDefaultsToPaymentMethod"] as? Bool ?? false
        return configuration
    }

    private static func mapCollectionMode(
        _ value: String?
    ) -> PaymentElement.BillingDetailsCollectionConfiguration.CollectionMode {
        value == "always" ? .always : .automatic
    }

    private static func mapAddressCollectionMode(
        _ value: String?
    ) -> PaymentElement.BillingDetailsCollectionConfiguration.AddressCollectionMode {
        value == "full" ? .full : .automatic
    }

    private static func mapSavePaymentMethodOptInBehavior(
        _ value: String?
    ) -> PaymentElement.SavePaymentMethodOptInBehavior {
        switch value {
        case "requiresOptIn": return .requiresOptIn
        case "requiresOptOut": return .requiresOptOut
        default: return .automatic
        }
    }

    private static func mapPaymentMethodLayout(
        _ value: String?
    ) -> PaymentElement.PaymentMethodLayout {
        switch value {
        case "Horizontal": return .horizontal
        case "Vertical": return .vertical
        default: return .automatic
        }
    }

    private static func mapRowSelectionBehavior(
        _ params: NSDictionary?,
        didSelectPaymentOption: @escaping () -> Void
    ) -> PaymentElement.Configuration.RowSelectionBehavior {
        if params?["type"] as? String == "immediateAction" {
            return .immediateAction(didSelectPaymentOption: didSelectPaymentOption)
        }
        return .default
    }

    private static func mapLinkDisplay(
        _ value: String?
    ) -> Checkout.LinkConfiguration.Display {
        value == "never" ? .never : .automatic
    }

    private static func mapApplePayButtonType(_ value: String?) -> PKPaymentButtonType? {
        let rawValue: Int? = switch value {
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
        default: nil
        }
        return rawValue.flatMap(PKPaymentButtonType.init(rawValue:))
    }

    private static func nonEmptyString(_ value: Any?) -> String? {
        guard let value = value as? String, !value.isEmpty else {
            return nil
        }
        return value
    }
}
