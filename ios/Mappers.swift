enum ConfirmPaymentErrorType: String {
    case Failed, Canceled, Unknown
}

enum ApplePayErrorType: String {
    case Failed, Canceled, Unknown
}

enum NextPaymentActionErrorType: String {
    case Failed, Canceled, Unknown
}

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
    
    class func mapCardParams(params: NSDictionary) -> STPPaymentMethodParams {
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
    
    class func createError (code: String, message: String) -> NSDictionary {
        let error: NSDictionary = [
            "code": code,
            "message": message,
        ]
        
        return error
    }
}
