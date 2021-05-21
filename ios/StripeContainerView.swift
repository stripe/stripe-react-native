import Foundation
import UIKit

class StripeContainerView: UIView {
    override init(frame: CGRect) {
        super.init(frame: frame)
        
        let tap: UITapGestureRecognizer = UITapGestureRecognizer(target: self, action: #selector(endEditing(_:)))

        tap.cancelsTouchesInView = false
        self.addGestureRecognizer(tap)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
