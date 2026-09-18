import Foundation
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet

extension StripeSdkImpl {
    @objc(createCheckout:controllerId:resolver:rejecter:)
    public func createCheckout(
        params: NSDictionary,
        controllerId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                reject("Failed", "Stripe SDK is unavailable.", nil)
                return
            }

            pendingCheckoutCreations[controllerId] = Task { @MainActor [weak self] in
                guard let self else {
                    reject("Failed", "Stripe SDK is unavailable.", nil)
                    return
                }
                defer { pendingCheckoutCreations.removeValue(forKey: controllerId) }
                do {
                    try Task.checkCancellation()
                    let configuration = try CheckoutConfigurationMapper.map(
                        params: params,
                        merchantIdentifier: merchantIdentifier,
                        didSelectPaymentOption: { [weak self] in
                            guard let self,
                                  checkoutControllers[controllerId] != nil else {
                                return
                            }
                            emitter?.emitCheckoutControllerDidSelectPaymentOption([
                                "controllerId": controllerId,
                            ])
                        }
                    )
                    let checkout = try await CheckoutController(configuration: configuration)
                    try Task.checkCancellation()
                    let instance = NativeCheckoutControllerInstance(
                        checkout: checkout,
                        emitEvent: { [weak self] update in
                            self?.emitter?.emitCheckoutControllerDidUpdate(update)
                        }
                    )
                    checkoutControllers[controllerId] = instance
                    instance.start(controllerId: controllerId)
                    resolve([
                        "controllerId": controllerId,
                        "session": instance.session,
                    ])
                } catch {
                    reject("Failed", error.localizedDescription, error)
                }
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
                  let instance = checkoutControllers.removeValue(forKey: controllerId) else {
                reject("Failed", "Checkout controller `\(controllerId)` does not exist.", nil)
                return
            }

            instance.destroy()
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
        performCheckoutMutation(controllerId: controllerId, resolver: resolve, rejecter: reject) { _ in
            // TODO(porter): Forward email updates once the iOS SDK exposes CheckoutController.updateEmail.
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
            let address = CheckoutConfigurationMapper.mapAddress(params["address"] as? NSDictionary)
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
            try await instance.checkout.clearPaymentOption()
        }
    }

    @objc(runCheckoutServerUpdate:operationId:resolver:rejecter:)
    public func runCheckoutServerUpdate(
        controllerId: String,
        operationId: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            guard let self,
                  let instance = checkoutControllers[controllerId] else {
                reject("Failed", "Checkout controller `\(controllerId)` does not exist.", nil)
                return
            }
            instance.runServerUpdate(operationId: operationId, request: { [weak self] in
                self?.emitter?.emitCheckoutServerUpdateRequested([
                    "controllerId": controllerId,
                    "operationId": operationId,
                ])
            }, completion: { error in
                if let error {
                    reject(CheckoutErrorMapper.code(for: error).rawValue, error.localizedDescription, error)
                } else {
                    resolve(nil)
                }
            })
        }
    }

    @objc(completeCheckoutServerUpdate:operationId:error:resolver:rejecter:)
    public func completeCheckoutServerUpdate(
        controllerId: String,
        operationId: String,
        error: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor [weak self] in
            let instance = self?.checkoutControllers[controllerId]
            instance?.completeServerUpdate(operationId: operationId, error: error)
            resolve(nil)
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
                  let instance = checkoutControllers[controllerId] else {
                reject(CheckoutBridgeErrorCode.failed.rawValue, "Checkout controller `\(controllerId)` does not exist.", nil)
                return
            }
            do {
                try await operation(instance)
                let registeredInstance = checkoutControllers[controllerId]
                guard registeredInstance === instance else {
                    reject(
                        CheckoutBridgeErrorCode.canceled.rawValue,
                        "The Checkout controller was destroyed before the operation completed.",
                        nil
                    )
                    return
                }
                resolve(nil)
            } catch {
                reject(CheckoutErrorMapper.code(for: error).rawValue, error.localizedDescription, error)
            }
        }
    }
}
