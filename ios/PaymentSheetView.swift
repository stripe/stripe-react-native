//import Foundation
//import UIKit
//import Stripe
//
//class PaymentSheetView: UIView {
//    @objc var onCardChange: RCTDirectEventBlock?
//    
//    private var paymentSheet: PaymentSheet?
//        
//
//    override init(frame: CGRect) {
//        super.init(frame: frame)
//        
//        // MARK: Create a PaymentSheet instance
//        var configuration = PaymentSheet.Configuration()
//        configuration.merchantDisplayName = "Example, Inc."
//        var paymentIntentClientSecret = ""
//        var customerEphemeralKeySecret = ""
//        var customerId = "asdad"
//        configuration.customer = .init(id: customerId, ephemeralKeySecret: customerEphemeralKeySecret)
//        self.paymentSheet = PaymentSheet(paymentIntentClientSecret: paymentIntentClientSecret, configuration: configuration)
////        self.addSubview(cardField)
//    }
//    
////    override func layoutSubviews() {
////        cardField.frame = self.bounds
////    }
//    
//    required init?(coder: NSCoder) {
//        fatalError("init(coder:) has not been implemented")
//    }
//    
//    
//    
//}
