import Foundation
import UIKit
import Stripe


class CardFieldView: UIView {

    private var cardField = STPPaymentCardTextField()
    
  
    
    override init(frame: CGRect) {
        super.init(frame: frame)

        self.addSubview(cardField)
    }
    

    
    override func layoutSubviews() {
        cardField.frame = self.bounds
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
   
    
}
