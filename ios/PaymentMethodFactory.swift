import Foundation
import Stripe


class PaymentMethodFactory {
    var billingDetailsParams: STPPaymentMethodBillingDetails? = nil
    var params: NSDictionary? = nil
    
    init(params: NSDictionary) {
        self.billingDetailsParams = Mappers.mapToBillingDetails(billingDetails: params["billingDetails"] as? NSDictionary)
        self.params = params
    }
    
    func createParams(paymentMethodType: STPPaymentMethodType) throws -> STPPaymentMethodParams? {
        do {
            switch paymentMethodType {
            case STPPaymentMethodType.iDEAL:
                return try createIDEALPaymentMethodParams()
            case STPPaymentMethodType.card:
                return try createCardPaymentMethodParams()
            case STPPaymentMethodType.alipay:
                return try createAlipayPaymentMethodParams()
            case STPPaymentMethodType.bancontact:
                return try createBancontactPaymentMethodParams()
            case STPPaymentMethodType.giropay:
                return try createGiropayPaymentMethodParams()
            case STPPaymentMethodType.EPS:
                return try createEPSPaymentMethodParams()
            case STPPaymentMethodType.grabPay:
                return createGrabpayPaymentMethodParams()
            case STPPaymentMethodType.przelewy24:
                return try createP24PaymentMethodParams()
            default:
                throw PaymentMethodError.paymentNotSupported
            }
        } catch {
            throw error
        }
    }
    
    func createOptions(paymentMethodType: STPPaymentMethodType) throws -> STPConfirmPaymentMethodOptions? {
        do {
            switch paymentMethodType {
            case STPPaymentMethodType.alipay:
                return try createAlipayPaymentMethodOptions()
            case STPPaymentMethodType.iDEAL:
                return nil
            case STPPaymentMethodType.EPS:
                return nil
            case STPPaymentMethodType.card:
                return nil
            case STPPaymentMethodType.bancontact:
                return nil
            case STPPaymentMethodType.giropay:
                return nil
            case STPPaymentMethodType.grabPay:
                return nil
            case STPPaymentMethodType.przelewy24:
                return nil
            default:
                throw PaymentMethodError.paymentNotSupported
            }
        } catch {
            throw error
        }
    }
    
    private func createIDEALPaymentMethodParams() throws -> STPPaymentMethodParams {
        guard let bankName = self.params?["bankName"] as? String else {
            throw PaymentMethodError.idealPaymentMissingParams
        }
        let params = STPPaymentMethodiDEALParams()
        params.bankName = bankName
        
        return STPPaymentMethodParams(iDEAL: params, billingDetails: billingDetailsParams, metadata: nil)
    }
    
    private func createGrabpayPaymentMethodParams() -> STPPaymentMethodParams {
        let params = STPPaymentMethodGrabPayParams()

        return STPPaymentMethodParams(grabPay: params, billingDetails: billingDetailsParams, metadata: nil)
    }
    
    private func createCardPaymentMethodParams() throws -> STPPaymentMethodParams {
        guard let cardParams = self.params?["cardDetails"] as? NSDictionary else {
            throw PaymentMethodError.cardPaymentMissingParams
        }
        
        let card = Mappers.mapToPaymentMethodCardParams(params: cardParams)
        return STPPaymentMethodParams(card: card, billingDetails: billingDetailsParams, metadata: nil)
    }
    
    private func createAlipayPaymentMethodParams() throws -> STPPaymentMethodParams {
        return STPPaymentMethodParams(alipay: STPPaymentMethodAlipayParams(), billingDetails: billingDetailsParams, metadata: nil)
    }
    
    private func createP24PaymentMethodParams() throws -> STPPaymentMethodParams {
        let params = STPPaymentMethodPrzelewy24Params()
        
        guard let billingDetails = billingDetailsParams else {
            throw PaymentMethodError.p24PaymentMissingParams
        }
        
        return STPPaymentMethodParams(przelewy24: params, billingDetails: billingDetails, metadata: nil)
    }
    
    private func createAlipayPaymentMethodOptions() throws -> STPConfirmPaymentMethodOptions {
        let options = STPConfirmPaymentMethodOptions()
        options.alipayOptions = STPConfirmAlipayOptions()
        return options
    }
    
    private func createBancontactPaymentMethodParams() throws -> STPPaymentMethodParams {
        let params = STPPaymentMethodBancontactParams()
        
        guard let billingDetails = billingDetailsParams else {
            throw PaymentMethodError.bancontactPaymentMissingParams
        }
        
        return STPPaymentMethodParams(bancontact: params, billingDetails: billingDetails, metadata: nil)
    }
    
    private func createGiropayPaymentMethodParams() throws -> STPPaymentMethodParams {
        let params = STPPaymentMethodGiropayParams()
        
        guard let billingDetails = billingDetailsParams else {
            throw PaymentMethodError.giropayPaymentMissingParams
        }
        
        return STPPaymentMethodParams(giropay: params, billingDetails: billingDetails, metadata: nil)
    }
    
    private func createEPSPaymentMethodParams() throws -> STPPaymentMethodParams {
        let params = STPPaymentMethodEPSParams()
        
        guard let billingDetails = billingDetailsParams else {
            throw PaymentMethodError.epsPaymentMissingParams
        }
        
        return STPPaymentMethodParams(eps: params, billingDetails: billingDetails, metadata: nil)
    }
}

enum PaymentMethodError: Error {
    case cardPaymentMissingParams
    case epsPaymentMissingParams
    case idealPaymentMissingParams
    case paymentNotSupported
    case bancontactPaymentMissingParams
    case giropayPaymentMissingParams
    case p24PaymentMissingParams
}

extension PaymentMethodError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .cardPaymentMissingParams:
            return NSLocalizedString("You must provide card details", comment: "Create payment error")
        case .giropayPaymentMissingParams:
            return NSLocalizedString("You must provide billing details", comment: "Create payment error")
        case .idealPaymentMissingParams:
            return NSLocalizedString("You must provide bank name", comment: "Create payment error")
        case .p24PaymentMissingParams:
            return NSLocalizedString("You must provide billing details", comment: "Create payment error")
        case .bancontactPaymentMissingParams:
            return NSLocalizedString("You must provide billing details", comment: "Create payment error")
        case .epsPaymentMissingParams:
            return NSLocalizedString("You must provide billing details", comment: "Create payment error")
        case .paymentNotSupported:
            return NSLocalizedString("This payment type is not supported yet", comment: "Create payment error")
        }
    }
}
