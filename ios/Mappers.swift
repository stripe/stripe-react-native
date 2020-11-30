
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
        cardSourceParams.number = RCTConvert.nsString(params["cardNumber"])
        cardSourceParams.cvc = RCTConvert.nsString(params["cvc"])
        cardSourceParams.expMonth = RCTConvert.nsuInteger(params["expiryMonth"])
        cardSourceParams.expYear = RCTConvert.nsuInteger(params["expiryYear"])
        
        let cardParams = STPPaymentMethodCardParams(cardSourceParams: cardSourceParams)
        return STPPaymentMethodParams(card: cardParams, billingDetails: nil, metadata: nil)
    }
    
    class func mapFromIntent (paymentIntent: STPPaymentIntent?) -> NSDictionary {
        let intent: NSDictionary = [
            "id": paymentIntent?.paymentMethodId ?? "",
            "currency": paymentIntent?.currency ?? "",
            "status": Mappers.mapIntentStatus(status: paymentIntent?.status),
            "description": paymentIntent?.description ?? "",
            "receiptEmail": paymentIntent?.receiptEmail ?? "",
            "stripeId": paymentIntent?.stripeId ?? "",
        ]
        
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
        cardSourceParams.number = RCTConvert.nsString(params["cardNumber"])
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
            "created": Int(setupIntent.created.timeIntervalSince1970 * 1000) // convert to unix timestamp
        ]
        
        return intent
    }
    
}
