import Stripe

class Mappers {
    class func mapIntentStatus(status: STPPaymentIntentStatus?) -> String {
        if let status = status {
            switch status {
            case STPPaymentIntentStatus.succeeded: return "Succeeded"
            case STPPaymentIntentStatus.requiresPaymentMethod: return "RequiresPaymentMethod"
            case STPPaymentIntentStatus.requiresConfirmation: return "RequiresConfirmation"
            case STPPaymentIntentStatus.canceled: return "Canceled"
            case STPPaymentIntentStatus.processing: return "Processing"
            case STPPaymentIntentStatus.requiresAction: return "RequiresAction"
            case STPPaymentIntentStatus.requiresCapture: return "RequiresCapture"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }
    
    class func mapCardParamsToPaymentMethodParams(params: NSDictionary) -> STPPaymentMethodParams {
        let cardSourceParams = STPCardParams()
        cardSourceParams.number = RCTConvert.nsString(params["number"])
        cardSourceParams.cvc = RCTConvert.nsString(params["cvc"])
        cardSourceParams.expMonth = RCTConvert.nsuInteger(params["expiryMonth"])
        cardSourceParams.expYear = RCTConvert.nsuInteger(params["expiryYear"])
        
        let cardParams = STPPaymentMethodCardParams(cardSourceParams: cardSourceParams)
        return STPPaymentMethodParams(card: cardParams, billingDetails: nil, metadata: nil)
    }
    
    
    class func mapCaptureMethod(_ captureMethod: STPPaymentIntentCaptureMethod?) -> String {
        if let captureMethod = captureMethod {
            switch captureMethod {
            case STPPaymentIntentCaptureMethod.automatic: return "Automatic"
            case STPPaymentIntentCaptureMethod.manual: return "Manual"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }
    
    class func mapConfirmationMethod(_ confirmationMethod: STPPaymentIntentConfirmationMethod?) -> String {
        if let confirmationMethod = confirmationMethod {
            switch confirmationMethod {
            case STPPaymentIntentConfirmationMethod.automatic: return "Automatic"
            case STPPaymentIntentConfirmationMethod.manual: return "Manual"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }
    
    class func mapIntentShipping(_ shipping: STPPaymentIntentShippingDetails) -> NSDictionary {
        var addressDetails = NSDictionary()
        if let address = shipping.address {
            addressDetails = [
                "city": address.city ?? "",
                "country": address.country ?? "",
                "line1": address.line1 ?? "",
                "line2":address.line2 ?? "",
                "postalCode": address.postalCode ?? "",
            ]
        }
        let shippingDetails: NSDictionary = [
            "address": addressDetails,
            "name": shipping.name ?? "",
            "phone": shipping.phone ?? "",
            "trackingNumber": shipping.trackingNumber ?? "",
            "carrier": shipping.carrier ?? "",
        ]
        return shippingDetails
    }
    
    class func mapFromIntent (paymentIntent: STPPaymentIntent?) -> NSDictionary {
        let intent: NSMutableDictionary = [
            "id": paymentIntent?.stripeId ?? "",
            "currency": paymentIntent?.currency ?? "",
            "status": Mappers.mapIntentStatus(status: paymentIntent?.status),
            "description": paymentIntent?.description ?? "",
            "created": Int(paymentIntent?.created.timeIntervalSince1970 ?? 0 * 1000),
            "clientSecret": paymentIntent?.clientSecret ?? "",
            "receiptEmail": paymentIntent?.receiptEmail ?? "",
            "isLiveMode": paymentIntent?.livemode ?? false,
            "paymentMethodId": paymentIntent?.paymentMethodId ?? "",
            "captureMethod": mapCaptureMethod(paymentIntent?.captureMethod),
            "confirmationMethod": mapConfirmationMethod(paymentIntent?.confirmationMethod)
        ]
        
        if let lastPaymentError = paymentIntent?.lastPaymentError {
            let paymentError = [
                "code": lastPaymentError.code,
                "message": lastPaymentError.description
            ]
            intent.setValue(paymentError, forKey: "lastPaymentError")
        }
        
        if let shipping = paymentIntent?.shipping {
            intent.setValue(mapIntentShipping(shipping), forKey: "shipping")
        }
        
        if let amount = paymentIntent?.amount {
            intent.setValue(amount, forKey: "amount")
        }
        if let canceledAt = paymentIntent?.canceledAt {
            intent.setValue(Int(canceledAt.timeIntervalSince1970 * 1000), forKey: "canceledAt")
        }
        
        return intent;
    }
    
    class func mapToBillingDetails(billingDetails: NSDictionary) -> STPPaymentMethodBillingDetails {
        let billing = STPPaymentMethodBillingDetails()
        billing.email = RCTConvert.nsString(billingDetails["email"])
        billing.phone = RCTConvert.nsString(billingDetails["phone"])
        billing.name = RCTConvert.nsString(billingDetails["name"])
        
        let billingAddres = STPPaymentMethodAddress()
        
        billingAddres.city = RCTConvert.nsString(billingDetails["addressCity"])
        billingAddres.postalCode = RCTConvert.nsString(billingDetails["addressPostalCode"])
        billingAddres.country = RCTConvert.nsString(billingDetails["addressCountry"])
        billingAddres.line1 = RCTConvert.nsString(billingDetails["addressLine1"])
        billingAddres.line2 = RCTConvert.nsString(billingDetails["addressLine2"])
        billingAddres.state = RCTConvert.nsString(billingDetails["addressState"])
        
        billing.address = billingAddres
        
        return billing
    }
    
    class func mapCardParams(params: NSDictionary) -> STPPaymentMethodCardParams {
        let cardSourceParams = STPCardParams()
        cardSourceParams.number = RCTConvert.nsString(params["number"])
        cardSourceParams.cvc = RCTConvert.nsString(params["cvc"])
        cardSourceParams.expMonth = RCTConvert.nsuInteger(params["expiryMonth"])
        cardSourceParams.expYear = RCTConvert.nsuInteger(params["expiryYear"])
        
        return STPPaymentMethodCardParams(cardSourceParams: cardSourceParams)
    }
    
    class func mapIntentStatus(status: STPSetupIntentStatus?) -> String {
        if let status = status {
            switch status {
            case STPSetupIntentStatus.succeeded: return "Succeeded"
            case STPSetupIntentStatus.requiresPaymentMethod: return "RequiresPaymentMethod"
            case STPSetupIntentStatus.requiresConfirmation: return "RequiresConfirmation"
            case STPSetupIntentStatus.canceled: return "Canceled"
            case STPSetupIntentStatus.processing: return "Processing"
            case STPSetupIntentStatus.requiresAction: return "RequiresAction"
            case STPSetupIntentStatus.unknown: return "Unknown"
            default: return "Unknown"
            }
        }
        return "Unknown"
        
    }
    
    class func mapFromSetupIntentResult(setupIntent: STPSetupIntent) -> NSDictionary {
        let intent: NSDictionary = [
            "id": setupIntent.stripeID,
            "status": mapIntentStatus(status: setupIntent.status),
            "description": setupIntent.stripeDescription ?? "",
            "created": Int(setupIntent.created?.timeIntervalSince1970 ?? 0 * 1000) // convert to unix timestamp
        ]
        
        return intent
    }
    
    class func mapUICustomization(_ params: NSDictionary) -> STPThreeDSUICustomization {
        let uiCustomization = STPThreeDSUICustomization()
        if let labelSettings = params["label"] as? Dictionary<String, Any?> {
            if let headingTextColor = labelSettings["headingTextColor"] as? String {
                uiCustomization.labelCustomization.headingTextColor = UIColor(hexString: headingTextColor)
            }
            if let textColor = labelSettings["textColor"] as? String {
                uiCustomization.labelCustomization.textColor = UIColor(hexString: textColor)
            }
            if let headingFontSize = labelSettings["headingFontSize"] as? Int {
                uiCustomization.labelCustomization.headingFont = UIFont.systemFont(ofSize: CGFloat(headingFontSize))
            }
            if let textFontSize = labelSettings["textFontSize"] as? Int {
                uiCustomization.labelCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
        }
        
        if let navigationBarSettings = params["navigationBar"] as? Dictionary<String, Any?> {
            if let barTintColor = navigationBarSettings["barTintColor"] as? String {
                uiCustomization.navigationBarCustomization.barTintColor = UIColor(hexString: barTintColor)
            }
            if let barStyle = navigationBarSettings["barStyle"] as? Int {
                uiCustomization.navigationBarCustomization.barStyle = UIBarStyle(rawValue: barStyle) ?? .default
            }
            if let headerText = navigationBarSettings["headerText"] as? String {
                uiCustomization.navigationBarCustomization.headerText = headerText
            }
            if let buttonText = navigationBarSettings["buttonText"] as? String {
                uiCustomization.navigationBarCustomization.buttonText = buttonText
            }
            if let textFontSize = navigationBarSettings["textFontSize"] as? Int {
                uiCustomization.navigationBarCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = navigationBarSettings["textColor"] as? String {
                uiCustomization.navigationBarCustomization.textColor = UIColor(hexString: textColor)
            }
            if let translucent = navigationBarSettings["translucent"] as? Bool {
                uiCustomization.navigationBarCustomization.translucent = translucent
            }
        }
        
        if let textFieldSettings = params["textField"] as? Dictionary<String, Any?> {
            if let borderColor = textFieldSettings["borderColor"] as? String {
                uiCustomization.textFieldCustomization.borderColor = UIColor(hexString: borderColor)
            }
            if let borderWidth = textFieldSettings["borderWidth"] as? Int {
                uiCustomization.textFieldCustomization.borderWidth = CGFloat(borderWidth)
            }
            if let cornerRadius = textFieldSettings["cornerRadius"] as? Int {
                uiCustomization.textFieldCustomization.cornerRadius = CGFloat(cornerRadius)
            }
            if let textColor = textFieldSettings["textColor"] as? String {
                uiCustomization.textFieldCustomization.textColor = UIColor(hexString: textColor)
            }
            if let textFontSize = textFieldSettings["textFontSize"] as? Int {
                uiCustomization.textFieldCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
        }
        
        if let footerSettings = params["footer"] as? Dictionary<String, Any?> {
            if let backgroundColor = footerSettings["backgroundColor"] as? String {
                uiCustomization.footerCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let chevronColor = footerSettings["chevronColor"] as? String {
                uiCustomization.footerCustomization.chevronColor = UIColor(hexString: chevronColor)
            }
            if let headingTextColor = footerSettings["headingTextColor"] as? String {
                uiCustomization.footerCustomization.headingTextColor = UIColor(hexString: headingTextColor)
            }
            if let textColor = footerSettings["textColor"] as? String {
                uiCustomization.footerCustomization.textColor = UIColor(hexString: textColor)
            }
        }
        
        if let submitButtonSettings = params["submitButton"] as? Dictionary<String, Any?> {
            let buttonCustomization = uiCustomization.buttonCustomization(for: STPThreeDSCustomizationButtonType.submit)
            
            if let backgroundColor = submitButtonSettings["backgroundColor"] as? String {
                buttonCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let cornerRadius = submitButtonSettings["cornerRadius"] as? Int {
                buttonCustomization.cornerRadius = CGFloat(cornerRadius)
            }
            if let textFontSize = submitButtonSettings["textFontSize"] as? Int {
                buttonCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = submitButtonSettings["textColor"] as? String {
                buttonCustomization.textColor = UIColor(hexString: textColor)
            }
        }
        
        if let backgroundColor = params["backgroundColor"] as? String {
            uiCustomization.backgroundColor = UIColor(hexString: backgroundColor)
        }
        
        return uiCustomization
    }
    
}
