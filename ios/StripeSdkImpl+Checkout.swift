import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

extension StripeSdkImpl {
    @objc(createCheckout:resolver:rejecter:)
    public func createCheckout(
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            guard let self else {
                reject("Failed", "Stripe SDK is unavailable.", nil)
                return
            }

            do {
                let controllerGeneration = checkoutControllerGeneration
                var registeredControllerId: String?
                let configuration = try CheckoutConfigurationMapper.map(
                    params: params,
                    merchantIdentifier: merchantIdentifier,
                    didSelectPaymentOption: { [weak self] in
                        guard let self,
                              let controllerId = registeredControllerId,
                              checkoutControllerRegistry.instance(for: controllerId)
                                as NativeCheckoutControllerInstance? != nil else {
                            return
                        }
                        emitter?.emitCheckoutControllerDidSelectPaymentOption([
                            "controllerId": controllerId,
                        ])
                    }
                )
                let checkout = try await Checkout(configuration: configuration)
                guard controllerGeneration == checkoutControllerGeneration else {
                    return
                }
                let instance = NativeCheckoutControllerInstance(
                    checkout: checkout,
                    registry: checkoutControllerRegistry,
                    emitEvent: { [weak self] update in
                        self?.emitter?.emitCheckoutControllerDidUpdate(update)
                    }
                )
                let controllerId = checkoutControllerRegistry.register(instance)
                registeredControllerId = controllerId
                instance.start(controllerId: controllerId)
                resolve([
                    "controllerId": controllerId,
                    "session": CheckoutSessionSerializer.serialize(checkout.session),
                ])
            } catch {
                reject("Failed", error.localizedDescription, error)
            }
        }
    }

    @objc(destroyCheckout:resolver:rejecter:)
    public func destroyCheckout(
        controllerId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            guard let self,
                  let instance: NativeCheckoutControllerInstance = checkoutControllerRegistry.instance(
                      for: controllerId
                  ) else {
                reject("Failed", "Checkout controller `\(controllerId)` does not exist.", nil)
                return
            }

            instance.emitDestroyed()
            checkoutControllerRegistry.remove(controllerId: controllerId)
            resolve(nil)
        }
    }

    @objc(updateCheckoutEmail:email:resolver:rejecter:)
    public func updateCheckoutEmail(
        controllerId: String,
        email: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(controllerId: controllerId, resolver: resolve, rejecter: reject) { instance in
            // TODO(porter): Uncomment when the reviewed native method ships.
            // try await instance.checkout.updateEmail(email)
            _ = instance
            _ = email
            throw CheckoutMutationBridgeError.nativeAPINotAvailable("updateEmail")
        }
    }

    @objc(updateCheckoutShippingAddress:params:resolver:rejecter:)
    public func updateCheckoutShippingAddress(
        controllerId: String,
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(controllerId: controllerId, resolver: resolve, rejecter: reject) { instance in
            let name = params["name"] as? String
            let address = try CheckoutConfigurationMapper.mapAddress(
                params["address"] as? NSDictionary,
                path: "params.address"
            )
            // TODO(porter): Replace the non-null call when the reviewed nullable address ships.
            // try await instance.checkout.updateShippingAddress(name: name, address: address)
            guard let address else {
                throw CheckoutMutationBridgeError.nativeAPINotAvailable("updateShippingAddress(name:address:)")
            }
            try await instance.checkout.updateShippingAddress(name: name, address: address)
        }
    }

    @objc(applyCheckoutPromotionCode:promotionCode:resolver:rejecter:)
    public func applyCheckoutPromotionCode(
        controllerId: String,
        promotionCode: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(controllerId: controllerId, resolver: resolve, rejecter: reject) { instance in
            try await instance.checkout.applyPromotionCode(promotionCode)
        }
    }

    @objc(removeCheckoutPromotionCode:resolver:rejecter:)
    public func removeCheckoutPromotionCode(
        controllerId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(controllerId: controllerId, resolver: resolve, rejecter: reject) { instance in
            try await instance.checkout.removePromotionCode()
        }
    }

    @objc(clearCheckoutPaymentOption:resolver:rejecter:)
    public func clearCheckoutPaymentOption(
        controllerId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        performCheckoutMutation(controllerId: controllerId, resolver: resolve, rejecter: reject) { instance in
            instance.checkout.clearPaymentOption()
        }
    }

    private func performCheckoutMutation(
        controllerId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock,
        operation: @escaping @MainActor (NativeCheckoutControllerInstance) async throws -> Void
    ) {
        Task { @MainActor [weak self] in
            guard let self,
                  let instance: NativeCheckoutControllerInstance = checkoutControllerRegistry.instance(
                      for: controllerId
                  ) else {
                reject(CheckoutBridgeErrorCode.failed.rawValue, "Checkout controller `\(controllerId)` does not exist.", nil)
                return
            }
            do {
                try await operation(instance)
                let registeredInstance: NativeCheckoutControllerInstance? = checkoutControllerRegistry.instance(
                    for: controllerId
                )
                guard registeredInstance === instance else {
                    reject(
                        CheckoutBridgeErrorCode.canceled.rawValue,
                        "The Checkout controller was destroyed before the operation completed.",
                        nil
                    )
                    return
                }
                resolve(["session": CheckoutSessionSerializer.serialize(instance.checkout.session)])
            } catch {
                reject(CheckoutErrorMapper.code(for: error).rawValue, error.localizedDescription, error)
            }
        }
    }
}
