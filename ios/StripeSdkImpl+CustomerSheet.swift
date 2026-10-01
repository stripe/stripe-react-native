//
//  CustomerSheetView.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 08/28/23.
//

import Foundation
import React
@_spi(PrivateBetaCustomerSheet) @_spi(STP) import StripePaymentSheet
extension StripeSdkImpl {
    @objc(initCustomerSheet:customerAdapterOverrides:resolver:rejecter:)
    public func initCustomerSheet(params: NSDictionary,
                                  customerAdapterOverrides: NSDictionary,
                                  resolver resolve: @escaping RCTPromiseResolveBlock,
                                  rejecter reject: @escaping RCTPromiseRejectBlock) {
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
                defaultBillingDetails: params["defaultBillingDetails"] as? NSDictionary,
                preferredNetworks: params["preferredNetworks"] as? [Int],
                allowsRemovalOfLastSavedPaymentMethod: params["allowsRemovalOfLastSavedPaymentMethod"] as? Bool,
                opensCardScannerAutomatically: params["opensCardScannerAutomatically"] as? Bool,
                cardBrandAcceptance: StripeSdkImpl.computeCardBrandAcceptance(params: params)
            )
        } catch {
            resolve(
                Errors.createError(ErrorType.Failed, error.localizedDescription)
            )
            return
        }

        let intentConfigurationBase = params["intentConfiguration"] as? NSDictionary
        let customerEphemeralKeySecret = params["customerEphemeralKeySecret"] as? String

        if intentConfigurationBase != nil && customerEphemeralKeySecret != nil {
            resolve(Errors.createError(ErrorType.Failed, "You must provide either `intentConfiguration` or `customerEphemeralKeySecret`, but not both"))
            return
        } else if let intentConfigurationBase = intentConfigurationBase {
            cancelCustomerSheetClientSecretRequests()
            let intentConfiguration: CustomerSheet.IntentConfiguration = CustomerSheet.IntentConfiguration(
                paymentMethodTypes: intentConfigurationBase["paymentMethodTypes"] as? [String],
                onBehalfOf: intentConfigurationBase["onBehalfOf"] as? String,
                setupIntentClientSecretProvider: {
                    return try await self.setupIntentClientSecretRequests.request { requestId in
                        self.emitter?.emitOnCustomerSessionProviderSetupIntentClientSecret(["requestId": requestId])
                    }
                }
            )

            let customerSessionClientSecretProvider: () async throws -> CustomerSessionClientSecret = {
                return try await self.customerSessionClientSecretRequests.request { requestId in
                    self.emitter?.emitOnCustomerSessionProviderCustomerSessionClientSecret(["requestId": requestId])
                }
            }

            customerSheet = CustomerSheet(configuration: customerSheetConfiguration, intentConfiguration: intentConfiguration, customerSessionClientSecretProvider: customerSessionClientSecretProvider)
        } else if customerEphemeralKeySecret != nil {
            guard let customerId = params["customerId"] as? String else {
                resolve(Errors.createError(ErrorType.Failed, "You must provide `customerId`"))
                return
            }

            cancelCustomerSheetClientSecretRequests()
            customerAdapter = CustomerSheetUtils.buildStripeCustomerAdapter(
                customerId: customerId,
                ephemeralKeySecret: customerEphemeralKeySecret!,
                setupIntentClientSecret: params["setupIntentClientSecret"] as? String,
                customerAdapter: customerAdapterOverrides,
                stripeSdk: self
            )
            customerSheet = CustomerSheet(configuration: customerSheetConfiguration, customer: customerAdapter!)
        } else {
            resolve(Errors.createError(ErrorType.Failed, "You must provide either `intentConfiguration` or `customerEphemeralKeySecret`"))
            return
        }

        resolve([])
    }

    @objc public func cancelCustomerSheetClientSecretRequests() {
        setupIntentClientSecretRequests.cancelAll()
        customerSessionClientSecretRequests.cancelAll()
    }

    @objc(presentCustomerSheet:resolver:rejecter:)
    public func presentCustomerSheet(params: NSDictionary,
                                     resolver resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        if STPAPIClient.shared.publishableKey == nil {
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
            self.customerSheetViewController = findViewControllerPresenter(from: RCTKeyWindow()?.rootViewController ?? UIViewController())
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
    public func retrieveCustomerSheetPaymentOptionSelection(resolver resolve: @escaping RCTPromiseResolveBlock,
                                                            rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let customerSheet = customerSheet else {
            resolve(Errors.createError(ErrorType.Failed, "CustomerSheet has not been properly initialized."))
            return
        }

        Task {
            var payload: NSDictionary = [:]
            var paymentMethodOption: CustomerSheet.PaymentOptionSelection?
            do {
                paymentMethodOption = try await customerSheet.retrievePaymentOptionSelection()
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

    @objc(customerAdapterFetchPaymentMethodsCallback:resolver:rejecter:)
    public func customerAdapterFetchPaymentMethodsCallback(paymentMethods: [NSDictionary],
                                                           resolver resolve: @escaping RCTPromiseResolveBlock,
                                                           rejecter reject: @escaping RCTPromiseRejectBlock) {
        let decodedPaymentMethods = paymentMethods.compactMap { STPPaymentMethod.decodedObject(fromAPIResponse: $0 as? [AnyHashable: Any]) }
        self.fetchPaymentMethodsCallback?(decodedPaymentMethods)
        resolve([])
    }

    @objc(customerAdapterAttachPaymentMethodCallback:resolver:rejecter:)
    public func customerAdapterAttachPaymentMethodCallback(unusedPaymentMethod: NSDictionary,
                                                           resolver resolve: @escaping RCTPromiseResolveBlock,
                                                           rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.attachPaymentMethodCallback?()
        resolve([])
    }

    @objc(customerAdapterDetachPaymentMethodCallback:resolver:rejecter:)
    public func customerAdapterDetachPaymentMethodCallback(unusedPaymentMethod: NSDictionary,
                                                           resolver resolve: @escaping RCTPromiseResolveBlock,
                                                           rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.detachPaymentMethodCallback?()
        resolve([])
    }

    @objc(customerAdapterSetSelectedPaymentOptionCallback:rejecter:)
    public func customerAdapterSetSelectedPaymentOptionCallback(resolver resolve: @escaping RCTPromiseResolveBlock,
                                                                rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.setSelectedPaymentOptionCallback?()
        resolve([])
    }

    @objc(customerAdapterFetchSelectedPaymentOptionCallback:resolver:rejecter:)
    public func customerAdapterFetchSelectedPaymentOptionCallback(paymentOption: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if let paymentOption = paymentOption {
            self.fetchSelectedPaymentOptionCallback?(CustomerPaymentOption.init(value: paymentOption))
        } else {
            self.fetchSelectedPaymentOptionCallback?(nil)
        }
        resolve([])
    }

    @objc(customerAdapterSetupIntentClientSecretForCustomerAttachCallback:resolver:rejecter:)
    public func customerAdapterSetupIntentClientSecretForCustomerAttachCallback(clientSecret: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        self.setupIntentClientSecretForCustomerAttachCallback?(clientSecret)
        resolve([])
    }

    @objc(customerSheetClientSecretProviderResponse:resolver:rejecter:)
    public func customerSheetClientSecretProviderResponse(response: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let requestId = response["requestId"] as? String,
              let type = response["type"] as? String else {
            resolve(Errors.createError(ErrorType.Failed, "Invalid CustomerSheet client secret response"))
            return
        }

        let error = (response["error"] as? String).map {
            NSError(domain: "StripeReactNative.CustomerSheet", code: 0, userInfo: [NSLocalizedDescriptionKey: $0])
        }
        switch type {
        case "setupIntent":
            if let error {
                setupIntentClientSecretRequests.fail(requestId: requestId, error: error)
            } else if let clientSecret = response["clientSecret"] as? String {
                setupIntentClientSecretRequests.succeed(requestId: requestId, value: clientSecret)
            } else {
                setupIntentClientSecretRequests.fail(requestId: requestId, error: NSError(domain: "StripeReactNative.CustomerSheet", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid SetupIntent client secret response"]))
            }
        case "customerSession":
            if let error {
                customerSessionClientSecretRequests.fail(requestId: requestId, error: error)
            } else if let customerId = response["customerId"] as? String,
                      let clientSecret = response["clientSecret"] as? String {
                customerSessionClientSecretRequests.succeed(requestId: requestId, value: CustomerSessionClientSecret(customerId: customerId, clientSecret: clientSecret))
            } else {
                customerSessionClientSecretRequests.fail(requestId: requestId, error: NSError(domain: "StripeReactNative.CustomerSheet", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid CustomerSession client secret response"]))
            }
        default:
            resolve(Errors.createError(ErrorType.Failed, "Invalid CustomerSheet client secret response type"))
            return
        }
        resolve([])
    }

    // These methods remain in the shared native module spec for Android.
    @objc(clientSecretProviderSetupIntentClientSecretCallback:resolver:rejecter:)
    public func clientSecretProviderSetupIntentClientSecretCallback(setupIntentClientSecret: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(Errors.createError(ErrorType.Failed, "Use customerSheetClientSecretProviderResponse on iOS"))
    }

    @objc(clientSecretProviderCustomerSessionClientSecretCallback:resolver:rejecter:)
    public func clientSecretProviderCustomerSessionClientSecretCallback(customerSessionClientSecretDict: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(Errors.createError(ErrorType.Failed, "Use customerSheetClientSecretProviderResponse on iOS"))
    }
}
