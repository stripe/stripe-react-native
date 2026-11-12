import Combine
import React
@_spi(ReactNativeSDK) @_spi(InternalOnlyAPI) import StripePaymentSheet
import UIKit

/// Hosts the Express Checkout Element owned by a registered Checkout controller.
@objc(CheckoutExpressCheckoutElementContainerView)
@MainActor
public final class CheckoutExpressCheckoutElementContainerView: UIView {
    @objc public var controllerId: String? {
        didSet {
            guard oldValue != controllerId else { return }
            detach()
            attach()
        }
    }
    @objc public var onHeightChanged: RCTDirectEventBlock?
    private var element: ExpressCheckoutElement?
    private var destruction: AnyCancellable?
    private var sessionObservation: AnyCancellable?
    private var reportedHeight: CGFloat?

    override public func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil { detach() } else { attach() }
    }

    private func attach() {
        guard window != nil, element == nil, let controllerId,
              let instance = StripeSdkImpl.shared.checkoutControllers[controllerId], !instance.isDestroyed,
              let element = instance.expressCheckoutElement else { return }
        let view = element.uiView
        guard view.superview == nil else {
            assertionFailure("A Checkout Express Checkout Element can only be mounted once.")
            return
        }
        self.element = element
        view.translatesAutoresizingMaskIntoConstraints = false
        addSubview(view)
        // Let the native intrinsic height determine its size, independent of JS height write-backs.
        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: topAnchor),
            view.leadingAnchor.constraint(equalTo: leadingAnchor),
            view.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])
        destruction = instance.observeDestruction { [weak self] in self?.detach() }
        sessionObservation = instance.checkout.$session
            .dropFirst()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                // `$session` emits before the value is stored, and the SDK delivers its view
                // updates asynchronously on the main queue, so measure after both have run.
                DispatchQueue.main.async { [weak self] in
                    self?.setNeedsLayout()
                    self?.layoutIfNeeded()
                }
            }
        setNeedsLayout()
    }

    @objc public func detach() {
        destruction?.cancel()
        destruction = nil
        sessionObservation?.cancel()
        sessionObservation = nil
        element?.uiView.removeFromSuperview()
        element = nil
        reportedHeight = nil
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        guard let view = element?.uiView, bounds.width > 0 else { return }
        let size = view.systemLayoutSizeFitting(
            CGSize(width: bounds.width, height: UIView.layoutFittingCompressedSize.height),
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        )
        let height = ceil(size.height)
        if height != reportedHeight {
            reportedHeight = height
            onHeightChanged?(["height": height])
        }
    }
}
