import Foundation
import UIKit
import Stripe

class CardFieldView: UIView, STPPaymentCardTextFieldDelegate {
    @objc var onCardChange: RCTDirectEventBlock?
    @objc var onFocusChange: RCTDirectEventBlock?
    
    private var theme = STPTheme.defaultTheme
    
    private var cardField = STPPaymentCardTextField()
    
    private let cardParams = STPPaymentMethodCardParams()
    
    @objc var postalCodeEnabled: Bool = true {
        didSet {
            cardField.postalCodeEntryEnabled = postalCodeEnabled
        }
    }
    
    @objc var defaultValue: NSDictionary? {
        didSet {
            if (cardParams.number != nil || cardParams.cvc != nil || cardParams.expMonth != nil || cardParams.expYear != nil) {
                return
            }
            cardParams.number = defaultValue?.object(forKey: "number") as? String
            cardParams.cvc = defaultValue?.object(forKey: "cvc") as? String
            cardParams.expMonth = defaultValue?.object(forKey: "expiryMonth") as? NSNumber
            cardParams.expYear = defaultValue?.object(forKey: "expiryYear") as? NSNumber
            cardField.cardParams = cardParams
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        cardField.delegate = self
        self.addSubview(cardField)
    }
    
    func paymentCardTextFieldDidBeginEditingNumber(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "CardNumber"])
    }
    
    func paymentCardTextFieldDidBeginEditingCVC(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "Cvc"])
    }
    
    func paymentCardTextFieldDidBeginEditingExpiration(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "ExpiryDate"])
    }
    
    func paymentCardTextFieldDidBeginEditingPostalCode(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "PostalCode"])
    }
    
    func paymentCardTextFieldDidChange(_ textField: STPPaymentCardTextField) {
        if onCardChange != nil {
            var cardData: [String: Any] = [
                "number": textField.cardParams.number ?? "",
                "cvc": textField.cardParams.cvc ?? "",
                "expiryMonth": textField.cardParams.expMonth ?? 0,
                "expiryYear": textField.cardParams.expYear ?? 0
            ]
            if (cardField.postalCodeEntryEnabled) {
                cardData["postalCode"] = textField.postalCode ?? ""
            }
            onCardChange!(cardData)
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
