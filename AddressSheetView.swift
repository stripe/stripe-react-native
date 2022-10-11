//
//  AddressSheetView.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 10/11/22.
//

import Foundation
import Stripe

@objc(AddressSheetView)
class AddressSheetView: UIView {
    @objc var visible = false
    @objc var presentationStyle: String = "popover"
    @objc var animationStyle: String = ""
    @objc var appearance: NSDictionary? = nil
    @objc var defaultValues: NSDictionary? = nil
    @objc var additionalFields: NSDictionary? = nil
    @objc var allowedCountries: [String] = []
    @objc var autocompleteCountries: [String] = []
    @objc var primaryButtonTitle: String? = nil
    @objc var sheetTitle: String? = nil
    @objc var onSubmitAction: RCTDirectEventBlock?
    @objc var onCancelAction: RCTDirectEventBlock?

    private var wasVisible = false
    private var addressViewController: AddressViewController? = nil
    internal var addressDetails: AddressViewController.AddressDetails? = nil
    
    override init(frame: CGRect) {
        super.init(frame: frame)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func didSetProps(_ changedProps: [String]!) {
        if (visible && !wasVisible) {
            presentAddressSheet()
            wasVisible = true
        } else if (!visible && wasVisible) {
            addressViewController?.dismiss(animated: true)
            wasVisible = false
        }
    }
    
    private func presentAddressSheet() {
        let config = buildAddressSheetConfiguration()
        
        self.addressViewController = AddressViewController(
            configuration: config,
            delegate: self
        )
                
        let navigationController =
        UINavigationController(
            rootViewController: addressViewController!)
        navigationController.modalPresentationStyle = getModalPresentationStyle()
        navigationController.modalTransitionStyle = getModalTransitionStyle()
        let vc = findViewControllerPresenter(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController())
        vc.present(navigationController, animated: true)
    }
    
    private func buildAddressSheetConfiguration() -> AddressViewController.Configuration {
        var appearanceConfiguration = PaymentSheet.Appearance()
        do {
            appearanceConfiguration = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: appearance)
        } catch {
            // TODO: turn onCancel to onError and emit error event
        }
        
        return AddressViewController.Configuration(
            defaultValues: buildDefaultValues(),
            additionalFields: buildAdditionalFieldsConfiguration(),
            allowedCountries: allowedCountries,
            appearance: appearanceConfiguration,
            buttonTitle: primaryButtonTitle,
            title: sheetTitle
          )
    }
    
    private func buildDefaultValues() -> AddressViewController.Configuration.DefaultAddressDetails {
        guard let defaultValues = defaultValues else {
            return AddressViewController.Configuration.DefaultAddressDetails()
        }
        
        return AddressViewController.Configuration.DefaultAddressDetails(
            address: buildAddress(),
            name: defaultValues["name"] as? String,
            phone: defaultValues["phone"] as? String,
            isCheckboxSelected: defaultValues["isCheckboxSelected"] as? Bool
        )
    }
    
    private func buildAddress() -> PaymentSheet.Address {
        guard let addressParams = defaultValues?["address"] as? NSDictionary else { return PaymentSheet.Address() }
        return PaymentSheet.Address(
            city: addressParams["city"] as? String,
            country: addressParams["country"] as? String,
            line1: addressParams["line1"] as? String,
            line2: addressParams["line2"] as? String,
            postalCode: addressParams["postalCode"] as? String,
            state: addressParams["state"] as? String
        )
    }
    
    private func buildAdditionalFieldsConfiguration() -> AddressViewController.Configuration.AdditionalFields {
        guard let additionalFields = additionalFields else {
            return AddressViewController.Configuration.AdditionalFields()
        }

        return AddressViewController.Configuration.AdditionalFields(
            name: getFieldConfiguration(input: additionalFields["name"] as? String, default: .required),
            phone: getFieldConfiguration(input: additionalFields["phoneNumber"] as? String, default: .hidden),
            checkboxLabel: additionalFields["checkboxLabel"] as? String
        )
    }
    
    private func getFieldConfiguration(input: String?, default: AddressViewController.Configuration.AdditionalFields.FieldConfiguration) -> AddressViewController.Configuration.AdditionalFields.FieldConfiguration {
        switch (input) {
        case "optional":
            return .optional
        case "required":
            return .required
        case "hidden":
            return .hidden
        default:
            return `default`
        }
    }
    
    private func getModalPresentationStyle() -> UIModalPresentationStyle {
        switch (presentationStyle) {
        case "fullscreen":
            return .fullScreen
        case "popover":
            fallthrough
        default:
            return .popover
        }
    }
    
    private func getModalTransitionStyle() -> UIModalTransitionStyle {
        switch (animationStyle) {
        case "flip":
            return .flipHorizontal
        case "curl":
            return .partialCurl
        case "dissolve":
            return .crossDissolve
        case "slide":
            fallthrough
        default:
            return .coverVertical
        }
    }
}

extension AddressSheetView: AddressViewControllerDelegate {
    func addressViewControllerDidFinish(_ addressViewController: AddressViewController, with address: AddressViewController.AddressDetails?) {
        guard let address = address else {
            onCancelAction!(nil)
            return
        }
        self.addressDetails = address
        onSubmitAction!(buildResult(address: address))
    }
    
    private func buildResult(address: AddressViewController.AddressDetails) -> [AnyHashable : Any] {
        return [
            "name": address.name ?? NSNull(),
            "address": [
                "country": address.address.country,
                "state": address.address.state,
                "line1": address.address.line1,
                "line2": address.address.line2,
                "postalCode": address.address.postalCode,
                "city": address.address.city,
            ],
            "phone": address.phone ?? NSNull(),
            "isCheckboxSelected": address.isCheckboxSelected ?? NSNull(),
        ] as [AnyHashable : Any]
    }
}
