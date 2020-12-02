import Foundation
import UIKit
import Stripe

class CardFieldView: UIView, STPPaymentCardTextFieldDelegate {
    @objc var onCardChange: RCTDirectEventBlock?
    
    private var theme = STPTheme.defaultTheme
    
    private var cardField = STPPaymentCardTextField()
    
    private let cardParams = STPPaymentMethodCardParams()
    
    @objc var postalCodeEnabled: Bool = true {
        didSet {
            cardField.postalCodeEntryEnabled = postalCodeEnabled
        }
    }

    @objc var value: NSDictionary? {
        didSet {
            cardParams.number = value?.object(forKey: "cardNumber") as? String
            cardParams.cvc = value?.object(forKey: "cvc") as? String
            cardParams.expMonth = value?.object(forKey: "expiryMonth") as? NSNumber
            cardParams.expYear = value?.object(forKey: "expiryYear") as? NSNumber
            cardField.cardParams = cardParams
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        cardField.delegate = self
        self.addSubview(cardField)
    }
    
    func paymentCardTextFieldDidChange(_ textField: STPPaymentCardTextField) {
        if onCardChange != nil {
            onCardChange!([
                "cardNumber": textField.cardParams.number ?? "",
                "cvc": textField.cardParams.cvc ?? "",
                "postalCode": textField.postalCode ?? "",
                "expiryMonth": textField.cardParams.expMonth,
                "expiryYear": textField.cardParams.expYear
            ])
        }
    }

    override func layoutSubviews() {
        cardField.frame = self.bounds
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func paymentContext(_ paymentContext: STPPaymentContext, didFailToLoadWithError error: Error) {
        //
    }
    
    func paymentContextDidChange(_ paymentContext: STPPaymentContext) {
        //
    }
    
    func paymentContext(_ paymentContext: STPPaymentContext, didCreatePaymentResult paymentResult: STPPaymentResult, completion: @escaping STPPaymentStatusBlock) {
        //
    }
    
    func paymentContext(_ paymentContext: STPPaymentContext, didFinishWith status: STPPaymentStatus, error: Error?) {
        //
    }
    
}
