//
//  CardField.swift
//  StripeSdk
//
//  Created by Arkadiusz Kubaczkowski on 17/11/2020.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation
import UIKit

class CardFieldView: UIView, STPPaymentCardTextFieldDelegate {
    @objc var onCardChange: RCTDirectEventBlock?

    func paymentCardTextFieldDidChange(_ textField: STPPaymentCardTextField) {
        if onCardChange != nil {
            onCardChange!([
                "cardNumber": textField.cardNumber ?? "",
                "cvc": textField.cvc ?? "",
                "postalCode": textField.postalCode ?? "",
                "month": textField.expirationMonth,
                "year": textField.expirationYear
            ])
        }
    }
    
    private var cardField = STPPaymentCardTextField()
    
    @objc var postalCodeEnabled: Bool = true {
        didSet {
            cardField.postalCodeEntryEnabled = postalCodeEnabled
        }
    }
    
    var theme = STPTheme.default()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        cardField.delegate = self
        self.addSubview(cardField)
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
