import Foundation
import React
@testable import stripe_react_native
@_spi(STP) import StripeCore
@_spi(STP) @_spi(InternalOnlyAPI) import StripePayments
@_spi(CardFundingFilteringPrivatePreview) import StripePaymentSheet

/// One runner per bridge method. Each calls the production mapper with the
/// fixture input and returns the objects the assertion keys resolve against.
@MainActor
enum BridgeRunners {
    typealias Runner = (BridgeFixture) throws -> BridgeObservation

    static let forMethod: [String: Runner] = [
        coreAndConfirmRunners,
        paymentSheetAndEmbeddedRunners,
        customerSheetAndPlatformPayRunners,
        checkoutAndVerticalRunners,
        componentRunners,
    ].reduce(into: [:]) { all, runners in all.merge(runners) { first, _ in first } }

    private static let coreAndConfirmRunners: [String: Runner] = [
        "StripeSdk.initialise": initialise,
        "StripeSdk.createPaymentMethod": createPaymentMethod,
        "StripeSdk.confirmPayment": confirmPayment,
        "StripeSdk.confirmSetupIntent": confirmSetupIntent,
        "StripeSdk.createToken": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            return moduleResult { sdk, resolution in
                sdk.createToken(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
        "StripeSdk.verifyMicrodeposits": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            let clientSecret = try require(fixture.string("clientSecret"), "clientSecret")
            return moduleResult { sdk, resolution in
                sdk.verifyMicrodeposits(
                    isPaymentIntent: fixture.bool("isPaymentIntent"),
                    clientSecret: clientSecret as NSString,
                    params: params,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
        },
        "StripeSdk.collectBankAccount": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            let clientSecret = try require(fixture.string("clientSecret"), "clientSecret")
            return moduleResult { sdk, resolution in
                sdk.collectBankAccount(
                    isPaymentIntent: fixture.bool("isPaymentIntent"),
                    clientSecret: clientSecret as NSString,
                    params: params,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
        },
    ]

    struct MissingInput: Error { let name: String }

    static func require<T>(_ value: T?, _ name: String) throws -> T {
        guard let value else { throw MissingInput(name: name) }
        return value
    }

    /// Calls a StripeSdkImpl method that resolves before any network call.
    static func moduleResult(_ call: (StripeSdkImpl, Resolution) -> Void) -> BridgeObservation {
        let resolution = Resolution()
        call(StripeSdkImpl(), resolution)
        return BridgeObservation(roots: ["result": resolution.result])
    }

    static func paymentMethodType(_ params: NSDictionary) throws -> STPPaymentMethodType {
        try require(Mappers.mapToPaymentMethodType(type: params["paymentMethodType"] as? String), "paymentMethodType")
    }

    private static func createPaymentMethod(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let params = try require(fixture.dictionary("params"), "params")
        let options = try require(fixture.dictionary("options"), "options")
        let factory = PaymentMethodFactory(
            paymentMethodData: params["paymentMethodData"] as? NSDictionary,
            options: options,
            cardFieldView: nil,
            cardFormView: nil
        )
        do {
            let paymentMethodParams = try require(try factory.createParams(paymentMethodType: paymentMethodType(params)), "paymentMethodParams")
            return BridgeObservation(roots: ["api": STPFormEncoder.dictionary(forObject: paymentMethodParams)])
        } catch is PaymentMethodError {
            return moduleResult { sdk, resolution in
                sdk.createPaymentMethod(params: params, options: options, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        }
    }

    private static func confirmPayment(_ fixture: BridgeFixture) throws -> BridgeObservation {
        // initStripe stores the urlScheme the return URL is built from.
        let sdk = StripeSdkImpl()
        sdk.urlScheme = "bridgecontracts"
        let params = fixture.dictionary("params")
        let (missingTypeError, type) = sdk.getPaymentMethodType(params: params)
        let (error, intentParams) = sdk.createPaymentIntentParams(
            paymentIntentClientSecret: try require(fixture.string("paymentIntentClientSecret"), "paymentIntentClientSecret"),
            paymentMethodType: type,
            paymentMethodData: params?["paymentMethodData"] as? NSDictionary,
            options: try require(fixture.dictionary("options"), "options")
        )
        return BridgeObservation(roots: [
            "api": STPFormEncoder.dictionary(forObject: intentParams),
            "result": missingTypeError ?? error,
        ])
    }

    private static func confirmSetupIntent(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let params = try require(fixture.dictionary("params"), "params")
        // initStripe stores the urlScheme the return URL is built from.
        let sdk = StripeSdkImpl()
        sdk.urlScheme = "bridgecontracts"
        let (error, confirmParams) = sdk.createSetupIntentParams(
            setupIntentClientSecret: try require(fixture.string("paymentIntentClientSecret"), "paymentIntentClientSecret"),
            paymentMethodType: try paymentMethodType(params),
            paymentMethodData: params["paymentMethodData"] as? NSDictionary,
            options: try require(fixture.dictionary("options"), "options")
        )
        return BridgeObservation(roots: [
            "api": STPFormEncoder.dictionary(forObject: confirmParams),
            "result": error,
        ])
    }

    /// Captures what a resolve block receives; `nil` until it is called.
    final class Resolution {
        private(set) var called = false
        private(set) var value: Any?
        // Weak, not unowned: runners that read `result` without `wait()` drop the
        // Resolution while the SDK call is still in flight, and the late callback
        // then fires during whichever test is spinning the main run loop.
        lazy var resolve: RCTPromiseResolveBlock = { [weak self] value in
            self?.called = true
            self?.value = value
        }
        lazy var reject: RCTPromiseRejectBlock = { [weak self] code, message, _ in
            self?.called = true
            self?.value = ["rejected": ["code": code as Any, "message": message as Any]] as NSDictionary
        }
        var result: Any? { called ? value : "<unresolved>" }

        /// Spins the main run loop until the resolve block runs, for methods
        /// that resolve from DispatchQueue.main.async or a Task.
        func wait(timeout: TimeInterval = 5) -> Self {
            let deadline = Date().addingTimeInterval(timeout)
            while !called && Date() < deadline {
                RunLoop.main.run(until: Date().addingTimeInterval(0.01))
            }
            return self
        }
    }

    private static let paymentSheetAndEmbeddedRunners: [String: Runner] = [
        "StripeSdk.initPaymentSheet": initPaymentSheet,
        "StripeSdk.presentPaymentSheet": { fixture in
            let options = try require(fixture.dictionary("options"), "options")
            let resolution = Resolution()
            StripeSdkImpl().presentPaymentSheet(options: options, resolver: resolution.resolve, rejecter: resolution.reject)
            return BridgeObservation(roots: ["result": resolution.wait().result])
        },
        "StripeSdk.intentCreationCallback": { fixture in
            let result = try require(fixture.dictionary("result"), "result")
            return moduleResult { sdk, resolution in
                sdk.intentCreationCallback(result: result, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
        "StripeSdk.confirmationTokenCreationCallback": { fixture in
            let result = try require(fixture.dictionary("result"), "result")
            return moduleResult { sdk, resolution in
                sdk.confirmationTokenCreationCallback(result: result, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
        "StripeSdk.customPaymentMethodResultCallback": { fixture in
            let result = try require(fixture.dictionary("result"), "result")
            return moduleResult { sdk, resolution in
                sdk.customPaymentMethodResultCallback(result: result, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
        "StripeSdk.createEmbeddedPaymentElement": createEmbeddedPaymentElement,
        "StripeSdk.updateEmbeddedPaymentElement": updateEmbeddedPaymentElement,
    ]

    private static func intentConfiguration(_ sdk: StripeSdkImpl, _ params: NSDictionary?) -> Any? {
        guard let params else { return nil }
        switch sdk.buildIntentConfiguration(intentConfigurationParams: params) {
        case .success(let intentConfiguration): return intentConfiguration
        case .failure(let error): return ["error": error.message] as NSDictionary
        }
    }

    private static func initPaymentSheet(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let sdk = StripeSdkImpl()
        let params = try require(fixture.dictionary("params"), "params")
        let (_, configuration) = sdk.buildPaymentSheetConfiguration(params: params)
        let resolution = Resolution()
        sdk.initPaymentSheet(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
        return BridgeObservation(
            roots: [
                "result": resolution.result,
                "configuration": configuration,
                // Configuration.style is computed from a private styleRawValue.
                "style": configuration.map { "\($0.style)" },
                // A closure on iOS; Android stores the details.
                "shippingDetails": configuration?.shippingDetails(),
                "preferredNetworks": configuration?.preferredNetworks?.map(cardBrandName),
                "allowedCardFundingTypes": configuration.map(cardFundingTypeNames),
                "termsDisplay": configuration.map(termsDisplayByCode),
                "intentConfiguration": intentConfiguration(sdk, params["intentConfiguration"] as? NSDictionary),
                "sheet": sdk.paymentSheet,
            ],
            aliases: customerAliases.merging([
                "sheet.paymentIntentClientSecret": "sheet.mode.paymentIntentClientSecret",
                "configuration.style": "style",
                "configuration.shippingDetails": "shippingDetails",
                "configuration.preferredNetworks": "preferredNetworks",
                "configuration.allowedCardFundingTypes": "allowedCardFundingTypes",
                "configuration.termsDisplay": "termsDisplay",
            ]) { first, _ in first }
        )
    }

    /// STPCardBrand is an Objective-C enum, so it has no readable case name.
    static func cardBrandName(_ brand: STPCardBrand) -> String {
        switch brand {
        case .visa: return "visa"
        case .amex: return "americanExpress"
        case .mastercard: return "masterCard"
        case .discover: return "discover"
        case .JCB: return "jcb"
        case .dinersClub: return "dinersClub"
        case .unionPay: return "unionPay"
        case .cartesBancaires: return "cartesBancaires"
        default: return "unknown"
        }
    }

    /// CardFundingType is an OptionSet; list its members in Android's order.
    private static func cardFundingTypeNames(_ configuration: PaymentSheet.Configuration) -> [String] {
        let types: [(PaymentSheet.CardFundingType, String)] = [
            (.debit, "debit"), (.credit, "credit"), (.prepaid, "prepaid"), (.unknown, "unknown"),
        ]
        return types.filter { configuration.allowedCardFundingTypes.contains($0.0) }.map { $0.1 }
    }

    private static func termsDisplayByCode(_ configuration: PaymentSheet.Configuration) -> NSDictionary {
        var result: [String: Any] = [:]
        for (type, display) in configuration.termsDisplay {
            result[STPPaymentMethod.string(from: type) ?? "\(type.rawValue)"] = display
        }
        return result as NSDictionary
    }

    private static let customerAliases = [
        "configuration.customer.ephemeralKeySecret": "configuration.customer.customerAccessProvider.legacyCustomerEphemeralKey",
    ]

    private static func createEmbeddedPaymentElement(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let sdk = StripeSdkImpl()
        let configurationParams = try require(fixture.dictionary("configuration"), "configuration")
        let intentConfigParams = try require(fixture.dictionary("intentConfig"), "intentConfig")
        let (_, configuration) = sdk.buildEmbeddedPaymentElementConfiguration(params: configurationParams)
        let intent = intentConfiguration(sdk, intentConfigParams)
        var roots: [String: Any?] = ["configuration": configuration, "intentConfiguration": intent]
        // createEmbeddedPaymentElement fails before EmbeddedPaymentElement.create
        // (network) when either parse fails, so call it only in that case.
        if intent is NSDictionary || configuration == nil {
            let emitter = BridgeRecordingEmitter()
            sdk.emitter = emitter
            let resolution = Resolution()
            sdk.createEmbeddedPaymentElement(
                intentConfig: intentConfigParams,
                configuration: configurationParams,
                resolve: resolution.resolve,
                reject: resolution.reject
            )
            roots["result"] = resolution.result
            roots["events"] = emitter.events as NSDictionary
        }
        return BridgeObservation(roots: roots, aliases: customerAliases)
    }

    private static func updateEmbeddedPaymentElement(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let sdk = StripeSdkImpl()
        let intentConfig = try require(fixture.dictionary("intentConfig"), "intentConfig")
        let resolution = Resolution()
        sdk.updateEmbeddedPaymentElement(intentConfig: intentConfig, resolve: resolution.resolve, reject: resolution.reject)
        return BridgeObservation(roots: [
            "result": resolution.wait().result,
            "intentConfiguration": intentConfiguration(sdk, intentConfig),
        ])
    }

    private static func initialise(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let client = STPAPIClient.shared
        let settings = STPPaymentHandler.shared().threeDSCustomizationSettings
        let saved = (client.publishableKey, client.stripeAccount, client.appInfo, StripeAPI.defaultPublishableKey, settings.uiCustomization)
        defer {
            client.publishableKey = saved.0
            client.stripeAccount = saved.1
            client.appInfo = saved.2
            StripeAPI.defaultPublishableKey = saved.3
            settings.uiCustomization = saved.4
        }

        let sdk = StripeSdkImpl()
        let resolution = Resolution()
        sdk.initialise(params: try require(fixture.dictionary("params"), "params"), resolver: resolution.resolve, rejecter: resolution.reject)

        return BridgeObservation(
            roots: [
                "result": resolution.result,
                "apiClient": [
                    "publishableKey": client.publishableKey as Any,
                    "stripeAccount": client.stripeAccount as Any,
                    "appInfo": client.appInfo as Any,
                ] as NSDictionary,
                "sdk": sdk,
                "threeDS": [
                    "uiCustomization": settings.uiCustomization,
                    "authenticationTimeout": settings.authenticationTimeout,
                ] as NSDictionary,
            ],
            aliases: [
                "threeDS.timeout": "threeDS.authenticationTimeout",
                "threeDS.backgroundColor": "threeDS.uiCustomization.backgroundColor",
                "threeDS.label": "threeDS.uiCustomization.labelCustomization",
                "threeDS.label.headingFontSize": "threeDS.uiCustomization.labelCustomization.headingFont.pointSize",
                "threeDS.label.textFontSize": "threeDS.uiCustomization.labelCustomization.font.pointSize",
                "threeDS.navigationBar": "threeDS.uiCustomization.navigationBarCustomization",
                "threeDS.textField": "threeDS.uiCustomization.textFieldCustomization",
                "threeDS.textField.borderRadius": "threeDS.uiCustomization.textFieldCustomization.cornerRadius",
            ]
        )
    }
}
