//
//  StripeSdkImpl+Checkout.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/29/26.
//

import Combine
import Foundation
@_spi(ReactNativeSDK) import StripePaymentSheet

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

                let cancellable = checkout.$state
                    .dropFirst()
                    .sink { [weak self] state in
                        self?.emitter?.emitCheckoutSessionDidChangeState([
                            "sessionKey": sessionKey,
                            "state": Mappers.mapFromCheckoutState(state),
                        ])
                    }

                self.checkoutInstances[sessionKey] = checkout
                self.checkoutStateCancellables[sessionKey] = cancellable

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
            try await checkout.updateShippingAddress(
                name: addressUpdate.name,
                phone: addressUpdate.phone,
                address: addressUpdate.address
            )
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
            try await checkout.updateBillingAddress(
                name: addressUpdate.name,
                phone: addressUpdate.phone,
                address: addressUpdate.address
            )
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

        performCheckoutMutation(
            sessionKey: sessionKey,
            resolver: resolve,
            rejecter: reject
        ) { checkout in
            try await checkout.updateQuantity(lineItemId: lineItemId, quantity: integerQuantity)
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

    @objc(checkoutRunServerUpdateStart:resolver:rejecter:)
    public func checkoutRunServerUpdateStart(
        sessionKey: String,
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

            guard self.serverUpdateContinuations[sessionKey] == nil else {
                reject(ErrorType.Failed, "A server update is already in progress for this session", nil)
                return
            }

            do {
                try await checkout.runServerUpdate {
                    try await withCheckedThrowingContinuation { continuation in
                        self.serverUpdateContinuations[sessionKey] = continuation
                    }
                }
                resolve(self.currentCheckoutStateResult(checkout: checkout))
            } catch {
                reject(self.checkoutErrorCode(for: error), error.localizedDescription, error)
            }
        }
    }

    @objc(checkoutRunServerUpdateComplete:error:resolver:rejecter:)
    public func checkoutRunServerUpdateComplete(
        sessionKey: String,
        error: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let continuation = serverUpdateContinuations.removeValue(forKey: sessionKey) else {
            reject(ErrorType.Failed, "No pending server update for this session", nil)
            return
        }

        if let error {
            continuation.resume(throwing: CheckoutError.apiError(message: error))
        } else {
            continuation.resume()
        }
        resolve(nil)
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
        operation: @escaping (Checkout, Checkout.ContactAddress) async throws -> Void
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
    ) -> Checkout.ContactAddress? {
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

        return Checkout.ContactAddress(
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
