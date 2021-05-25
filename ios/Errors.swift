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
        let error: NSDictionary = [
            "code": code,
            "message": message ?? NSNull(),
            "localizedMessage": localizedMessage ?? message ?? NSNull(),
            "declineCode": NSNull(),
            "type": NSNull(),
        ]
        
        return ["error": error]
    }
    class func createError (_ code: String, _ error: NSError?) -> NSDictionary {
        let error: NSDictionary = [
            "code": code,
            "message": error?.description ?? NSNull(),
            "localizedMessage": error?.localizedDescription ?? NSNull(),
            "declineCode": NSNull(),
            "type": NSNull(),
        ]
        
        return ["error": error]
    }
    class func createError (_ code: String, _ error: STPSetupIntentLastSetupError?) -> NSDictionary {
        let error: NSDictionary = [
            "code": code,
            "message": error?.message ?? "",
            "localizedMessage": error?.message ?? "",
            "declineCode": error?.declineCode ?? NSNull(),
            "type": error?.type.rawValue ?? NSNull(),
        ]
        
        return ["error": error]
    }
    
    class func createError (_ code: String, _ error: STPPaymentIntentLastPaymentError?) -> NSDictionary {
        let error: NSDictionary = [
            "code": code,
            "message": error?.message ?? "",
            "localizedMessage": error?.message ?? "",
            "declineCode": error?.declineCode ?? NSNull(),
            "type": error?.type.rawValue ?? NSNull(),
        ]
        
        return ["error": error]
    }
}
