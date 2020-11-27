import PassKit

@objc(StripeSdk)
class StripeSdk: NSObject, STPApplePayContextDelegate  {
    var onPaymentSuccessCallback: RCTResponseSenderBlock? = nil
    var onPaymentErrorCallback: RCTResponseSenderBlock? = nil
    var merchantIdentifier: String? = nil
    
    var applePayRequestResolver: RCTPromiseResolveBlock? = nil
    var applePayCompletionCallback: STPIntentClientSecretCompletionBlock? = nil
    var onApplePaySuccessCallback: RCTResponseSenderBlock? = nil
    var onApplePayErrorCallback: RCTResponseSenderBlock? = nil
    
    @objc(initialise:merchantIdentifier:)
    func initialise(publishableKey: String, merchantIdentifier: String?) -> Void {
        STPAPIClient.shared().publishableKey = publishableKey
        self.merchantIdentifier = merchantIdentifier
    }
    
    func applePayContext(_ context: STPApplePayContext, didCreatePaymentMethod paymentMethod: STPPaymentMethod, paymentInformation: PKPayment, completion: @escaping STPIntentClientSecretCompletionBlock) {
        self.applePayCompletionCallback = completion
        self.applePayRequestResolver?([NSNull()])
    }
    
    @objc(completePaymentWithApplePay:resolver:rejecter:)
    func completePaymentWithApplePay(clientSecret: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.applePayCompletionCallback?(clientSecret, nil)
        resolve(NSNull())
    }
    
    @objc(registerApplePayCallbacks:onError:)
    func registerApplePayCallbacks(onSuccess: @escaping RCTResponseSenderBlock, onError: @escaping RCTResponseSenderBlock) -> Void  {
        onApplePaySuccessCallback = onSuccess
        onApplePayErrorCallback = onError
    }
    
    func applePayContext(_ context: STPApplePayContext, didCompleteWith status: STPPaymentStatus, error: Error?) {
        switch status {
        case .success:
            onApplePaySuccessCallback?([NSNull()])
            break
        case .error:
            onApplePayErrorCallback?([Mappers.createError(code: ApplePayErrorType.Failed.rawValue, message: "Apple pay completion failed")])
            break
        case .userCancellation:
            onApplePayErrorCallback?([Mappers.createError(code: ApplePayErrorType.Canceled.rawValue, message: "Apple pay payment has been cancelled")])
            break
        @unknown default:
            onApplePayErrorCallback?([Mappers.createError(code: ApplePayErrorType.Unknown.rawValue, message: "Cannot complete payment")])
        }
    }
    
    @objc(isApplePaySupported:rejecter:)
    func isApplePaySupported(resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        let isSupported = Stripe.deviceSupportsApplePay()
        resolve([isSupported])
    }
    
    @objc(payWithApplePay:resolver:rejecter:)
    func payWithApplePay(summaryItems: NSArray, resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
        if (merchantIdentifier == nil) {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide merchantIdentifier", nil)
            return
        }
        
        let merchantIdentifier = self.merchantIdentifier ?? ""
        let paymentRequest = Stripe.paymentRequest(withMerchantIdentifier: merchantIdentifier, country: "US", currency: "USD")
        applePayRequestResolver = resolve
        
        var paymentSummaryItems: [PKPaymentSummaryItem] = []
        
        if let items = summaryItems as? [[String : Any]] {
            for item in items {
                let label = item["label"] as? String ?? ""
                let amount = NSDecimalNumber(string: item["amount"] as? String ?? "")
                paymentSummaryItems.append(PKPaymentSummaryItem(label: label, amount: amount))
            }
        }
        
        paymentRequest.paymentSummaryItems = paymentSummaryItems
        if let applePayContext = STPApplePayContext(paymentRequest: paymentRequest, delegate: self) {
            DispatchQueue.main.async {
                applePayContext.presentApplePay(on: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController())
            }
        } else {
            reject(ApplePayErrorType.Failed.rawValue, "Apple pay request failed", nil)
        }
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
    
    @objc(createPaymentMethod:resolver:rejecter:)
    func createPaymentMethod(
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let paymentMethodParams = Mappers.mapCardParams(params: params)
        
        STPAPIClient.shared().createPaymentMethod(with: paymentMethodParams) { paymentMethod, error in
            if let createError = error {
                reject(NextPaymentActionErrorType.Failed.rawValue, createError.localizedDescription, nil)
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
                reject(NextPaymentActionErrorType.Failed.rawValue, handleActionError?.localizedDescription ?? "", nil)
                break
            case .canceled:
                reject(NextPaymentActionErrorType.Canceled.rawValue, handleActionError?.localizedDescription ?? "", nil)
                break
            case .succeeded:
                resolve(Mappers.mapFromIntent(paymentIntent: paymentIntent))
                break
            @unknown default:
                reject(NextPaymentActionErrorType.Unknown.rawValue, "Cannot complete payment", nil)
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
        let paymentMethodParams = Mappers.mapCardParams(params: params)
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: paymentIntentClientSecret)
        paymentIntentParams.paymentMethodParams = paymentMethodParams
        
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmPayment(withParams: paymentIntentParams, authenticationContext: self) { (status, paymentIntent, error) in
            switch (status) {
            case .failed:
                reject(ConfirmPaymentErrorType.Failed.rawValue, error?.localizedDescription ?? "", nil)
                self.onPaymentErrorCallback?([NSNull(), Mappers.createError(code: ConfirmPaymentErrorType.Failed.rawValue, message: error?.localizedDescription ?? "")])
                break
            case .canceled:
                reject(ConfirmPaymentErrorType.Canceled.rawValue, error?.localizedDescription ?? "", nil)
                self.onPaymentErrorCallback?([NSNull(), Mappers.createError(code: ConfirmPaymentErrorType.Canceled.rawValue, message: error?.localizedDescription ?? "")])
                break
            case .succeeded:
                let intent = Mappers.mapFromIntent(paymentIntent: paymentIntent)
                resolve(intent)
                self.onPaymentSuccessCallback?([NSNull(), intent])
                break
            @unknown default:
                reject(ConfirmPaymentErrorType.Unknown.rawValue, "Cannot complete payment", nil)
                self.onPaymentErrorCallback?([NSNull(), Mappers.createError(code: ConfirmPaymentErrorType.Unknown.rawValue, message: "Cannot complete payment")])
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
