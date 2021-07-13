import Foundation
import UIKit
import Stripe

let CARD_FORM_INSTANCE_ID = "CardFormInstance"

class CardFormView: UIView, STPCardFormViewDelegate {
    private var cardForm: STPCardFormView?
    
    public var delegate: CardFieldDelegate?

    public var cardParams: STPPaymentMethodCardParams? = nil
    
    @objc var dangerouslyGetFullCardDetails: Bool = false
    @objc var onCardComplete: RCTDirectEventBlock?
    @objc var autofocus: Bool = false
    @objc var isUserInteractionEnabledValue: Bool = true
    @objc var cardStyle: NSDictionary = NSDictionary()
    
    override func didSetProps(_ changedProps: [String]!) {
        if let cardForm = self.cardForm {
            cardForm.removeFromSuperview()
        }
        
        let style = self.cardStyle["type"] as? String == "borderless" ? STPCardFormViewStyle.borderless : STPCardFormViewStyle.standard
        let _cardForm = STPCardFormView(style: style)
        _cardForm.delegate = self
        _cardForm.isUserInteractionEnabled = isUserInteractionEnabledValue
        
        if autofocus == true {
            let _ = _cardForm.becomeFirstResponder()
        }
        
        setStyles()

        self.cardForm = _cardForm
        self.addSubview(_cardForm)
    }

    func cardFormView(_ form: STPCardFormView, didChangeToStateComplete complete: Bool) {
        if onCardComplete != nil {
            let brand = STPCardValidator.brand(forNumber: cardForm?.cardParams?.card?.number ?? "")
            var cardData: [String: Any?] = [
                "expiryMonth": cardForm?.cardParams?.card?.expMonth ?? NSNull(),
                "expiryYear": cardForm?.cardParams?.card?.expYear ?? NSNull(),
                "complete": complete,
                "brand": Mappers.mapCardBrand(brand) ?? NSNull(),
                "last4": cardForm?.cardParams?.card?.last4 ?? "",
                "postalCode": cardForm?.cardParams?.billingDetails?.address?.postalCode ?? "",
                "country": cardForm?.cardParams?.billingDetails?.address?.country
            ]

            if (dangerouslyGetFullCardDetails) {
                cardData["number"] = cardForm?.cardParams?.card?.number ?? ""
            }
            if (complete) {
                self.cardParams = cardForm?.cardParams?.card
            } else {
                self.cardParams = nil
            }
            onCardComplete!(cardData as [AnyHashable : Any])
        }
    }
    
    func focus() {
        let _ = cardForm?.becomeFirstResponder()
    }
    
    func blur() {
        let _ = cardForm?.resignFirstResponder()
    }
    
    func setStyles() {
        if let backgroundColor = cardStyle["backgroundColor"] as? String {
            cardForm?.backgroundColor = UIColor(hexString: backgroundColor)
        }
        if let disabledBackgroundColor = cardStyle["disabledBackgroundColor"] as? String {
            cardForm?.disabledBackgroundColor = UIColor(hexString: disabledBackgroundColor)
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
    }
    
    convenience init(delegate: CardFieldDelegate) {
        self.init(frame: CGRect.zero)
        self.delegate = delegate
        
        self.delegate?.onDidCreateViewInstance(id: CARD_FORM_INSTANCE_ID, reference: self)
    }
    
    override func layoutSubviews() {
        cardForm?.frame = self.bounds
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
