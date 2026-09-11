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
}
