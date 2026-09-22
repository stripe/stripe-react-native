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
}
