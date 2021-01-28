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

enum RecoveryFlowErrorType: String {
    case Unknown, Card
}

class Errors {
    class func createError (code: String, message: String) -> NSDictionary {
        let error: NSDictionary = [
            "code": code,
            "message": message,
        ]
        
        return error
    }
}
