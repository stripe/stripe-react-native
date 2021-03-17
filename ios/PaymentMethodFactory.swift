import Foundation
import Stripe


class PaymentMethodFactory {
    var billingDetailsParams: STPPaymentMethodBillingDetails? = nil
    var params: NSDictionary? = nil
    
    init(params: NSDictionary) {
        self.billingDetailsParams = Mappers.mapToBillingDetails(billingDetails: params["billingDetails"] as? NSDictionary)
        self.params = params
    }
    
    func create(paymentMethodType: STPPaymentMethodType) throws -> STPPaymentMethodParams? {
        do {
            switch paymentMethodType {
            case STPPaymentMethodType.iDEAL:
                return try createIDEALPaymentMethodParams()
            case STPPaymentMethodType.card:
                return try createCardPaymentMethodParams()
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
}

enum PaymentMethodError: Error {
    case cardPaymentMissingParams
    case idealPaymentMissingParams
    case paymentNotSupported
}

extension PaymentMethodError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .cardPaymentMissingParams:
            return NSLocalizedString("You must provide card details", comment: "Create payment error")
        case .idealPaymentMissingParams:
            return NSLocalizedString("You must provide bank contact", comment: "Create payment error")
        case .paymentNotSupported:
            return NSLocalizedString("This payment type is not supported yet", comment: "Create payment error")
        }
    }
}
