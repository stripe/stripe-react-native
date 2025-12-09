//
//  NavigationBarView.swift
//  stripe-react-native
//

import Foundation
import UIKit

@objc(NavigationBarView)
public class NavigationBarView: UIView {
    @objc public var onCloseButtonPress: RCTDirectEventBlock?

    private var navigationBar: UINavigationBar!
    private var navigationItem: UINavigationItem!

    @objc public var title: NSString? {
        didSet {
            navigationItem.title = title as String?
        }
    }

    override public init(frame: CGRect) {
        super.init(frame: frame)
        setupNavigationBar()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupNavigationBar() {
        // Create navigation bar
        navigationBar = UINavigationBar(frame: .zero)
        navigationBar.translatesAutoresizingMaskIntoConstraints = false

        // Create navigation item
        navigationItem = UINavigationItem()
        navigationBar.items = [navigationItem]

        // Add close button on the right
        let closeButton = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeButtonTapped)
        )
        navigationItem.rightBarButtonItem = closeButton

        // Add to view
        addSubview(navigationBar)

        // Setup constraints
        NSLayoutConstraint.activate([
            navigationBar.topAnchor.constraint(equalTo: topAnchor),
            navigationBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            navigationBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            navigationBar.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    @objc private func closeButtonTapped() {
        if let onCloseButtonPress = onCloseButtonPress {
            onCloseButtonPress([:])
        }
    }
}
