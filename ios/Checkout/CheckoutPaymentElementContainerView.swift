import Combine
@_spi(STP) import StripePaymentSheet
import UIKit

/// Hosts the UIKit view owned by a registered Checkout controller.
@objc(CheckoutPaymentElementContainerView)
@MainActor
public final class CheckoutPaymentElementContainerView: UIView {
    @objc public var controllerId: String? {
        didSet {
            guard oldValue != controllerId else { return }
            detach()
            attach()
        }
    }
    @objc public var onHeightChanged: RCTDirectEventBlock?
    private var elementView: PaymentElementUIView?
    private var destruction: AnyCancellable?
    private var reportedHeight: CGFloat?
    private lazy var nativeDelegate = ElementDelegate(view: self)

    override public func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil { detach() } else { attach() }
    }

    private func attach() {
        guard window != nil, elementView == nil, let controllerId,
              let instance = StripeSdkImpl.shared.checkoutControllers[controllerId] else {
            return
        }
        let view = instance.checkout.getPaymentElement().uiView
        guard view.superview == nil else {
            assertionFailure("A Checkout Payment Element can only be mounted once.")
            return
        }
        elementView = view
        view.delegate = nativeDelegate
        addSubview(view)
        destruction = instance.observeDestruction { [weak self] in self?.detach() }
        setNeedsLayout()
    }

    @objc public func detach() {
        destruction?.cancel()
        destruction = nil
        elementView?.delegate = nil
        elementView?.removeFromSuperview()
        elementView = nil
        reportedHeight = nil
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        guard let elementView, bounds.width > 0 else { return }
        let size = elementView.systemLayoutSizeFitting(CGSize(width: bounds.width, height: UIView.layoutFittingCompressedSize.height))
        let height = ceil(size.height)
        elementView.frame = CGRect(x: 0, y: 0, width: bounds.width, height: height)
        if height != reportedHeight {
            reportedHeight = height
            onHeightChanged?(["height": height])
        }
    }

}

// Keep Stripe SPI types out of the public Objective-C view interface.
@MainActor
private final class ElementDelegate: PaymentElementViewDelegate {
    private weak var view: CheckoutPaymentElementContainerView?

    init(view: CheckoutPaymentElementContainerView) { self.view = view }

    func paymentElementViewDidUpdateHeight(paymentElementView: PaymentElementUIView) {
        view?.setNeedsLayout()
    }

}
