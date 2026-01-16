//
//  ConnectAccountOnboardingView.swift
//  stripe-react-native
//

import Foundation
import UIKit

@objc(ConnectAccountOnboardingView)
public class ConnectAccountOnboardingView: UIView {
    @objc public var visible = false
    @objc public var title: String?
    @objc public var backgroundColorValue: String?
    @objc public var textColorValue: String?
    @objc public var onExitAction: RCTDirectEventBlock?

    private var wasVisible = false
    private var navigationController: UINavigationController?
    private var viewController: ConnectAccountOnboardingViewController?

    override public init(frame: CGRect) {
        super.init(frame: frame)
        super.backgroundColor = .clear
        self.isHidden = true  // Hide until modal animation completes
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc public func didSetProps() {
        if visible && !wasVisible {
            presentModal()
            wasVisible = true
        } else if !visible && wasVisible {
            dismissModal()
            wasVisible = false
        }
    }

    override public func didSetProps(_ changedProps: [String]!) {
        // This is only called on old arch, for new arch didSetProps() will be called
        // by the view component.
        self.didSetProps()
    }

    private func presentModal() {
        // Keep view hidden during modal presentation
        self.isHidden = true

        // Create the view controller that wraps THIS view
        viewController = ConnectAccountOnboardingViewController()
        viewController?.title = title
        viewController?.backgroundColorString = backgroundColorValue
        viewController?.textColorString = textColorValue
        viewController?.onClose = { [weak self] in
            self?.handleClose()
        }

        // Wrap in a navigation controller
        navigationController = UINavigationController(rootViewController: viewController!)
        navigationController?.modalPresentationStyle = .fullScreen
        navigationController?.modalTransitionStyle = .coverVertical

        // Find the presenting view controller and present
        let presenter = findViewControllerPresenter(from: RCTKeyWindow()?.rootViewController ?? UIViewController())

        // Present the empty modal first, then add React content after animation completes
        presenter.present(navigationController!, animated: true) { [weak self] in
            guard let self = self else { return }
            // Add React content after presentation animation finishes
            self.viewController?.setReactContentView(self)
            self.isHidden = false  // Show the view now that modal is presented
        }
    }

    private func dismissModal() {
        navigationController?.dismiss(animated: true) { [weak self] in
            self?.viewController = nil
            self?.navigationController = nil
        }
    }

    private func handleClose() {
        visible = false
        wasVisible = false
        onExitAction?([:])
        dismissModal()
    }

}
