import PassKit
import Stripe

@objc(StripeSdk)
class StripeSdk: NSObject, STPApplePayContextDelegate  {
    var merchantIdentifier: String? = nil
    
    private var paymentSheet: PaymentSheet?
    private var paymentSheetFlowController: PaymentSheet.FlowController?
    
    var applePayRequestResolver: RCTPromiseResolveBlock? = nil
    var applePayCompletionCallback: STPIntentClientSecretCompletionBlock? = nil
    var applePayRequestRejecter: RCTPromiseRejectBlock? = nil
    var applePayCompletionRejecter: RCTPromiseRejectBlock? = nil
    var confirmSetupIntentPromise: RCTResponseSenderBlock? = nil
    var confirmApplePayPaymentResolver: RCTPromiseResolveBlock? = nil
    
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
    
    @objc(initPaymentSheet:resolver:rejecter:)
    func initPaymentSheet(params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        guard let customerId = params["customerId"] as? String else {
            reject(PaymentSheetErrorType.Failed.rawValue, "You must provide the customer ID", nil)
            return
        }
        guard let customerEphemeralKeySecret = params["customerEphemeralKeySecret"] as? String else {
            reject(PaymentSheetErrorType.Failed.rawValue, "You must provide the customerEphemeralKeySecret", nil)
            return
        }
        guard let paymentIntentClientSecret = params["paymentIntentClientSecret"] as? String else {
            reject(PaymentSheetErrorType.Failed.rawValue, "You must provide the paymentIntentClientSecret", nil)
            return
        }
        
        
        var configuration = PaymentSheet.Configuration()
        
        if  params["applePay"] as? Bool == true {
            if let merchantIdentifier = self.merchantIdentifier, let merchantCountryCode = params["merchantCountryCode"] as? String {
                configuration.applePay = .init(merchantId: merchantIdentifier,
                                               merchantCountryCode: merchantCountryCode)
            } else {
                reject(PaymentSheetErrorType.Failed.rawValue, "merchantIdentifier or merchantCountryCode is not provided", nil)
            }
        }
        
        if let merchantDisplayName = params["merchantDisplayName"] as? String {
            configuration.merchantDisplayName = merchantDisplayName
        }
        
        configuration.customer = .init(id: customerId, ephemeralKeySecret: customerEphemeralKeySecret)
        
        if #available(iOS 13.0, *) {
            if let style = params["style"] as? String {
                configuration.style = Mappers.mapToUserInterfaceStyle(style)
            }
        }
        
