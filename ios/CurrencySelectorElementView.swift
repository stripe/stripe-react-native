//
//  CurrencySelectorElementView.swift
//  stripe-react-native
//
//  Created by Nick Porter on 5/7/26.
//

import Combine
import Foundation
@_spi(ReactNativeSDK) import StripePaymentSheet
import UIKit

@objc(StripeCurrencySelectorElementManager)
class StripeCurrencySelectorElementManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return StripeCurrencySelectorElementContainerView(frame: .zero)
    }
}

@objc(StripeCurrencySelectorElementContainerView)
public class StripeCurrencySelectorElementContainerView: UIView {

    // MARK: - Bridge-exposed Props

    @objc public var sessionKey: String? {
        didSet {
            guard sessionKey != oldValue else { return }
            attachToSessionIfPossible()
        }
    }

    @objc public var disabled: Bool = false {
        didSet {
            selectorView?.isEnabled = !disabled
        }
    }

    /// Fired whenever the inner selector's intrinsic height changes so RN
    /// can match it. Session-state changes flow through the central
    /// `checkoutSessionDidChangeState` event on `StripeSdk` (see
    /// `CheckoutStateBridge`), so this view does not need to push state.
    @objc public var onHeightChange: RCTDirectEventBlock?

    // MARK: - Private Properties

    private var selectorView: Checkout.CurrencySelectorView?
    private var sessionCancellable: AnyCancellable?
    private var lastReportedHeight: CGFloat = -1

    // MARK: - Init

    override public init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        clipsToBounds = true
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Layout

    public override func layoutSubviews() {
        super.layoutSubviews()
        reportHeightIfNeeded()
    }

    // MARK: - Setup

    private func attachToSessionIfPossible() {
        Task { @MainActor in
            guard let key = self.sessionKey,
                  let checkout = StripeSdkImpl.shared.checkoutInstances[key] else {
                self.detach()
                return
            }

            // Already showing a selector — leave it in place. Re-creating
            // would interrupt the inner view's loading animation and reset
            // its enabled state mid-API-call.
            if self.selectorView != nil {
                return
            }

            self.installSelectorView(for: checkout)
            self.subscribeForLayoutUpdates(on: checkout)
        }
    }

    /// We don't push state to JS here — `CheckoutStateBridge` already does
    /// that for the whole session. This subscription only nudges Auto Layout
    /// so the caption-text changes after a currency selection are reflected
    /// in our reported height back to RN.
    private func subscribeForLayoutUpdates(on checkout: Checkout) {
        sessionCancellable = checkout.$state
            .dropFirst()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self else { return }
                self.setNeedsLayout()
                self.layoutIfNeeded()
                self.reportHeightIfNeeded()
            }
    }

    private func installSelectorView(for checkout: Checkout) {
        let view = Checkout.CurrencySelectorView(checkout: checkout)
        view.translatesAutoresizingMaskIntoConstraints = false
        view.isEnabled = !disabled
        addSubview(view)

        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: topAnchor),
            view.leadingAnchor.constraint(equalTo: leadingAnchor),
            view.trailingAnchor.constraint(equalTo: trailingAnchor),
            view.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        selectorView = view

        // Force an initial height report so RN can lay us out at zero
        // when Adaptive Pricing is unavailable.
        setNeedsLayout()
        layoutIfNeeded()
    }

    private func detach() {
        sessionCancellable?.cancel()
        sessionCancellable = nil
        selectorView?.removeFromSuperview()
        selectorView = nil
        lastReportedHeight = -1
    }

    // MARK: - Events

    private func reportHeightIfNeeded() {
        let desiredHeight: CGFloat
        if let selectorView, !selectorView.isHidden {
            desiredHeight = selectorView.systemLayoutSizeFitting(
                CGSize(width: bounds.width, height: UIView.layoutFittingCompressedSize.height),
                withHorizontalFittingPriority: .required,
                verticalFittingPriority: .fittingSizeLevel
            ).height
        } else {
            desiredHeight = 0
        }

        guard desiredHeight != lastReportedHeight else { return }
        lastReportedHeight = desiredHeight
        onHeightChange?(["height": desiredHeight])
    }
}
