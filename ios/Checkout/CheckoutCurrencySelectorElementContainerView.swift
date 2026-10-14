import Combine
import React
@_spi(ReactNativeSDK) @_spi(STP) import StripePaymentSheet
import UIKit

/// Hosts the Currency Selector Element owned by a registered Checkout controller.
@objc(CheckoutCurrencySelectorElementContainerView)
@MainActor
public final class CheckoutCurrencySelectorElementContainerView: UIView, CheckoutElementMountHost {
    @objc public var controllerId: String? {
        didSet {
            guard oldValue != controllerId else { return }
            detach()
            attach()
        }
    }
    @objc public var onHeightChanged: RCTDirectEventBlock?
    private var element: CurrencySelectorElement?
    private var registeredElementView: UIView?
    private var elementConstraints: [NSLayoutConstraint] = []
    private var destruction: AnyCancellable?
    private var sessionObservation: AnyCancellable?
    private var reportedHeight: CGFloat?
    private lazy var nativeDelegate = ElementDelegate(view: self)

    override public func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil { detach() } else { attach() }
    }

    private func attach() {
        guard window != nil, element == nil, let controllerId,
              let instance = StripeSdkImpl.shared.checkoutControllers[controllerId],
              let element = instance.currencySelectorElement else {
            return
        }
        let view = element.uiView
        guard CheckoutElementMounts.claim(view, for: self) else { return }
        registeredElementView = view
        self.element = element
        view.translatesAutoresizingMaskIntoConstraints = false
        addSubview(view)
        elementConstraints = [
            view.topAnchor.constraint(equalTo: topAnchor),
            view.leadingAnchor.constraint(equalTo: leadingAnchor),
            view.trailingAnchor.constraint(equalTo: trailingAnchor),
            view.bottomAnchor.constraint(equalTo: bottomAnchor),
        ]
        NSLayoutConstraint.activate(elementConstraints)
        element.delegate = nativeDelegate
        destruction = instance.observeDestruction { [weak self] in self?.detach() }
        sessionObservation = instance.checkout.$session
            .dropFirst()
            .sink { [weak self] _ in
                self?.setNeedsLayout()
                self?.layoutIfNeeded()
            }
        setNeedsLayout()
    }

    @objc public func detach() {
        relinquishElementForAnotherHost()
        if let registeredElementView {
            self.registeredElementView = nil
            CheckoutElementMounts.release(registeredElementView, from: self)
        }
    }

    func relinquishElementForAnotherHost() {
        destruction?.cancel()
        destruction = nil
        sessionObservation?.cancel()
        sessionObservation = nil
        element?.delegate = nil
        NSLayoutConstraint.deactivate(elementConstraints)
        elementConstraints = []
        element?.uiView.removeFromSuperview()
        element = nil
        reportedHeight = nil
    }

    func mountElementIfAvailable() { attach() }

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

// Keep Stripe SPI types out of the public Objective-C view interface.
@MainActor
private final class ElementDelegate: CurrencySelectorElementDelegate {
    private weak var view: CheckoutCurrencySelectorElementContainerView?

    init(view: CheckoutCurrencySelectorElementContainerView) { self.view = view }

    func currencySelectorElementDidUpdateHeight(currencySelectorElement: CurrencySelectorElement) {
        view?.setNeedsLayout()
        view?.layoutIfNeeded()
    }
}
