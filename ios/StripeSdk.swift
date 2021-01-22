import PassKit
import Stripe

@objc(StripeSdk)
class StripeSdk: NSObject, STPApplePayContextDelegate  {
    var onPaymentSuccessCallback: RCTResponseSenderBlock? = nil
    var onPaymentErrorCallback: RCTResponseSenderBlock? = nil
    var merchantIdentifier: String? = nil
    
    var applePayRequestResolver: RCTPromiseResolveBlock? = nil
    var applePayCompletionCallback: STPIntentClientSecretCompletionBlock? = nil
    var applePayCompletionRejecter: RCTPromiseRejectBlock? = nil
    var onApplePaySuccessCallback: RCTResponseSenderBlock? = nil
    var onApplePayErrorCallback: RCTResponseSenderBlock? = nil
    var onConfirmSetupIntentErrorCallback: RCTResponseSenderBlock? = nil
    var onConfirmSetupIntentSuccessCallback: RCTResponseSenderBlock? = nil
    var confirmSetupIntentPromise: RCTResponseSenderBlock? = nil
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc(initialise:appInfo:stripeAccountId:params:merchantIdentifier:)
    func initialise(publishableKey: String,  appInfo: NSDictionary, stripeAccountId: String?, params: NSDictionary?, merchantIdentifier: String?) -> Void {
        if let params = params {
            configure3dSecure(params)
        }
        STPAPIClient.shared.publishableKey = publishableKey
        STPAPIClient.shared.stripeAccount = stripeAccountId
        
        let name = RCTConvert.nsString(appInfo["name"]) ?? ""
        let partnerId = RCTConvert.nsString(appInfo["partnerId"]) ?? ""
        let version = RCTConvert.nsString(appInfo["version"]) ?? ""
        let url = RCTConvert.nsString(appInfo["url"]) ?? ""
        
        STPAPIClient.shared.appInfo = STPAppInfo(name: name, partnerId: partnerId, version: version, url: url)
        self.merchantIdentifier = merchantIdentifier
    }
    
    @objc(registerConfirmSetupIntentCallbacks:onError:)
    func registerConfirmSetupIntentCallbacks(onSuccess: @escaping RCTResponseSenderBlock, onError: @escaping RCTResponseSenderBlock) -> Void  {
        onConfirmSetupIntentErrorCallback = onError
        onConfirmSetupIntentSuccessCallback = onSuccess
    }
    
    @objc
    func unregisterConfirmSetupIntentCallbacks() -> Void {
        onConfirmSetupIntentErrorCallback = nil
        onConfirmSetupIntentSuccessCallback = nil
    }
    
    @objc(confirmSetupIntent:card:billingDetails:resolver:rejecter:)
    func confirmSetupIntent (setupIntentClientSecret: String, card: NSDictionary, billingDetails: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        let billing = Mappers.mapToBillingDetails(billingDetails: billingDetails)
        let cardParams = Mappers.mapCardParams(params: card)
        
        let paymentMethodParams = STPPaymentMethodParams(card: cardParams, billingDetails: billing, metadata: nil)
        let setupIntentParams = STPSetupIntentConfirmParams(clientSecret: setupIntentClientSecret)
        setupIntentParams.paymentMethodParams = paymentMethodParams
        
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmSetupIntent(setupIntentParams, with: self) { status, setupIntent, error in
            switch (status) {
            case .failed:
                self.onConfirmSetupIntentErrorCallback?([NSNull(), Errors.createError(code: ConfirmSetupIntentErrorType.Failed.rawValue, message: error?.localizedDescription ?? "")])
                reject(ConfirmSetupIntentErrorType.Failed.rawValue, error?.localizedDescription ?? "", nil)
                break
            case .canceled:
                self.onConfirmSetupIntentErrorCallback?([NSNull(), Errors.createError(code: ConfirmSetupIntentErrorType.Canceled.rawValue, message: error?.localizedDescription ?? "")])
                reject(ConfirmSetupIntentErrorType.Canceled.rawValue, error?.localizedDescription ?? "", nil)
                break
            case .succeeded:
                let intent = Mappers.mapFromSetupIntentResult(setupIntent: setupIntent!)
                self.onConfirmSetupIntentSuccessCallback?([NSNull(), intent])
                resolve(intent)
            @unknown default:
                self.onConfirmSetupIntentErrorCallback?([NSNull(), Errors.createError(code: ConfirmSetupIntentErrorType.Unknown.rawValue, message: error?.localizedDescription ?? "")])
                reject(ConfirmSetupIntentErrorType.Unknown.rawValue, error?.localizedDescription ?? "", nil)
                break
            }
        }
    }
    
    func applePayContext(_ context: STPApplePayContext, didCreatePaymentMethod paymentMethod: STPPaymentMethod, paymentInformation: PKPayment, completion: @escaping STPIntentClientSecretCompletionBlock) {
        self.applePayCompletionCallback = completion
        self.applePayRequestResolver?([NSNull()])
    }
    
    @objc(confirmApplePayPayment:resolver:rejecter:)
    func confirmApplePayPayment(clientSecret: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.applePayCompletionRejecter = reject
        self.applePayCompletionCallback?(clientSecret, nil)
        resolve(NSNull())
    }
    
    @objc(registerApplePayCallbacks:onError:)
    func registerApplePayCallbacks(onSuccess: @escaping RCTResponseSenderBlock, onError: @escaping RCTResponseSenderBlock) -> Void  {
        onApplePaySuccessCallback = onSuccess
        onApplePayErrorCallback = onError
    }
    
