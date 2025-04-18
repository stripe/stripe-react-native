import Foundation
import UIKit
import Stripe

@objc(CardFieldView)
public class CardFieldView: UIView, STPPaymentCardTextFieldDelegate {
    @objc public var onCardChange: RCTDirectEventBlock?
    @objc public var onFocusChange: RCTDirectEventBlock?
    @objc public var dangerouslyGetFullCardDetails: Bool = false

    private var cardField = STPPaymentCardTextField()

    public var cardParams: STPPaymentMethodParams? = nil
    public var cardPostalCode: String? = nil

    @objc public var disabled: Bool = false {
        didSet {
            cardField.isUserInteractionEnabled = !disabled
        }
    }

    @objc public var postalCodeEnabled: Bool = true {
        didSet {
            cardField.postalCodeEntryEnabled = postalCodeEnabled
        }
    }

    @objc public var countryCode: String? {
        didSet {
            cardField.countryCode = countryCode
        }
    }

    @objc public var onBehalfOf: String? {
        didSet {
            cardField.onBehalfOf = onBehalfOf
        }
    }

    @objc public var preferredNetworks: Array<Int>? {
        didSet {
            if let preferredNetworks = preferredNetworks {
                cardField.preferredNetworks = preferredNetworks.map(Mappers.intToCardBrand).compactMap { $0 }
            }
        }
    }

    @objc public var placeholders: NSDictionary = NSDictionary() {
        didSet {
            if let numberPlaceholder = placeholders["number"] as? String {
                cardField.numberPlaceholder = numberPlaceholder
            } else {
                cardField.numberPlaceholder = "1234123412341234"
            }
            if let expirationPlaceholder = placeholders["expiration"] as? String {
                cardField.expirationPlaceholder = expirationPlaceholder
            }
            if let cvcPlaceholder = placeholders["cvc"] as? String {
                cardField.cvcPlaceholder = cvcPlaceholder
            }
            if let postalCodePlaceholder = placeholders["postalCode"] as? String {
                cardField.postalCodePlaceholder = postalCodePlaceholder
            }
        }
    }

    @objc public var autofocus: Bool = false {
        didSet {
            if autofocus == true {
                cardField.reactFocus()
            }
        }
    }

    @objc public var cardStyle: NSDictionary = NSDictionary() {
        didSet {
            if let borderWidth = cardStyle["borderWidth"] as? Int {
                cardField.borderWidth = CGFloat(borderWidth)
            } else {
                cardField.borderWidth = CGFloat(0)
            }
            if let backgroundColor = cardStyle["backgroundColor"] as? String {
                cardField.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let borderColor = cardStyle["borderColor"] as? String {
                cardField.borderColor = UIColor(hexString: borderColor)
            }
            if let borderRadius = cardStyle["borderRadius"] as? Int {
                cardField.cornerRadius = CGFloat(borderRadius)
            }
            if let cursorColor = cardStyle["cursorColor"] as? String {
                cardField.cursorColor = UIColor(hexString: cursorColor)
            }
            if let textColor = cardStyle["textColor"] as? String {
                cardField.textColor = UIColor(hexString: textColor)
            }
            if let textErrorColor = cardStyle["textErrorColor"] as? String {
                cardField.textErrorColor = UIColor(hexString: textErrorColor)
            }
            let fontSize = cardStyle["fontSize"] as? Int ?? 14

            if let fontFamily = cardStyle["fontFamily"] as? String {
                cardField.font = UIFont(name: fontFamily, size: CGFloat(fontSize)) ?? UIFont.systemFont(ofSize: CGFloat(fontSize))
            } else {
                if let fontSize = cardStyle["fontSize"] as? Int {
                    cardField.font = UIFont.systemFont(ofSize: CGFloat(fontSize))
                }
            }
            if let placeholderColor = cardStyle["placeholderColor"] as? String {
                cardField.placeholderColor = UIColor(hexString: placeholderColor)
            }
        }
    }

    override public init(frame: CGRect) {
        super.init(frame: frame)
        cardField.delegate = self

        self.addSubview(cardField)

        StripeSdkImpl.shared.cardFieldView = self
    }

    @objc public func focus() {
        cardField.becomeFirstResponder()
    }

    @objc public func blur() {
        cardField.resignFirstResponder()
    }

    @objc public func clear() {
        cardField.clear()
    }

    public func paymentCardTextFieldDidEndEditing(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": ""])
    }

    public func paymentCardTextFieldDidBeginEditingNumber(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "CardNumber"])
    }

    public func paymentCardTextFieldDidBeginEditingCVC(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "Cvc"])
    }

    public func paymentCardTextFieldDidBeginEditingExpiration(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "ExpiryDate"])
    }

    public func paymentCardTextFieldDidBeginEditingPostalCode(_ textField: STPPaymentCardTextField) {
        onFocusChange?(["focusedField": "PostalCode"])
    }

    public func paymentCardTextFieldDidChange(_ textField: STPPaymentCardTextField) {
        if onCardChange != nil {
            let brand = STPCardValidator.brand(forNumber: textField.cardNumber ?? "")
            let validExpiryDate = STPCardValidator.validationState(
                forExpirationYear: textField.formattedExpirationYear ?? "",
                inMonth: textField.formattedExpirationMonth ?? ""
            )
            let validCVC = STPCardValidator.validationState(forCVC: textField.cvc ?? "", cardBrand: brand)
            let validNumber = STPCardValidator.validationState(forNumber: textField.cardNumber ?? "", validatingCardBrand: true)
            var cardData: [String: Any?] = [
                "expiryMonth": textField.expirationMonth,
                "expiryYear": textField.expirationYear,
                "complete": textField.isValid,
                "brand": Mappers.mapFromCardBrand(brand) ?? NSNull(),
                "last4": textField.paymentMethodParams.card!.last4 ?? "",
                "validExpiryDate": Mappers.mapFromCardValidationState(state: validExpiryDate),
                "validCVC": Mappers.mapFromCardValidationState(state: validCVC),
                "validNumber": Mappers.mapFromCardValidationState(state: validNumber)
            ]
            if (cardField.postalCodeEntryEnabled) {
                cardData["postalCode"] = textField.postalCode ?? ""
            }
            if (dangerouslyGetFullCardDetails) {
                cardData["number"] = textField.cardNumber ?? ""
                cardData["cvc"] = textField.cvc ?? ""
            }
            onCardChange!(["card": cardData as [AnyHashable : Any]])
        }
        if (textField.isValid) {
            self.cardParams = textField.paymentMethodParams
            self.cardPostalCode = textField.postalCode
        } else {
            self.cardParams = nil
            self.cardPostalCode = nil
        }
    }

    override public func layoutSubviews() {
        cardField.frame = self.bounds
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
