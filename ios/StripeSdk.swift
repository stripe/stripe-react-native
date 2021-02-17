import PassKit
import Stripe

@objc(StripeSdk)
class StripeSdk: NSObject, STPApplePayContextDelegate  {
    var onPaymentSuccessCallback: RCTResponseSenderBlock? = nil
    var onPaymentErrorCallback: RCTResponseSenderBlock? = nil
    var merchantIdentifier: String? = nil
    
    private var paymentSheet: PaymentSheet?
    
    
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
    
    @objc(setupPaymentSheet:resolver:rejecter:)
    func setupPaymentSheet(params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        guard let customerId = params["customerId"] as? String else {
            reject("Failed", "You must provide the customer ID", nil)
            return
        }
        guard let customerEphemeralKeySecret = params["customerEphemeralKeySecret"] as? String else {
            reject("Failed", "You must provide the customerEphemeralKeySecret", nil)
            return
        }
        guard let paymentIntentClientSecret = params["paymentIntentClientSecret"] as? String else {
            reject("Failed", "You must provide the paymentIntentClientSecret", nil)
            return
        }
        
        var configuration = PaymentSheet.Configuration()
        configuration.merchantDisplayName = "Example, Inc."
        configuration.customer = .init(id: customerId, ephemeralKeySecret: customerEphemeralKeySecret)
        self.paymentSheet = PaymentSheet(paymentIntentClientSecret: paymentIntentClientSecret, configuration: configuration)
        resolve([NSNull()])
    }
    
    @objc(presentPaymentSheet:rejecter:)
    func presentPaymentSheet(resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        DispatchQueue.main.async {
            self.paymentSheet?.present(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()) { paymentResult in
                switch paymentResult {
                case .completed:
                    resolve([paymentResult])
                case .canceled:
                    reject(PaymentSheetErrorType.Canceled.rawValue, "The payment has been canceled", nil)
                case .failed(let error, _):
                    reject(PaymentSheetErrorType.Failed.rawValue, error.localizedDescription, nil)
                }
            }
        }
        
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
    
    @objc(confirmSetupIntent:data:options:resolver:rejecter:)
    func confirmSetupIntent (setupIntentClientSecret: String, data: NSDictionary,
                             options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        var billing: STPPaymentMethodBillingDetails? = nil
        if let billingDetails = data.object(forKey: "billingDetails") as! NSDictionary? {
            billing = Mappers.mapToBillingDetails(billingDetails: billingDetails)
        }
        let cardParams = Mappers.mapCardParams(params: data.object(forKey: "cardDetails") as! NSDictionary)
        
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
                let intent = Mappers.mapFromSetupIntent(setupIntent: setupIntent!)
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
    func presentApplePay(params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
        if (merchantIdentifier == nil) {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide merchantIdentifier", nil)
            return
        }
        
        guard let summaryItems = params.object(forKey: "cartItems") as? NSArray else {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide the items for purchase", nil)
            return
        }
        guard let country = params.object(forKey: "country") as? String else {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide the country", nil)
            return
        }
        guard let currency = params.object(forKey: "currency") as? String else {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide the payment currency", nil)
            return
        }
        
        applePayRequestResolver = resolve
        
        let merchantIdentifier = self.merchantIdentifier ?? ""
        let paymentRequest = StripeAPI.paymentRequest(withMerchantIdentifier: merchantIdentifier, country: country, currency: currency)
        
        let requiredShippingAddressFields = params["requiredShippingAddressFields"] as? NSArray ?? NSArray()
        let requiredBillingContactFields = params["requiredBillingContactFields"] as? NSArray ?? NSArray()
        let shippingMethods = params["shippingMethods"] as? NSArray ?? NSArray()
        
        paymentRequest.requiredShippingContactFields = Set(requiredShippingAddressFields.map {
            Mappers.mapToPKContactField(field: $0 as! String)
        })
        
        paymentRequest.requiredBillingContactFields = Set(requiredBillingContactFields.map {
            Mappers.mapToPKContactField(field: $0 as! String)
        })
        
        paymentRequest.shippingMethods = Mappers.mapToShippingMethods(shippingMethods: shippingMethods)
        
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
    
    @objc(createPaymentMethod:options:resolver:rejecter:)
    func createPaymentMethod(
        data: NSDictionary,
        options: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        var billing: STPPaymentMethodBillingDetails? = nil
        if let billingDetails = data.object(forKey: "billingDetails") as! NSDictionary? {
            billing = Mappers.mapToBillingDetails(billingDetails: billingDetails)
        }
        let paymentMethodParams = Mappers.mapCardParamsToPaymentMethodParams(params: data.object(forKey: "cardDetails") as! NSDictionary, billingDetails: billing)
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
                if let paymentIntent = paymentIntent {
                    resolve(Mappers.mapFromPaymentIntent(paymentIntent: paymentIntent))
                }
                break
            @unknown default:
                reject(NextPaymentActionErrorType.Unknown.rawValue, "Cannot complete payment", nil)
                break
            }
        }
    }
    
    @objc(confirmPaymentMethod:data:options:resolver:rejecter:)
    func confirmPaymentMethod(
        paymentIntentClientSecret: String,
        data: NSDictionary,
        options: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        let paymentMethodId = data.object(forKey: "paymentMethodId") as! String?
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: paymentIntentClientSecret)
        
        var billing: STPPaymentMethodBillingDetails? = nil
        if let billingDetails = data.object(forKey: "billingDetails") as! NSDictionary? {
            billing = Mappers.mapToBillingDetails(billingDetails: billingDetails)
        }
        if paymentMethodId != nil {
            paymentIntentParams.paymentMethodId = paymentMethodId
        } else {
            guard let cardDetails = data.object(forKey: "cardDetails") as! NSDictionary? else {
                let message = "To confirm the payment you must provide card details or paymentMethodId"
                reject(ConfirmPaymentErrorType.Failed.rawValue, message, nil)
                self.onPaymentErrorCallback?([NSNull(), Errors.createError(code: ConfirmPaymentErrorType.Failed.rawValue, message: message)])
                return
            }
            let paymentMethodParams = Mappers.mapCardParamsToPaymentMethodParams(params: cardDetails, billingDetails: billing)
            paymentIntentParams.paymentMethodParams = paymentMethodParams
        }
        
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
                if let paymentIntent = paymentIntent {
                    let intent = Mappers.mapFromPaymentIntent(paymentIntent: paymentIntent)
                    resolve(intent)
                    self.onPaymentSuccessCallback?([NSNull(), intent])
                }
                break
            @unknown default:
                reject(ConfirmPaymentErrorType.Unknown.rawValue, "Cannot complete payment", nil)
                self.onPaymentErrorCallback?([NSNull(), Errors.createError(code: ConfirmPaymentErrorType.Unknown.rawValue, message: "Cannot complete payment")])
                break
            }
        }
        
    }
    
    @objc(retrievePaymentIntent:resolver:rejecter:)
    func retrievePaymentIntent(
        clientSecret: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        STPAPIClient.shared.retrievePaymentIntent(withClientSecret: clientSecret) { (paymentIntent, error) in
            guard error == nil else {
                reject(RetrievePaymentIntentErrorType.Unknown.rawValue, error?.localizedDescription, nil)
                return
            }
            
            if let paymentIntent = paymentIntent {
                resolve(Mappers.mapFromPaymentIntent(paymentIntent: paymentIntent))
            } else {
                reject(RetrievePaymentIntentErrorType.Unknown.rawValue, "Cannot retrieve PaymentIntent", nil)
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
