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
            case STPPaymentMethodType.FPX:
                return try createFPXPaymentMethodParams()
            case STPPaymentMethodType.alipay:
                return try createAlipayPaymentMethodParams()
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
            case STPPaymentMethodType.iDEAL:
                return nil
            case STPPaymentMethodType.card:
                return try createCardPaymentMethodOptions()
            case STPPaymentMethodType.FPX:
                return nil
            case STPPaymentMethodType.alipay:
                return try createAlipayPaymentMethodOptions()
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
    
    private func createCardPaymentMethodParams() throws -> STPPaymentMethodParams {
        guard let cardParams = self.params?["cardDetails"] as? NSDictionary else {
            throw PaymentMethodError.cardPaymentMissingParams
        }
        
        let card = Mappers.mapToPaymentMethodCardParams(params: cardParams)
        return STPPaymentMethodParams(card: card, billingDetails: billingDetailsParams, metadata: nil)
    }
    
    
    private func createCardPaymentMethodOptions() -> STPConfirmPaymentMethodOptions? {
        let cvc = params?["cvc"] as? String
        guard cvc != nil else {
            return nil
        }

        let cardOptions = STPConfirmCardOptions()
        cardOptions.cvc = cvc;
        let paymentMethodOptions = STPConfirmPaymentMethodOptions()
        paymentMethodOptions.cardOptions = cardOptions
        
        return paymentMethodOptions
    }
    
    private func createFPXPaymentMethodParams() throws -> STPPaymentMethodParams {
        guard let bankName = self.params?["bankName"] as? String else {
            throw PaymentMethodError.idealPaymentMissingParams
        }
        let params = STPPaymentMethodFPXParams()
        params.rawBankString = bankName

        return STPPaymentMethodParams(fpx: params, billingDetails: billingDetailsParams, metadata: nil)
    }
    
    private func createAlipayPaymentMethodParams() throws -> STPPaymentMethodParams {
        return STPPaymentMethodParams(alipay: STPPaymentMethodAlipayParams(), billingDetails: billingDetailsParams, metadata: nil)
    }
    
    private func createAlipayPaymentMethodOptions() throws -> STPConfirmPaymentMethodOptions {
        let options = STPConfirmPaymentMethodOptions()
        options.alipayOptions = STPConfirmAlipayOptions()
        return options
    }
}

enum PaymentMethodError: Error {
    case cardPaymentMissingParams
    case idealPaymentMissingParams
    case paymentNotSupported
    case fpxPaymentMissingParams
    case cardPaymentOptionsMissingParams
}

extension PaymentMethodError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .cardPaymentMissingParams:
            return NSLocalizedString("You must provide card details", comment: "Create payment error")
        case .idealPaymentMissingParams:
            return NSLocalizedString("You must provide bank name", comment: "Create payment error")
        case .fpxPaymentMissingParams:
            return NSLocalizedString("You must provide bank name", comment: "Create payment error")
        case .paymentNotSupported:
            return NSLocalizedString("This payment type is not supported yet", comment: "Create payment error")
        case .cardPaymentOptionsMissingParams:
            return NSLocalizedString("You must provide CVC number", comment: "Create payment error")
        }
       
    }
}
