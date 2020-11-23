@objc(StripeSdk)
class StripeSdk: NSObject {
    
    var onPaymentSuccessCallback: RCTResponseSenderBlock? = nil
    var onPaymentErrorCallback: RCTResponseSenderBlock? = nil

    @objc(initialise:)
    func initialise(publishableKey: String) -> Void {
        Stripe.setDefaultPublishableKey(publishableKey)
    }
    
    @objc(registerConfirmPaymentCallbacks:onError:)
    func registerConfirmPaymentCallbacks(onSuccess: @escaping RCTResponseSenderBlock, onError: @escaping RCTResponseSenderBlock) -> Void  {
        onPaymentSuccessCallback = onSuccess
        onPaymentErrorCallback = onError
    }
    
    @objc(confirmPaymentMethod:params:resolver:rejecter:)
    func confirmPaymentMethod(
        paymentIntentClientSecret: String,
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let cardSourceParams = STPCardParams()
        cardSourceParams.number = RCTConvert.nsString(params["cardNumber"])
        cardSourceParams.cvc = RCTConvert.nsString(params["cvc"])
        cardSourceParams.expMonth = RCTConvert.nsuInteger(params["expiryMonth"])
        cardSourceParams.expYear = RCTConvert.nsuInteger(params["expiryYear"])
        
        let cardParams = STPPaymentMethodCardParams(cardSourceParams: cardSourceParams)
        let paymentMethodParams = STPPaymentMethodParams(card: cardParams, billingDetails: nil, metadata: nil)
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: paymentIntentClientSecret)
        paymentIntentParams.paymentMethodParams = paymentMethodParams

        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmPayment(withParams: paymentIntentParams, authenticationContext: self) { (status, paymentIntent, error) in
            switch (status) {
            case .failed:
                reject("PAYMENT_FAILED", error?.localizedDescription ?? "", nil)
                self.onPaymentErrorCallback?([NSNull(), error?.localizedDescription ?? ""])
                break
            case .canceled:
                reject("PAYMENT_CANCELED", error?.localizedDescription ?? "", nil)
                self.onPaymentErrorCallback?([NSNull(), error?.localizedDescription ?? ""])
                break
            case .succeeded:
                let intent: NSDictionary = [
                    "id": paymentIntent?.paymentMethodId ?? "",
                    "currency": paymentIntent?.currency ?? "",
                    "status": paymentIntent?.status.rawValue ?? "",
                    "description": paymentIntent?.description ?? "",
                    "receiptEmail": paymentIntent?.receiptEmail ?? "",
                ]
                resolve(intent)
                self.onPaymentSuccessCallback?([NSNull(), intent])
                break
            @unknown default:
                reject("PAYMENT_ERROR", "Cannot complete payment", nil)
                self.onPaymentErrorCallback?([NSNull(), "Cannot complete payment"])
                break
            }
        }
    }
}

extension StripeSdk: STPAuthenticationContext {
    func authenticationPresentingViewController() -> UIViewController {
        if let topViewController = UIApplication.shared.delegate?.window??.rootViewController {
            return topViewController
        }
        return UIViewController()
    }
}
