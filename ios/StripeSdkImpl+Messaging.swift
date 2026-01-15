
import Foundation
@_spi(PaymentMethodMessagingElementPreview) import StripePaymentSheet

@objc(StripeSdkImpl)
extension StripeSdkImpl {
    
    // MARK: Public API wrappers
    
    @objc(createPaymentMethodMessagingElement:resolve:reject:)
    public func createPaymentMethodMessagingElement(configuration: NSDictionary,
                                                    resolve: @escaping RCTPromiseResolveBlock,
                                                    reject: @escaping RCTPromiseRejectBlock) {
        
        guard let configuration = buildPaymentMethodMessagingElementConfiguration(params: configuration).configuration else {
            resolve(Errors.createError(ErrorType.Failed, "Invalid configuration"))
            return
        }
        
        Task {
            do {
                switch await PaymentMethodMessagingElement.create(configuration: configuration) {
                case .success(let paymentMethodMessagingElement):
                    self.messagingInstance = paymentMethodMessagingElement
                    
                    // success: resolve promise
                    let newHeight = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: paymentMethodMessagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
                    self.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": newHeight ?? 0])
                    
                    // publish initial state
                case .noContent:
                    // No element is available to display with this configuration
                    // You may want to adapt your UI accordingly
                    // ...
                    self.messagingInstance = nil
                case .failed(let error):
                    // An unrecoverable error has occurred while attempting to load the element
                    // You may want to log the error or take other action
                    // ...
                    self.messagingInstance = nil
                }
                resolve(nil)
            } catch {
                // 1) still resolve the promise so JS hook can finish loading
                resolve(nil)
                
                // 2) emit a loading‐failed event with the error message
                let msg = error.localizedDescription
                //self.emitter?.emitEmbeddedPaymentElementLoadingFailed(["message": msg])
            }
        }
        
    }
    
}

// MARK: Config parsing

extension StripeSdkImpl {
    @nonobjc
    internal func buildPaymentMethodMessagingElementConfiguration(
        params: NSDictionary
    ) -> (error: NSDictionary?, configuration: PaymentMethodMessagingElement.Configuration?) {
        
        let amount = params["amount"] as? Int ?? 0
        
        let configuration = PaymentMethodMessagingElement.Configuration(
            amount: amount, currency: "usd"
        )
        
        return (nil, configuration)
    }
}
