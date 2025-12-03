//
//  ConnectAccountOnboardingViewController.swift
//  stripe-react-native
//

import Foundation
import UIKit

class ConnectAccountOnboardingViewController: UIViewController {
    var onClose: (() -> Void)?
    private var reactContentView: UIView?

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        // Configure view controller to extend content behind navigation bar
        extendedLayoutIncludesOpaqueBars = true
        edgesForExtendedLayout = .all

        // Setup navigation bar
        setupNavigationBar()

        // Add React content view if available
        if let contentView = reactContentView {
            addReactContent(contentView)
        }
    }

    private func setupNavigationBar() {
        // Configure navigation bar appearance to be translucent
        if let navigationBar = navigationController?.navigationBar {
            // Make navigation bar translucent so content shows behind it
            navigationBar.isTranslucent = true

            // Optional: Customize appearance
            let appearance = UINavigationBarAppearance()
            appearance.configureWithDefaultBackground()

            navigationBar.standardAppearance = appearance
            navigationBar.scrollEdgeAppearance = appearance
        }

        // Add close button
        let closeButton = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(handleCloseButtonPressed)
        )
        navigationItem.rightBarButtonItem = closeButton
    }

    @objc private func handleCloseButtonPressed() {
        onClose?()
    }

    func setReactContentView(_ view: UIView) {
        // Remove previous content if any
        reactContentView?.removeFromSuperview()

        reactContentView = view

        // If view is already loaded, add the content immediately
        if isViewLoaded {
            addReactContent(view)
        }
    }

    private func addReactContent(_ view: UIView) {
        // Remove the view from its current superview if it has one
        view.removeFromSuperview()

        // Add as subview and setup constraints
        self.view.addSubview(view)
        view.translatesAutoresizingMaskIntoConstraints = false

        // Pin to entire view edges so content extends behind navigation bar and fills completely
        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: self.view.topAnchor),
            view.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
            view.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
            view.bottomAnchor.constraint(equalTo: self.view.bottomAnchor)
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        // Ensure React Native view updates its layout when view controller bounds change
        reactContentView?.setNeedsLayout()
        reactContentView?.layoutIfNeeded()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)

        // If being dismissed (not just going to background), notify
        if isBeingDismissed {
            onClose?()
        }
    }
}
