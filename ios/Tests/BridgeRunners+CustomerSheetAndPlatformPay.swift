import Foundation
import PassKit
import React
@testable import stripe_react_native
@_spi(STP) import StripeCore
@_spi(STP) import StripePayments
@_spi(PrivateBetaCustomerSheet) @_spi(STP) import StripePaymentSheet

extension BridgeRunners {
    static let customerSheetAndPlatformPayRunners: [String: Runner] = [
        "StripeSdk.initCustomerSheet": initCustomerSheet,
        "StripeSdk.presentCustomerSheet": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            // The styles land on the host app's presenter, so they are put back afterwards.
            let presenter = findViewControllerPresenter(from: RCTKeyWindow()?.rootViewController ?? UIViewController())
            let saved = (presenter.modalPresentationStyle, presenter.modalTransitionStyle)
            defer { (presenter.modalPresentationStyle, presenter.modalTransitionStyle) = saved }
            return withPublishableKey {
                let resolution = Resolution()
                let sdk = StripeSdkImpl()
                var scheduledWithoutSheet = 0
                sdk.scheduleOnMain = { _, _ in scheduledWithoutSheet += 1 }
                sdk.presentCustomerSheet(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
                let result = resolution.wait().result
                let styled = sdk.customerSheetViewController
                var timeout = presentedSheetTimeout(params)
                timeout["withoutSheet"] = scheduledWithoutSheet
                return BridgeObservation(roots: [
                    "result": result,
                    "presenter": [
                        "presentationStyle": styled.flatMap { presentationStyleNames[$0.modalPresentationStyle] } as Any,
                        "animationStyle": styled.flatMap { transitionStyleNames[$0.modalTransitionStyle] } as Any,
                    ] as NSDictionary,
                    "timeout": timeout as NSDictionary,
                ])
            }
        },
        "StripeSdk.customerAdapterFetchPaymentMethodsCallback": { fixture in
            let paymentMethods = try require(fixture.array("paymentMethods") as? [NSDictionary], "paymentMethods")
            let sdk = StripeSdkImpl()
            var delivered: [STPPaymentMethod]?
            // A non-empty list stands for an adapter call that is waiting for it.
            if !paymentMethods.isEmpty {
                sdk.fetchPaymentMethodsCallback = { delivered = $0 }
            }
            let resolution = Resolution()
            sdk.customerAdapterFetchPaymentMethodsCallback(
                paymentMethods: paymentMethods,
                resolver: resolution.resolve,
                rejecter: resolution.reject
            )
            return BridgeObservation(
                roots: ["result": resolution.result, "delivered": delivered.map { $0 as NSArray }],
                aliases: ["delivered.0.id": "delivered.0.stripeId"]
            )
        },
        "StripeSdk.customerAdapterAttachPaymentMethodCallback": { fixture in
            let paymentMethod = try require(fixture.dictionary("paymentMethod"), "paymentMethod")
            let sdk = StripeSdkImpl()
            var delivered = false
            sdk.attachPaymentMethodCallback = { delivered = true }
            let resolution = Resolution()
            sdk.customerAdapterAttachPaymentMethodCallback(
                unusedPaymentMethod: paymentMethod,
                resolver: resolution.resolve,
                rejecter: resolution.reject
            )
            return BridgeObservation(roots: ["result": resolution.result, "delivered": delivered])
        },
        "StripeSdk.customerAdapterDetachPaymentMethodCallback": { fixture in
            let paymentMethod = try require(fixture.dictionary("paymentMethod"), "paymentMethod")
            let sdk = StripeSdkImpl()
            var delivered = false
            sdk.detachPaymentMethodCallback = { delivered = true }
            let resolution = Resolution()
            sdk.customerAdapterDetachPaymentMethodCallback(
                unusedPaymentMethod: paymentMethod,
                resolver: resolution.resolve,
                rejecter: resolution.reject
            )
            return BridgeObservation(roots: ["result": resolution.result, "delivered": delivered])
        },
        "StripeSdk.clientSecretProviderCustomerSessionClientSecretCallback": { fixture in
            let answer = try require(fixture.dictionary("customerSessionClientSecret"), "customerSessionClientSecret")
            return moduleResult { sdk, resolution in
                sdk.clientSecretProviderCustomerSessionClientSecretCallback(
                    customerSessionClientSecretDict: answer,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
        },
        "StripeSdk.isPlatformPaySupported": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            return moduleResult { sdk, resolution in
                sdk.isPlatformPaySupported(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
        "StripeSdk.createPlatformPayPaymentMethod": applePayRequest,
        "StripeSdk.confirmPlatformPay": applePayRequest,
        "StripeSdk.updatePlatformPaySheet": updatePlatformPaySheet,
    ]

    /// Synthetic PassKit merchant id for runners that only need an authorization
    /// controller. Platform Pay fixtures assert the identifier `initialise` stores.
    static let merchantIdentifier = "merchant.com.stripe.bridgecontracts"

    static func withPublishableKey<T>(_ run: () throws -> T) rethrows -> T {
        let client = STPAPIClient.shared
        let saved = client.publishableKey
        client.publishableKey = "pk_test_bridge_contracts"
        defer { client.publishableKey = saved }
        return try run()
    }

    /// presentCustomerSheet with a sheet initialised: the delay the module schedules the timeout
    /// with, and what it resolves when that work runs while the sheet is up. The sheet loads
    /// through the failing API, and the runner waits for UIKit to finish dismissing it.
    private static func presentedSheetTimeout(_ params: NSDictionary) -> [String: Any] {
        withFailingStripeAPI {
            let sdk = StripeSdkImpl()
            sdk.customerSheet = CustomerSheet(
                configuration: CustomerSheet.Configuration(),
                customer: StripeCustomerAdapter(customerEphemeralKeyProvider: {
                    CustomerEphemeralKey(customerId: "cus_bridge_contracts", ephemeralKeySecret: "ek_test_bridge_contracts")
                })
            )
            var scheduled: (delay: TimeInterval, work: () -> Void)?
            sdk.scheduleOnMain = { scheduled = ($0, $1) }
            let resolution = Resolution()
            sdk.presentCustomerSheet(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
            spinMainRunLoop {
                guard scheduled != nil, let presented = sdk.customerSheetViewController?.presentedViewController else {
                    return false
                }
                return !presented.isBeingPresented
            }
            scheduled?.work()
            let result = resolution.result
            spinMainRunLoop { sdk.customerSheetViewController?.presentedViewController == nil }
            return [
                "scheduledMillis": scheduled.map { Int(($0.delay * 1000).rounded()) } as Any,
                "result": result as Any,
            ]
        }
    }

    private static func spinMainRunLoop(until done: () -> Bool) {
        let deadline = Date().addingTimeInterval(5)
        while !done() && Date() < deadline {
            RunLoop.main.run(until: Date().addingTimeInterval(0.01))
        }
    }

    /// The prop names CustomerSheetUtils maps from.
    private static let presentationStyleNames: [UIModalPresentationStyle: String] = [
        .fullScreen: "fullscreen", .pageSheet: "pageSheet", .formSheet: "formSheet",
        .automatic: "automatic", .overFullScreen: "overFullScreen", .popover: "popover",
    ]
    private static let transitionStyleNames: [UIModalTransitionStyle: String] = [
        .flipHorizontal: "flip", .partialCurl: "curl", .crossDissolve: "dissolve", .coverVertical: "slide",
    ]

    private static func initCustomerSheet(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let sdk = StripeSdkImpl()
        let resolution = Resolution()
        sdk.initCustomerSheet(
            params: try require(fixture.dictionary("params"), "params"),
            customerAdapterOverrides: try require(fixture.dictionary("customerAdapterOverrides"), "customerAdapterOverrides"),
            resolver: resolution.resolve,
            rejecter: resolution.reject
        )
        let configuration = sdk.customerSheetConfiguration
        return BridgeObservation(
            roots: [
                "result": resolution.result,
                "configuration": configuration,
                // CustomerSheet.Configuration.style is computed from a private styleRawValue.
                "style": "\(configuration.style)",
                "preferredNetworks": configuration.preferredNetworks?.map(cardBrandName),
                "customerAdapter": sdk.customerAdapter,
                "customerSheet": sdk.customerSheet,
            ],
            aliases: [
                "configuration.style": "style",
                "configuration.preferredNetworks": "preferredNetworks",
                "intentConfiguration": "customerSheet.customerSheetIntentConfiguration",
            ]
        )
    }

    /// Both Platform Pay entry points build the PKPaymentRequest the same way before presenting a sheet.
    /// The merchant identifier is the one `initialise` stored, which is what production passes.
    private static func applePayRequest(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let applePay = try require(fixture.dictionary("params")?["applePay"] as? NSDictionary, "params.applePay")
        let client = STPAPIClient.shared
        let saved = (client.publishableKey, client.stripeAccount, client.appInfo, StripeAPI.defaultPublishableKey)
        defer {
            client.publishableKey = saved.0
            client.stripeAccount = saved.1
            client.appInfo = saved.2
            StripeAPI.defaultPublishableKey = saved.3
        }
        let sdk = StripeSdkImpl()
        let resolution = Resolution()
        sdk.initialise(params: [
            "publishableKey": "pk_test_bridge_contracts",
            "merchantIdentifier": "merchant.com.stripe.bridge",
            "appInfo": ["name": "bridge-contracts"],
        ], resolver: resolution.resolve, rejecter: resolution.reject)
        let (error, request) = ApplePayUtils.createPaymentRequest(
            merchantIdentifier: sdk.merchantIdentifier,
            params: applePay
        )
        return BridgeObservation(roots: ["applePayRequest": request, "result": error])
    }

    private static func updatePlatformPaySheet(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let sdk = StripeSdkImpl()
        let shippingMethods = fixture.array("shippingMethods") ?? []
        var update: PKPaymentRequestShippingMethodUpdate?
        // A fixture with shipping methods stands for a pending shipping-method change.
        if shippingMethods.count > 0 {
            sdk.shippingMethodUpdateCompletion = { update = $0 }
        }
        let resolution = Resolution()
        sdk.updatePlatformPaySheet(
            summaryItems: fixture.array("summaryItems") ?? [],
            shippingMethods: shippingMethods,
            errors: fixture.array("errors") as? [NSDictionary] ?? [],
            resolver: resolution.resolve,
            rejecter: resolution.reject
        )
        return BridgeObservation(roots: [
            "result": resolution.result,
            "summaryItems": sdk.applePaySummaryItems,
            "shippingMethods": sdk.applePayShippingMethods,
            "shippingMethodUpdate": update,
        ])
    }
}