        if params["customFlow"] as? Bool == true {
            PaymentSheet.FlowController.create(paymentIntentClientSecret: paymentIntentClientSecret,
                                               configuration: configuration) { [weak self] result in
                switch result {
                case .failure(let error):
                    reject("Failed", error.localizedDescription, nil)
                case .success(let paymentSheetFlowController):
                    self?.paymentSheetFlowController = paymentSheetFlowController
                    if let paymentOption = self?.paymentSheetFlowController?.paymentOption {
                        let option: NSDictionary = [
                            "label": paymentOption.label,
                            "image": paymentOption.image.pngData()?.base64EncodedString() ?? ""
                        ]
                        resolve(option)
                    } else {
                        resolve(NSNull())
                    }
                }
            }
        } else {
            self.paymentSheet = PaymentSheet(paymentIntentClientSecret: paymentIntentClientSecret, configuration: configuration)
            resolve(NSNull())
        }
    }

    @objc(confirmPaymentSheetPayment:rejecter:)
    func confirmPaymentSheetPayment(resolver resolve: @escaping RCTPromiseResolveBlock,
                                    rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        DispatchQueue.main.async {
            self.paymentSheetFlowController?.confirmPayment(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()) { paymentResult in
                switch paymentResult {
                case .completed(let paymentIntent):
                    resolve(Mappers.mapFromPaymentIntent(paymentIntent: paymentIntent))
                case .canceled:
                    reject(PaymentSheetErrorType.Canceled.rawValue, "The payment has been canceled", nil)
                case .failed(let error, _):
                    reject(PaymentSheetErrorType.Failed.rawValue, error.localizedDescription, nil)
                }
            }
        }
    }
    
    @objc(presentPaymentSheet:resolver:rejecter:)
    func presentPaymentSheet(params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        let confirmPayment = params["confirmPayment"] as? Bool
        
        DispatchQueue.main.async {
            if (confirmPayment == false) {
                self.paymentSheetFlowController?.presentPaymentOptions(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()) {
                    if let paymentOption = self.paymentSheetFlowController?.paymentOption {
                        let option: NSDictionary = [
                            "label": paymentOption.label,
                            "image": paymentOption.image.pngData()?.base64EncodedString() ?? ""
                        ]
                        resolve(["paymentOption": option])
                    } else {
                        resolve(NSNull())
                    }
                }
            } else {
                self.paymentSheet?.present(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()) { paymentResult in
                    switch paymentResult {
                    case .completed(let paymentIntent):
                        resolve(["paymentIntent": Mappers.mapFromPaymentIntent(paymentIntent: paymentIntent)])
                    case .canceled:
                        reject(PaymentSheetErrorType.Canceled.rawValue, "The payment has been canceled", nil)
                    case .failed(let error, _):
                        reject(PaymentSheetErrorType.Failed.rawValue, error.localizedDescription, nil)
                    }
                }
            }
        }
    }
    
    
    
    @objc(createTokenForCVCUpdate:resolver:rejecter:)
    func createTokenForCVCUpdate(cvc: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let cvc = cvc else {
            reject("Failed", "You must provide CVC", nil)
            return;
        }
        
        STPAPIClient.shared.createToken(forCVCUpdate: cvc) { (token, error) in
            if error != nil || token == nil {
                reject("Failed", error?.localizedDescription, nil)
            } else {
                let tokenId = token?.tokenId
                resolve(tokenId)
            }
        }
    }
    
    @objc(confirmSetupIntent:data:options:resolver:rejecter:)
    func confirmSetupIntent (setupIntentClientSecret: String, data: NSDictionary,
                             options: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
        var billing: STPPaymentMethodBillingDetails? = nil
        if let billingDetails = data["billingDetails"] as? NSDictionary {
            billing = Mappers.mapToBillingDetails(billingDetails: billingDetails)
        }
        let cardParams = Mappers.mapCardParams(params: data["cardDetails"] as! NSDictionary)
        
        let paymentMethodParams = STPPaymentMethodParams(card: cardParams, billingDetails: billing, metadata: nil)
        let setupIntentParams = STPSetupIntentConfirmParams(clientSecret: setupIntentClientSecret)
        setupIntentParams.paymentMethodParams = paymentMethodParams
        
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmSetupIntent(setupIntentParams, with: self) { status, setupIntent, error in
            switch (status) {
            case .failed:
                reject(ConfirmSetupIntentErrorType.Failed.rawValue, error?.localizedDescription ?? "", nil)
                break
            case .canceled:
                reject(ConfirmSetupIntentErrorType.Canceled.rawValue, error?.localizedDescription ?? "", nil)
                break
            case .succeeded:
                let intent = Mappers.mapFromSetupIntent(setupIntent: setupIntent!)
                resolve(intent)
            @unknown default:
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
        self.confirmApplePayPaymentResolver = resolve
    }
    
    func applePayContext(_ context: STPApplePayContext, didCompleteWith status: STPPaymentStatus, error: Error?) {
        switch status {
        case .success:
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
            confirmApplePayPaymentResolver?([NSNull()])
            break
        case .error:
            let message = "Apple pay completion failed"
            applePayCompletionRejecter?(ApplePayErrorType.Failed.rawValue, message, nil)
            applePayRequestRejecter?(ApplePayErrorType.Failed.rawValue, message, nil)
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
            break
        case .userCancellation:
            let message = "Apple pay payment has been cancelled"
            applePayCompletionRejecter?(ApplePayErrorType.Canceled.rawValue, message, nil)
            applePayRequestRejecter?(ApplePayErrorType.Canceled.rawValue, message, nil)
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
            break
        @unknown default:
            let message = "Cannot complete payment"
            applePayCompletionRejecter?(ApplePayErrorType.Unknown.rawValue, message, nil)
            applePayRequestRejecter?(ApplePayErrorType.Unknown.rawValue, message, nil)
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
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
        
        guard let summaryItems = params["cartItems"] as? NSArray else {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide the items for purchase", nil)
            return
        }
        guard let country = params["country"] as? String else {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide the country", nil)
            return
        }
        guard let currency = params["currency"] as? String else {
            reject(ApplePayErrorType.Failed.rawValue, "You must provide the payment currency", nil)
            return
        }
        
        self.applePayRequestResolver = resolve
        self.applePayRequestRejecter = reject
        
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
    
    @objc(createPaymentMethod:options:resolver:rejecter:)
    func createPaymentMethod(
        data: NSDictionary,
        options: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> Void {
        var billing: STPPaymentMethodBillingDetails? = nil
        if let billingDetails = data["billingDetails"] as! NSDictionary? {
            billing = Mappers.mapToBillingDetails(billingDetails: billingDetails)
        }
        let paymentMethodParams = Mappers.mapCardParamsToPaymentMethodParams(params: data["cardDetails"] as! NSDictionary, billingDetails: billing)
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
        let paymentMethodId = data["paymentMethodId"] as? String
        let paymentIntentParams = STPPaymentIntentParams(clientSecret: paymentIntentClientSecret)
        if let setupFutureUsage = data["setupFutureUsage"] as? String {
            paymentIntentParams.setupFutureUsage = Mappers.mapToPaymentIntentFutureUsage(usage: setupFutureUsage)
        }
        
        var billingDetails: STPPaymentMethodBillingDetails? = nil
        if let billing = data["billingDetails"] as? NSDictionary {
            billingDetails = Mappers.mapToBillingDetails(billingDetails: billing)
        }
        
        if let cvc = data["cvc"] as? String {
            let cardOptions = STPConfirmCardOptions()
            cardOptions.cvc = cvc;
            let paymentMethodOptions = STPConfirmPaymentMethodOptions()
            paymentMethodOptions.cardOptions = cardOptions
            paymentIntentParams.paymentMethodOptions = paymentMethodOptions
        } else if paymentMethodId != nil {
            paymentIntentParams.paymentMethodId = paymentMethodId
        } else {
            guard let cardDetails = data["cardDetails"] as? NSDictionary else {
                let message = "To confirm the payment you must provide card details or paymentMethodId"
                reject(ConfirmPaymentErrorType.Failed.rawValue, message, nil)
                return
            }
            let paymentMethodParams = Mappers.mapCardParamsToPaymentMethodParams(params: cardDetails, billingDetails: billingDetails)
            paymentIntentParams.paymentMethodParams = paymentMethodParams
        }
        
        let paymentHandler = STPPaymentHandler.shared()
        paymentHandler.confirmPayment(paymentIntentParams, with: self) { (status, paymentIntent, error) in
            switch (status) {
            case .failed:
                reject(ConfirmPaymentErrorType.Failed.rawValue, error?.localizedDescription ?? "", nil)
                break
            case .canceled:
                reject(ConfirmPaymentErrorType.Canceled.rawValue, error?.localizedDescription ?? "", nil)
                break
            case .succeeded:
                if let paymentIntent = paymentIntent {
                    let intent = Mappers.mapFromPaymentIntent(paymentIntent: paymentIntent)
                    resolve(intent)
                }
                break
            @unknown default:
                reject(ConfirmPaymentErrorType.Unknown.rawValue, "Cannot complete payment", nil)
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
