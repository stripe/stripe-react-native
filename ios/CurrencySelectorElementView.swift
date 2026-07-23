//
//  CurrencySelectorElementView.swift
//  stripe-react-native
//
//  Created by Nick Porter on 5/7/26.
//

import Foundation
import UIKit

@objc(StripeCurrencySelectorElementManager)
class StripeCurrencySelectorElementManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool {
        true
    }

    override func view() -> UIView! {
        StripeCurrencySelectorElementContainerView(frame: .zero)
    }
}

@objc(StripeCurrencySelectorElementContainerView)
public class StripeCurrencySelectorElementContainerView: UIView {
    private var hasReportedZeroHeight = false

    @objc public var sessionKey: String?
    @objc public var disabled: Bool = false
    @objc public var appearance: NSDictionary?
    @objc public var onHeightChange: RCTDirectEventBlock? {
        didSet {
            hasReportedZeroHeight = false
            reportZeroHeight()
        }
    }

    override public init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        clipsToBounds = true
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    public override var intrinsicContentSize: CGSize {
        CGSize(width: UIView.noIntrinsicMetric, height: 0)
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        reportZeroHeight()
    }

    private func reportZeroHeight() {
        guard !hasReportedZeroHeight, let onHeightChange else {
            return
        }
        hasReportedZeroHeight = true
        onHeightChange(["height": 0])
    }
}
