import Foundation
@_spi(CheckoutSessionsPreview) import StripePaymentSheet

internal struct CheckoutAddressOverride: Equatable {
    let country: String
    let line1: String?
    let line2: String?
    let city: String?
    let state: String?
    let postalCode: String?
    let name: String?
    let phone: String?

    init(
        country: String,
        line1: String? = nil,
        line2: String? = nil,
        city: String? = nil,
        state: String? = nil,
        postalCode: String? = nil,
        name: String? = nil,
        phone: String? = nil
    ) {
        self.country = country
        self.line1 = line1
        self.line2 = line2
        self.city = city
        self.state = state
        self.postalCode = postalCode
        self.name = name
        self.phone = phone
    }

    init?(address: NSDictionary, name: String?, phone: String?) {
        guard let country = address["country"] as? String, !country.isEmpty else {
            return nil
        }

        self.init(
            country: country,
            line1: address["line1"] as? String,
            line2: address["line2"] as? String,
            city: address["city"] as? String,
            state: address["state"] as? String,
            postalCode: address["postalCode"] as? String,
            name: name,
            phone: phone
        )
    }

    var paymentSheetAddress: PaymentSheet.Address {
        PaymentSheet.Address(
            city: city,
            country: country,
            line1: line1,
            line2: line2,
            postalCode: postalCode,
            state: state
        )
    }

    var reactNativeValue: NSDictionary {
        let result = NSMutableDictionary()
        result["address"] = addressValue

        if let name {
            result["name"] = name
        }

        if let phone {
            result["phone"] = phone
        }

        return result
    }

    func shippingDetailsParams(isCheckboxSelected: Bool?) -> NSDictionary {
        let result = NSMutableDictionary(dictionary: reactNativeValue)

        if let isCheckboxSelected {
            result["isCheckboxSelected"] = isCheckboxSelected
        }

        return result
    }

    private var addressValue: NSDictionary {
        let result = NSMutableDictionary()
        result["country"] = country

        if let line1 {
            result["line1"] = line1
        }
        if let line2 {
            result["line2"] = line2
        }
        if let city {
            result["city"] = city
        }
        if let state {
            result["state"] = state
        }
        if let postalCode {
            result["postalCode"] = postalCode
        }

        return result
    }
}

internal struct CheckoutLocalOverrides: Equatable {
    var billingAddress: CheckoutAddressOverride?
    var shippingAddress: CheckoutAddressOverride?

    init(
        billingAddress: CheckoutAddressOverride? = nil,
        shippingAddress: CheckoutAddressOverride? = nil
    ) {
        self.billingAddress = billingAddress
        self.shippingAddress = shippingAddress
    }
}

extension StripeSdkImpl {
    internal func checkoutUnsupportedOperationMessage(for operation: String) -> String {
        "\(operation) is not yet supported on iOS. TODO(porter): wire this through once the Stripe iOS SDK adds the required Checkout update API."
    }

    internal func currentCheckoutStateResult(sessionKey: String, checkout: Checkout) -> NSDictionary {
        Mappers.mapFromCheckoutState(
            checkout.state,
            localOverrides: checkoutLocalOverrides[sessionKey]
        )
    }

    @objc(initCheckoutSession:configuration:resolver:rejecter:)
    public func initCheckoutSession(
        clientSecret: String,
        configuration: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let checkoutConfiguration = buildCheckoutConfiguration(params: configuration)

        Task { @MainActor [weak self] in
            guard let self else {
                reject(ErrorType.Failed, "Stripe SDK is unavailable", nil)
                return
            }

            do {
                let checkout = try await Checkout(
                    clientSecret: clientSecret,
                    configuration: checkoutConfiguration
                )
                let sessionKey = UUID().uuidString

                self.checkoutInstances[sessionKey] = checkout
                self.checkoutClientSecrets[sessionKey] = clientSecret
                self.checkoutConfigurationParams[sessionKey] = configuration

                resolve([
                    "sessionKey": sessionKey,
                    "state": self.currentCheckoutStateResult(
                        sessionKey: sessionKey,
                        checkout: checkout
                    ),
                ])
            } catch {
                reject(self.checkoutErrorCode(for: error), error.localizedDescription, error)
            }
        }
    }

