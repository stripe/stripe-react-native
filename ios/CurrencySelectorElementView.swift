import Foundation
import UIKit

/// Minimal stub so the JS-side `CurrencySelectorElement` codegen mapping
/// resolves at app launch. The real implementation (hosting
/// `Checkout.CurrencySelectorView`, height reporting, session observation)
/// lives on the full-feature branch and will replace this once that lands.
@objc(StripeCurrencySelectorElementContainerView)
public class StripeCurrencySelectorElementContainerView: UIView {
    @objc public var sessionKey: String?

    @objc public var disabled: Bool = false

    @objc public var onHeightChange: RCTDirectEventBlock?

    public override init(frame: CGRect) {
        super.init(frame: frame)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
