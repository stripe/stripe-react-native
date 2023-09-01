//
//  CustomerSheetView.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 08/28/23.
//

import Foundation
@_spi(PrivateBetaCustomerSheet) import StripePaymentSheet

extension StripeSdk {
    @objc(initCustomerSheet:resolver:rejecter:)
    func initCustomerSheet(params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        do {
            customerSheetConfiguration = CustomerSheetUtils.buildCustomerSheetConfiguration(
                appearance: try PaymentSheetAppearance.buildAppearanceFromParams(userParams: params["appearance"] as? NSDictionary),
                style: Mappers.mapToUserInterfaceStyle(params["style"] as? String),
                removeSavedPaymentMethodMessage: params["removeSavedPaymentMethodMessage"] as? String,
                returnURL: params["returnURL"] as? String,
                headerTextForSelectionScreen: params["headerTextForSelectionScreen"] as? String,
                applePayEnabled: params["applePayEnabled"] as? Bool,
                merchantDisplayName: params["merchantDisplayName"] as? String,
                billingDetailsCollectionConfiguration: params["billingDetailsCollectionConfiguration"] as? NSDictionary,
                defaultBillingDetails: params["defaultBillingDetails"] as? NSDictionary)
        } catch {
            resolve(
                Errors.createError(ErrorType.Failed, error.localizedDescription)
            )
            return
        }
        
        guard let customerId = params["customerId"] as? String else {
            resolve(Errors.createError(ErrorType.Failed, "You must provide `customerId`"))
            return
        }
        guard let customerEphemeralKeySecret = params["customerEphemeralKeySecret"] as? String else {
            resolve(Errors.createError(ErrorType.Failed, "You must provide `customerEphemeralKeySecret`"))
            return
        }
        
        customerAdapter = CustomerSheetUtils.buildStripeCustomerAdapter(
            customerId: customerId,
            ephemeralKeySecret: customerEphemeralKeySecret,
            setupIntentClientSecret: params["setupIntentClientSecret"] as? String)

        customerSheet = CustomerSheet(configuration: customerSheetConfiguration, customer: customerAdapter!)
        
        resolve([])
    }
    
    @objc(presentCustomerSheet:resolver:rejecter:)
    func presentCustomerSheet(params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        if (STPAPIClient.shared.publishableKey == nil) {
            resolve(
                Errors.createError(ErrorType.Failed, "No publishable key set. Stripe has not been initialized. Initialize Stripe in your app with the StripeProvider component or the initStripe method.")
            )
            return
        }

        if let timeout = params["timeout"] as? Double {
            DispatchQueue.main.asyncAfter(deadline: .now() + timeout/1000) {
                if let customerSheetViewController = self.customerSheetViewController {
                    customerSheetViewController.dismiss(animated: true)
                    resolve(Errors.createError(ErrorType.Timeout, "The payment has timed out."))
                }
            }
        }
        
        DispatchQueue.main.async {
            self.customerSheetViewController = findViewControllerPresenter(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController())
            if let customerSheetViewController = self.customerSheetViewController {
                customerSheetViewController.modalPresentationStyle = CustomerSheetUtils.getModalPresentationStyle(params["presentationStyle"] as? String)
                customerSheetViewController.modalTransitionStyle = CustomerSheetUtils.getModalTransitionStyle(params["animationStyle"] as? String)
                if let customerSheet = self.customerSheet {
                    customerSheet.present(
                        from: customerSheetViewController, completion: { result in
                            resolve(CustomerSheetUtils.interpretResult(result: result))
                        })
                } else {
                    resolve(Errors.createError(ErrorType.Failed, "CustomerSheet has not been properly initialized."))
                    return
                }
            }
        }
    }
    
    @objc(retrieveCustomerSheetPaymentOptionSelection:rejecter:)
    func retrieveCustomerSheetPaymentOptionSelection(resolver resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) -> Void  {
        guard let customerAdapter = customerAdapter else {
            resolve(Errors.createError(ErrorType.Failed, "CustomerSheet has not been properly initialized."))
            return
        }
        
        Task {
            var payload: NSDictionary = [:]
            var paymentMethodOption: CustomerSheet.PaymentOptionSelection? = nil
            do {
                paymentMethodOption = try await customerAdapter.retrievePaymentOptionSelection()
            } catch {
                resolve(Errors.createError(ErrorType.Failed, error as NSError))
                return
            }
            
            switch paymentMethodOption {
            case .applePay(let paymentOptionDisplayData):
                payload = CustomerSheetUtils.buildPaymentOptionResult(label: paymentOptionDisplayData.label, imageData: paymentOptionDisplayData.image.pngData()?.base64EncodedString(), paymentMethod: nil)
            case .paymentMethod(let paymentMethod, let paymentOptionDisplayData):
                payload = CustomerSheetUtils.buildPaymentOptionResult(label: paymentOptionDisplayData.label, imageData: paymentOptionDisplayData.image.pngData()?.base64EncodedString(), paymentMethod: paymentMethod)
            case .none:
                break
            }
            resolve(payload)
        }
    }
}
