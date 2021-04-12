import Foundation
import UIKit
import Stripe

@objc(AuBECSDebitFormView)
class AuBECSDebitFormView: UIView, STPAUBECSDebitFormViewDelegate {

    var auBecsFormView: STPAUBECSDebitFormView?
    @objc var onCompleteAction: RCTDirectEventBlock?
    @objc var companyName: NSString?
    
    override func didSetProps(_ changedProps: [String]!) {
        if let auBecsFormView = self.auBecsFormView {
            auBecsFormView.removeFromSuperview()
        }
        
        self.auBecsFormView = STPAUBECSDebitFormView(companyName: (companyName ?? "") as String)
        self.auBecsFormView?.becsDebitFormDelegate = self
       
        if let auBecsFormView = self.auBecsFormView {
            self.addSubview(auBecsFormView)
        }
    }
    
    func auBECSDebitForm(_ form: STPAUBECSDebitFormView, didChangeToStateComplete complete: Bool) {
        onCompleteAction!([
            "accountNumber": form.paymentMethodParams?.auBECSDebit?.accountNumber ?? "",
            "bsbNumber": form.paymentMethodParams?.auBECSDebit?.bsbNumber ?? "",
            "name": form.paymentMethodParams?.billingDetails?.name ?? "",
            "email": form.paymentMethodParams?.billingDetails?.email ?? ""
        ])
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
    }
    
    override func layoutSubviews() {
        if let auBecsFormView = self.auBecsFormView {
            auBecsFormView.frame = self.bounds
        }
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
