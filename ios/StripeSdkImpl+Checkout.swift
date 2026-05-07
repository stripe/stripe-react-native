//
//  StripeSdkImpl+Checkout.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/29/26.
//

import Foundation
@_spi(CheckoutSessionsPreview) import StripePaymentSheet

extension StripeSdkImpl {
    internal func currentCheckoutStateResult(checkout: Checkout) -> NSDictionary {
        Mappers.mapFromCheckoutState(checkout.state)
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

                resolve([
                    "sessionKey": sessionKey,
                    "state": self.currentCheckoutStateResult(checkout: checkout),
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
        performCheckoutAddressMutation(
            sessionKey: sessionKey,
            address: address,
            name: name,
            phone: phone,
            missingCountryMessage: "A shipping address country is required.",
            resolver: resolve,
            rejecter: reject
        ) { checkout, addressUpdate in
            try await checkout.updateShippingAddress(addressUpdate)
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
        performCheckoutAddressMutation(
            sessionKey: sessionKey,
            address: address,
            name: name,
            phone: phone,
            missingCountryMessage: "A billing address country is required.",
            resolver: resolve,
            rejecter: reject
        ) { checkout, addressUpdate in
            try await checkout.updateBillingAddress(addressUpdate)
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
        guard quantity.isFinite, let integerQuantity = Int(exactly: quantity) else {
            reject(ErrorType.Failed, "Line item quantity must be an integer.", nil)
            return
        }

        let lineItemUpdate = Checkout.LineItemUpdate(
            lineItemId: lineItemId,
            quantity: integerQuantity
        )

        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.updateQuantity(with: lineItemUpdate)
        }
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
        let taxIdUpdate = Checkout.TaxIdUpdate(type: type, value: value)

        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.updateTaxId(with: taxIdUpdate)
        }
    }

    @objc(checkoutRefresh:resolver:rejecter:)
    public func checkoutRefresh(
        sessionKey: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.refresh()
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
                resolve(self.currentCheckoutStateResult(checkout: checkout))
            } catch {
                reject(self.checkoutErrorCode(for: error), error.localizedDescription, error)
            }
        }
    }

    private func performCheckoutAddressMutation(
        sessionKey: String,
        address: NSDictionary,
        name: String?,
        phone: String?,
        missingCountryMessage: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock,
        operation: @escaping (Checkout, Checkout.AddressUpdate) async throws -> Void
    ) {
        guard let addressUpdate = buildCheckoutAddressUpdate(
            address: address,
            name: name,
            phone: phone
        ) else {
            reject(ErrorType.Failed, missingCountryMessage, nil)
            return
        }

        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await operation(checkout, addressUpdate)
        }
    }

    private func buildCheckoutAddressUpdate(
        address: NSDictionary,
        name: String?,
        phone: String?
    ) -> Checkout.AddressUpdate? {
        guard let country = address["country"] as? String, !country.isEmpty else {
            return nil
        }

        let checkoutAddress = Checkout.Address(
            country: country,
            line1: address["line1"] as? String,
            line2: address["line2"] as? String,
            city: address["city"] as? String,
            state: address["state"] as? String,
            postalCode: address["postalCode"] as? String
        )

        return Checkout.AddressUpdate(
            name: name,
            phone: phone,
            address: checkoutAddress
        )
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