    @objc(checkoutUpdateShippingAddress:address:name:phone:resolver:rejecter:)
    public func checkoutUpdateShippingAddress(
        sessionKey: String,
        address: NSDictionary,
        name: String?,
        phone: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            guard let self else {
                reject(ErrorType.Failed, "Stripe SDK is unavailable", nil)
                return
            }

            guard let checkout = self.checkoutInstances[sessionKey] else {
                reject(ErrorType.Failed, "Checkout session not found", nil)
                return
            }

            guard let shippingAddress = CheckoutAddressOverride(
                address: address,
                name: name,
                phone: phone
            ) else {
                reject(ErrorType.Failed, "A shipping address country is required.", nil)
                return
            }

            // TODO(porter): Replace this local override with checkout.updateShippingAddress
            // once the RN-targeted Stripe iOS SDK exposes the server-backed API.
            var localOverrides = self.checkoutLocalOverrides[sessionKey] ?? CheckoutLocalOverrides()
            localOverrides.shippingAddress = shippingAddress
            self.checkoutLocalOverrides[sessionKey] = localOverrides

            resolve(self.currentCheckoutStateResult(sessionKey: sessionKey, checkout: checkout))
        }
    }

    @objc(checkoutUpdateBillingAddress:address:name:phone:resolver:rejecter:)
    public func checkoutUpdateBillingAddress(
        sessionKey: String,
        address: NSDictionary,
        name: String?,
        phone: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            guard let self else {
                reject(ErrorType.Failed, "Stripe SDK is unavailable", nil)
                return
            }

            guard let checkout = self.checkoutInstances[sessionKey] else {
                reject(ErrorType.Failed, "Checkout session not found", nil)
                return
            }

            guard let billingAddress = CheckoutAddressOverride(
                address: address,
                name: name,
                phone: phone
            ) else {
                reject(ErrorType.Failed, "A billing address country is required.", nil)
                return
            }

            // TODO(porter): Replace this local override with checkout.updateBillingAddress
            // once the RN-targeted Stripe iOS SDK exposes the server-backed API.
            var localOverrides = self.checkoutLocalOverrides[sessionKey] ?? CheckoutLocalOverrides()
            localOverrides.billingAddress = billingAddress
            self.checkoutLocalOverrides[sessionKey] = localOverrides

            resolve(self.currentCheckoutStateResult(sessionKey: sessionKey, checkout: checkout))
        }
    }

    @objc(checkoutApplyPromotionCode:code:resolver:rejecter:)
    public func checkoutApplyPromotionCode(
        sessionKey: String,
        code: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.applyPromotionCode(code)
        }
    }

    @objc(checkoutRemovePromotionCode:resolver:rejecter:)
    public func checkoutRemovePromotionCode(
        sessionKey: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.removePromotionCode()
        }
    }

    @objc(checkoutUpdateLineItemQuantity:lineItemId:quantity:resolver:rejecter:)
    public func checkoutUpdateLineItemQuantity(
        sessionKey: String,
        lineItemId: String,
        quantity: Double,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        _ = sessionKey
        _ = lineItemId
        _ = quantity

        // TODO(porter): Call checkout.updateQuantity(with:) after the Stripe iOS SDK
        // exposes the line-item update API used by the React Native bridge.
        reject(ErrorType.Failed, checkoutUnsupportedOperationMessage(for: "Updating Checkout line item quantities"), nil)
    }

    @objc(checkoutSelectShippingOption:id:resolver:rejecter:)
    public func checkoutSelectShippingOption(
        sessionKey: String,
        id: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.selectShippingOption(id)
        }
    }

    @objc(checkoutUpdateTaxId:type:value:resolver:rejecter:)
    public func checkoutUpdateTaxId(
        sessionKey: String,
        type: String,
        value: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        _ = sessionKey
        _ = type
        _ = value

        // TODO(porter): Call checkout.updateTaxId(with:) after the Stripe iOS SDK
        // exposes the tax ID update API used by the React Native bridge.
        reject(ErrorType.Failed, checkoutUnsupportedOperationMessage(for: "Updating Checkout tax IDs"), nil)
    }

    @objc(checkoutRefresh:resolver:rejecter:)
    public func checkoutRefresh(
        sessionKey: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            guard let self else {
                reject(ErrorType.Failed, "Stripe SDK is unavailable", nil)
                return
            }

            guard self.checkoutInstances[sessionKey] != nil else {
                reject(ErrorType.Failed, "Checkout session not found", nil)
                return
            }

            guard let clientSecret = self.checkoutClientSecrets[sessionKey] else {
                reject(ErrorType.Failed, "Checkout session client secret not found", nil)
                return
            }

            let configuration = self.buildCheckoutConfiguration(
                params: self.checkoutConfigurationParams[sessionKey] ?? NSDictionary()
            )

            do {
                let checkout = try await Checkout(
                    clientSecret: clientSecret,
                    configuration: configuration
                )
                self.checkoutInstances[sessionKey] = checkout
                resolve(self.currentCheckoutStateResult(sessionKey: sessionKey, checkout: checkout))
            } catch {
                reject(self.checkoutErrorCode(for: error), error.localizedDescription, error)
            }
        }
    }

    internal func buildCheckoutConfiguration(params: NSDictionary) -> Checkout.Configuration {
        var configuration = Checkout.Configuration()

        if let adaptivePricing = params["adaptivePricing"] as? NSDictionary,
           let allowed = adaptivePricing["allowed"] as? Bool {
            configuration.adaptivePricing.allowed = allowed
        }

        return configuration
    }

    private func performCheckoutMutation(
        sessionKey: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock,
        operation: @escaping (Checkout) async throws -> Void
    ) {
        Task { @MainActor [weak self] in
            guard let self else {
                reject(ErrorType.Failed, "Stripe SDK is unavailable", nil)
                return
            }

            guard let checkout = self.checkoutInstances[sessionKey] else {
                reject(ErrorType.Failed, "Checkout session not found", nil)
                return
            }

            do {
                try await operation(checkout)
                resolve(self.currentCheckoutStateResult(sessionKey: sessionKey, checkout: checkout))
            } catch {
                reject(self.checkoutErrorCode(for: error), error.localizedDescription, error)
            }
        }
    }

    private func checkoutErrorCode(for error: Error) -> String {
        if let checkoutError = error as? CheckoutError {
            switch checkoutError {
            case .invalidClientSecret:
                return "InvalidClientSecret"
            case .sessionNotOpen:
                return "SessionNotOpen"
            case .sheetCurrentlyPresented:
                return "SheetCurrentlyPresented"
            default:
                return ErrorType.Failed
            }
        }

        return ErrorType.Failed
    }
}
