@objc(StripeSdk)
class StripeSdk: NSObject {
    
    var onPaymentSuccessCallback: RCTResponseSenderBlock? = nil
    var onPaymentErrorCallback: RCTResponseSenderBlock? = nil

    @objc(initialise:)
    func initialise(publishableKey: String) -> Void {
        STPAPIClient.shared().publishableKey = publishableKey
    }
    
    @objc(configure3dSecure:)
    func configure3dSecure(params: NSDictionary) {
        let threeDSCustomizationSettings = STPPaymentHandler.shared().threeDSCustomizationSettings
        let uiCustomization = threeDSCustomizationSettings.uiCustomization
        
        threeDSCustomizationSettings.authenticationTimeout = RCTConvert.nsInteger(params["timeout"])
        
        uiCustomization.labelCustomization.headingTextColor = UIColor(hexString: RCTConvert.nsString(params["headingTextColor"]))
        uiCustomization.labelCustomization.textColor = UIColor(hexString: RCTConvert.nsString(params["bodyTextColor"]))
    }
    
    @objc(registerConfirmPaymentCallbacks:onError:)
    func registerConfirmPaymentCallbacks(onSuccess: @escaping RCTResponseSenderBlock, onError: @escaping RCTResponseSenderBlock) -> Void  {
        onPaymentSuccessCallback = onSuccess
        onPaymentErrorCallback = onError
    }
    
    func mapCardParams(params: NSDictionary) -> STPPaymentMethodParams {
        let cardSourceParams = STPCardParams()
        cardSourceParams.number = RCTConvert.nsString(params["cardNumber"])
        cardSourceParams.cvc = RCTConvert.nsString(params["cvc"])
        cardSourceParams.expMonth = RCTConvert.nsuInteger(params["expiryMonth"])
        cardSourceParams.expYear = RCTConvert.nsuInteger(params["expiryYear"])
        
        let cardParams = STPPaymentMethodCardParams(cardSourceParams: cardSourceParams)
        return STPPaymentMethodParams(card: cardParams, billingDetails: nil, metadata: nil)
    }
    
    func mapFromIntent (paymentIntent: STPPaymentIntent?, requiresConfirmation: Bool?) -> NSDictionary {
        let intent: NSDictionary = [
            "id": paymentIntent?.paymentMethodId ?? "",
            "currency": paymentIntent?.currency ?? "",
            "status": paymentIntent?.status.rawValue ?? "",
            "description": paymentIntent?.description ?? "",
            "receiptEmail": paymentIntent?.receiptEmail ?? "",
            "stripeId": paymentIntent?.stripeId ?? "",
            "requiresConfirmation": requiresConfirmation ?? false,
        ]
        
        return intent;
    }
    
    @objc(createPaymentMethod:resolver:rejecter:)
    func createPaymentMethod(
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let paymentMethodParams = mapCardParams(params: params)
        
        STPAPIClient.shared().createPaymentMethod(with: paymentMethodParams) { [weak self] paymentMethod, error in
            if let createError = error {
                reject("PAYMENT_CREATION_FAILED", createError.localizedDescription, nil)
            }
            if let paymentMethodId = paymentMethod?.stripeId {
                let method: NSDictionary = [
                    "stripeId": paymentMethodId 
                ]
                resolve(method)
            }
        }
    }
    
    @objc(handleNextPaymentAction:resolver:rejecter:)
    func handleNextPaymentAction(
        paymentIntentClientSecret: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ){
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.handleNextAction(forPayment: paymentIntentClientSecret, authenticationContext: self, returnURL: nil) { status, paymentIntent, handleActionError in
            switch (status) {
            case .failed:
                reject("HANDLE_NEXT_PAYMENT_FAILED", handleActionError?.localizedDescription ?? "", nil)
                break
            case .canceled:
                reject("HANDLE_NEXT_PAYMENT_CANCELED", handleActionError?.localizedDescription ?? "", nil)
                break
            case .succeeded:
                if let paymentIntent = paymentIntent, paymentIntent.status == STPPaymentIntentStatus.requiresConfirmation {
                    print("Re-confirming PaymentIntent after handling action")
                    resolve(self.mapFromIntent(paymentIntent: paymentIntent, requiresConfirmation: true)) // TODO: resolve with re-confirmation-needed
                }
                else {
                    resolve(self.mapFromIntent(paymentIntent: paymentIntent, requiresConfirmation: false))
                }
                break
            @unknown default:
                fatalError()
                break
            }
        }
    }
    
    @objc(confirmPaymentMethod:params:resolver:rejecter:)
    func confirmPaymentMethod(
        paymentIntentClientSecret: String,
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let paymentMethodParams = mapCardParams(params: params)
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
                let intent = self.mapFromIntent(paymentIntent: paymentIntent, requiresConfirmation: false)
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