    @objc
    func unregisterApplePayCallbacks() -> Void {
        onApplePaySuccessCallback = nil
        onApplePayErrorCallback = nil
    }
    
    func applePayContext(_ context: STPApplePayContext, didCompleteWith status: STPPaymentStatus, error: Error?) {
        switch status {
        case .success:
            onApplePaySuccessCallback?([NSNull()])
            applePayCompletionRejecter = nil
            break
        case .error:
            let message = "Apple pay completion failed"
            onApplePayErrorCallback?([Errors.createError(code: ApplePayErrorType.Failed.rawValue, message: message)])
            applePayCompletionRejecter?(ApplePayErrorType.Failed.rawValue, message, nil)
            applePayCompletionRejecter = nil
            break
        case .userCancellation:
            let message = "Apple pay payment has been cancelled"
            onApplePayErrorCallback?([Errors.createError(code: ApplePayErrorType.Canceled.rawValue, message: message)])
            applePayCompletionRejecter?(ApplePayErrorType.Failed.rawValue, message, nil)
            applePayCompletionRejecter = nil
            break
        @unknown default:
            let message = "Cannot complete payment"
            onApplePayErrorCallback?([Errors.createError(code: ApplePayErrorType.Unknown.rawValue, message: message)])
            applePayCompletionRejecter?(ApplePayErrorType.Failed.rawValue, message, nil)
            applePayCompletionRejecter = nil
        }
    }
    
    @objc(isApplePaySupported:rejecter:)
    func isApplePaySupported(resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        let isSupported = StripeAPI.deviceSupportsApplePay()
        resolve([isSupported])
    }
    
    @objc(presentApplePay:resolver:rejecter:)
    func presentApplePay(summaryItems: NSArray, resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
        if (merchantIdentifier == nil) {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide merchantIdentifier", nil)
            return
        }
        
        let merchantIdentifier = self.merchantIdentifier ?? ""
        let paymentRequest = StripeAPI.paymentRequest(withMerchantIdentifier: merchantIdentifier, country: "US", currency: "USD")
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
    
    func configure3dSecure(_ params: NSDictionary) {
        let threeDSCustomizationSettings = STPPaymentHandler.shared().threeDSCustomizationSettings
        let uiCustomization = Mappers.mapUICustomization(params)
                
        threeDSCustomizationSettings.uiCustomization = uiCustomization
    }
    
    @objc(registerConfirmPaymentCallbacks:onError:)
    func registerConfirmPaymentCallbacks(onSuccess: @escaping RCTResponseSenderBlock, onError: @escaping RCTResponseSenderBlock) -> Void  {
        onPaymentSuccessCallback = onSuccess
        onPaymentErrorCallback = onError
    }
    
    @objc
    func unregisterConfirmPaymentCallbacks() -> Void {
        onPaymentSuccessCallback = nil
        onPaymentErrorCallback = nil
    }
    
    @objc(createPaymentMethod:resolver:rejecter:)
    func createPaymentMethod(
        params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let cardDetails = params.object(forKey: "card")
        let paymentMethodParams = Mappers.mapCardParamsToPaymentMethodParams(params: cardDetails as! NSDictionary)
        STPAPIClient.shared.createPaymentMethod(with: paymentMethodParams) { paymentMethod, error in
            if let createError = error {
                reject(NextPaymentActionErrorType.Failed.rawValue, createError.localizedDescription, nil)
            }
            
            if let paymentMethod = paymentMethod {
                let method = Mappers.mapFromPaymentMethod(paymentMethod)
                resolve(method)
            }
        }
    }

    @objc(handleCardAction:resolver:rejecter:)
    func handleCardAction(
        paymentIntentClientSecret: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ){
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.handleNextAction(forPayment: paymentIntentClientSecret, with: self, returnURL: nil) { status, paymentIntent, handleActionError in
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
        let paymentMethodParams = Mappers.mapCardParamsToPaymentMethodParams(params: params)
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: paymentIntentClientSecret)
        paymentIntentParams.paymentMethodParams = paymentMethodParams
        
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmPayment(paymentIntentParams, with: self) { (status, paymentIntent, error) in
            switch (status) {
            case .failed:
                reject(ConfirmPaymentErrorType.Failed.rawValue, error?.localizedDescription ?? "", nil)
                self.onPaymentErrorCallback?([NSNull(), Errors.createError(code: ConfirmPaymentErrorType.Failed.rawValue, message: error?.localizedDescription ?? "")])
                break
            case .canceled:
                reject(ConfirmPaymentErrorType.Canceled.rawValue, error?.localizedDescription ?? "", nil)
                self.onPaymentErrorCallback?([NSNull(), Errors.createError(code: ConfirmPaymentErrorType.Canceled.rawValue, message: error?.localizedDescription ?? "")])
                break
            case .succeeded:
                let intent = Mappers.mapFromIntent(paymentIntent: paymentIntent)
                resolve(intent)
                self.onPaymentSuccessCallback?([NSNull(), intent])
                break
            @unknown default:
                reject(ConfirmPaymentErrorType.Unknown.rawValue, "Cannot complete payment", nil)
                self.onPaymentErrorCallback?([NSNull(), Errors.createError(code: ConfirmPaymentErrorType.Unknown.rawValue, message: "Cannot complete payment")])
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
