import Stripe

enum ConfirmPaymentErrorType: String {
    case Failed, Canceled, Unknown
}

enum ApplePayErrorType: String {
    case Failed, Canceled, Unknown
}

enum NextPaymentActionErrorType: String {
    case Failed, Canceled, Unknown
}

enum ConfirmSetupIntentErrorType: String {
    case Failed, Canceled, Unknown
}

enum RetrievePaymentIntentErrorType: String {
    case Unknown
}

enum PaymentSheetErrorType: String {
    case Failed, Canceled
}

enum CreateTokenErrorType: String {
    case Failed
}

class Errors {
    class func createError (_ code: String, _ message: String?, _ localizedMessage: String?) -> NSDictionary {
        let lm = localizedMessage ?? message
        let value: NSDictionary = [
            "code": code,
            "message": message ?? NSNull(),
            "localizedMessage": lm ?? NSNull(),
            "declineCode": NSNull(),
            "stripeErrorCode": NSNull(),
            "type": NSNull()
        ]
        
        return ["error": value]
    }
    class func createError (_ code: String, _ error: NSError?) -> NSDictionary {
        let value: NSDictionary = [
            "code": code,
            "message": error?.userInfo["com.stripe.lib:ErrorMessageKey"] ?? NSNull(),
            "localizedMessage": error?.userInfo["NSLocalizedDescription"] ?? NSNull(),
            "declineCode": error?.userInfo["com.stripe.lib:DeclineCodeKey"] ?? NSNull(),
            "stripeErrorCode": error?.userInfo["com.stripe.lib:StripeErrorCodeKey"] ?? NSNull(),
            "type": error?.userInfo["com.stripe.lib:StripeErrorTypeKey"] ?? NSNull(),
        ]
        
        return ["error": value]
    }
    class func createError (_ code: String, _ error: STPSetupIntentLastSetupError?) -> NSDictionary {
        let value: NSDictionary = [
            "code": code,
            "message": error?.message ?? "",
            "localizedMessage": error?.message ?? "",
            "declineCode": error?.declineCode ?? NSNull(),
            "stripeErrorCode": error?.code ?? NSNull(),
            "type": Mappers.mapFromSetupIntentLastPaymentErrorType(error?.type)
        ]
        
        return ["error": value]
    }
    
    class func createError (_ code: String, _ error: STPPaymentIntentLastPaymentError?) -> NSDictionary {
        let value: NSDictionary = [
            "code": code,
            "message": error?.message ?? "",
            "localizedMessage": error?.message ?? "",
            "declineCode": error?.declineCode ?? NSNull(),
            "stripeErrorCode": error?.code ?? NSNull(),
            "type": Mappers.mapFromPaymentIntentLastPaymentErrorType(error?.type)
        ]
        
        return ["error": value]
    }
}
