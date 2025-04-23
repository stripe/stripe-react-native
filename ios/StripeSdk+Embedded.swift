//
//  EmbeddedPaymentElementManager.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/15/25.
//

import Foundation
@_spi(EmbeddedPaymentElementPrivateBeta) @_spi(ExperimentalAllowsRemovalOfLastSavedPaymentMethodAPI) @_spi(CustomerSessionBetaAccess) @_spi(STP) import StripePaymentSheet

@objc(StripeSdk)
extension StripeSdk {
  
  // MARK: Public API wrappers
  
  @objc(createEmbeddedPaymentElement:configuration:resolver:rejecter:)
  func createEmbeddedPaymentElement(intentConfig: NSDictionary,
                                    configuration: NSDictionary,
                                    resolver resolve: @escaping RCTPromiseResolveBlock,
                                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let modeParams =  intentConfig["mode"] as? NSDictionary else {
      resolve(Errors.createError(ErrorType.Failed, "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration.mode` is required"))
      return
    }
    if (intentConfig.object(forKey: "confirmHandler") == nil) {
      resolve(Errors.createError(ErrorType.Failed, "You must provide `intentConfiguration.confirmHandler` if you are not passing an intent client secret"))
      return
    }
    let captureMethodString = intentConfig["captureMethod"] as? String
    let intentConfig = buildIntentConfiguration(
      modeParams: modeParams,
      paymentMethodTypes: intentConfig["paymentMethodTypes"] as? [String],
      captureMethod: mapCaptureMethod(captureMethodString)
    )
    
    guard let configuration = buildEmbeddedPaymentElementConfiguration(params: configuration).configuration else {
      resolve(Errors.createError(ErrorType.Failed, "Invalid configuration"))
      return
    }
    
    Task {
      do {
        let embeddedPaymentElement = try await EmbeddedPaymentElement.create(
          intentConfiguration: intentConfig,
          configuration: configuration
        )
        embeddedPaymentElement.delegate = self
        embeddedPaymentElement.presentingViewController = RCTPresentedViewController()
        self.embeddedInstance = embeddedPaymentElement

        // success: resolve promise
        resolve(nil)

        // publish initial state
        embeddedPaymentElementDidUpdateHeight(embeddedPaymentElement: embeddedPaymentElement)
        embeddedPaymentElementDidUpdatePaymentOption(embeddedPaymentElement: embeddedPaymentElement)
      } catch {
        // 1) still resolve the promise so JS hook can finish loading
        resolve(nil)

        // 2) emit a loading‐failed event with the error message
        let msg = error.localizedDescription
        self.sendEvent(
          withName: "embeddedPaymentElementLoadingFailed",
          body: ["message": msg]
        )
      }
    }
    
  }
  
  @objc(confirmEmbeddedPaymentElement:rejecter:)
  func confirmEmbeddedPaymentElement(resolver resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    embeddedInstance?.presentingViewController = RCTPresentedViewController()
    embeddedInstance?.confirm { result in
      switch result {
      case .completed:
        // Return an object with { status: 'completed' }
        resolve(["status": "completed"])
      case .canceled:
        // Return an object with { status: 'canceled' }
        resolve(["status": "canceled"])
      case .failed(let error):
        // Return an object with { status: 'failed', error }
        resolve([
          "status": "failed",
          "error": error.localizedDescription
        ])
      }
    }
  }
  
  @objc(updateEmbeddedPaymentElement:resolver:rejecter:)
  func updateEmbeddedPaymentElement(
    intentConfig: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let modeParams = intentConfig["mode"] as? NSDictionary else {
      resolve(Errors.createError(
        ErrorType.Failed,
        "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration.mode` is required"
      ))
      return
    }
    let captureMethodString = intentConfig["captureMethod"] as? String
    let intentConfiguration = buildIntentConfiguration(
      modeParams: modeParams,
      paymentMethodTypes: intentConfig["paymentMethodTypes"] as? [String],
      captureMethod: mapCaptureMethod(captureMethodString)
    )

    Task {
      guard let updateResult = await self.embeddedInstance?.update(intentConfiguration: intentConfiguration) else {
        resolve(Errors.createError(
          ErrorType.Failed,
          "No EmbeddedPaymentElement instance — did you call create first?"
        ))
        return
      }

      switch updateResult {
      case .succeeded:
        resolve(["status": "succeeded"])
      case .canceled:
        resolve(["status": "canceled"])
      case .failed(let error):
        self.sendEvent(
          withName: "embeddedPaymentElementLoadingFailed",
          body: ["message": error.localizedDescription]
        )
        // Settle promise so it doesn’t hang
        resolve(nil)
      }
    }
  }

  @objc(clearEmbeddedPaymentOption)
  func clearEmbeddedPaymentOption() {
    DispatchQueue.main.async {
      self.embeddedInstance?.clearPaymentOption()
    }
  }
  
}

// MARK: EmbeddedPaymentElementDelegate

extension StripeSdk: EmbeddedPaymentElementDelegate {
  func embeddedPaymentElementDidUpdateHeight(embeddedPaymentElement: StripePaymentSheet.EmbeddedPaymentElement) {
    let newHeight = embeddedPaymentElement.view.systemLayoutSizeFitting(CGSize(width: embeddedPaymentElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
    
    self.sendEvent(withName: "embeddedPaymentElementDidUpdateHeight",
                   body: ["height": newHeight])
  }
  
  func embeddedPaymentElementDidUpdatePaymentOption(embeddedPaymentElement: EmbeddedPaymentElement) {
    let displayDataDict = embeddedPaymentElement.paymentOption?.toDictionary()
    self.sendEvent(withName: "embeddedPaymentElementDidUpdatePaymentOption", body: ["paymentOption": displayDataDict])
  }
  
  func embeddedPaymentElementWillPresent(embeddedPaymentElement: EmbeddedPaymentElement) {
    self.sendEvent(withName: "embeddedPaymentElementWillPresent", body: nil)
  }
}

// MARK: Config parsing

extension StripeSdk {
  @nonobjc
  internal func buildEmbeddedPaymentElementConfiguration(
    params: NSDictionary
  ) -> (error: NSDictionary?, configuration: EmbeddedPaymentElement.Configuration?) {
    var configuration = EmbeddedPaymentElement.Configuration()
    
    configuration.primaryButtonLabel = params["primaryButtonLabel"] as? String
    
    if let appearanceParams = params["appearance"] as? NSDictionary {
      do {
        configuration.appearance = try PaymentSheetAppearance.buildAppearanceFromParams(userParams: appearanceParams)
      } catch {
        return(error: Errors.createError(ErrorType.Failed, error.localizedDescription), configuration: nil)
      }
    }
    
    if let applePayParams = params["applePay"] as? NSDictionary {
      do {
        configuration.applePay = try ApplePayUtils.buildPaymentSheetApplePayConfig(
          merchantIdentifier: self.merchantIdentifier,
          merchantCountryCode: applePayParams["merchantCountryCode"] as? String,
          paymentSummaryItems: applePayParams["cartItems"] as? [[String : Any]],
          buttonType: applePayParams["buttonType"] as? NSNumber,
          customHandlers: buildCustomerHandlersForPaymentSheet(applePayParams: applePayParams)
        )
      } catch {
        return(error: Errors.createError(ErrorType.Failed, error.localizedDescription), configuration: nil)
      }
    }
    
    if let linkParams = params["link"] as? NSDictionary {
      let display = StripeSdk.mapToLinkDisplay(value: linkParams["display"] as? String)
      configuration.link = PaymentSheet.LinkConfiguration(display: display)
    }
    
    if let merchantDisplayName = params["merchantDisplayName"] as? String {
      configuration.merchantDisplayName = merchantDisplayName
    }
    
    if let returnURL = params["returnURL"] as? String {
      configuration.returnURL = returnURL
    }
    
    if let allowsDelayedPaymentMethods = params["allowsDelayedPaymentMethods"] as? Bool {
      configuration.allowsDelayedPaymentMethods = allowsDelayedPaymentMethods
    }
    
    if let removeSavedPaymentMethodMessage = params["removeSavedPaymentMethodMessage"] as? String {
      configuration.removeSavedPaymentMethodMessage = removeSavedPaymentMethodMessage
    }
    
    if let billingConfigParams = params["billingDetailsCollectionConfiguration"] as? [String: Any?] {
      configuration.billingDetailsCollectionConfiguration.name = StripeSdk.mapToCollectionMode(str: billingConfigParams["name"] as? String)
      configuration.billingDetailsCollectionConfiguration.phone = StripeSdk.mapToCollectionMode(str: billingConfigParams["phone"] as? String)
      configuration.billingDetailsCollectionConfiguration.email = StripeSdk.mapToCollectionMode(str: billingConfigParams["email"] as? String)
      configuration.billingDetailsCollectionConfiguration.address = StripeSdk.mapToAddressCollectionMode(str: billingConfigParams["address"] as? String)
      configuration.billingDetailsCollectionConfiguration.attachDefaultsToPaymentMethod = billingConfigParams["attachDefaultsToPaymentMethod"] as? Bool == true
    }
    
    if let defaultBillingDetails = params["defaultBillingDetails"] as? [String: Any?] {
      configuration.defaultBillingDetails.name = defaultBillingDetails["name"] as? String
      configuration.defaultBillingDetails.email = defaultBillingDetails["email"] as? String
      configuration.defaultBillingDetails.phone = defaultBillingDetails["phone"] as? String
      
      if let address = defaultBillingDetails["address"] as? [String: String] {
        configuration.defaultBillingDetails.address = .init(city: address["city"],
                                                            country: address["country"],
                                                            line1: address["line1"],
                                                            line2: address["line2"],
                                                            postalCode: address["postalCode"],
                                                            state: address["state"])
      }
      
    }
    
    if let defaultShippingDetails = params["defaultShippingDetails"] as? NSDictionary {
      configuration.shippingDetails = {
        return AddressSheetUtils.buildAddressDetails(params: defaultShippingDetails)
      }
    }
    
    if #available(iOS 13.0, *) {
      if let style = params["style"] as? String {
        configuration.style = Mappers.mapToUserInterfaceStyle(style)
      }
    }
    
    if let customerId = params["customerId"] as? String {
      let customerEphemeralKeySecret = params["customerEphemeralKeySecret"] as? String
      let customerClientSecret = params["customerSessionClientSecret"] as? String
      if let customerEphemeralKeySecret, let customerClientSecret {
        return(error: Errors.createError(ErrorType.Failed, "`customerEphemeralKeySecret` and `customerSessionClientSecret cannot both be set"), configuration: nil)
      } else if let customerEphemeralKeySecret {
        if (!Errors.isEKClientSecretValid(clientSecret: customerEphemeralKeySecret)) {
          return(error: Errors.createError(ErrorType.Failed, "`customerEphemeralKeySecret` format does not match expected client secret formatting."), configuration: nil)
        }
        configuration.customer = .init(id: customerId, ephemeralKeySecret: customerEphemeralKeySecret)
      } else if let customerClientSecret {
        configuration.customer = .init(id: customerId, customerSessionClientSecret: customerClientSecret)
      }
    }
    
    if let preferredNetworksAsInts = params["preferredNetworks"] as? Array<Int> {
      configuration.preferredNetworks = preferredNetworksAsInts.map(Mappers.intToCardBrand).compactMap { $0 }
    }
    
    if let allowsRemovalOfLastSavedPaymentMethod = params["allowsRemovalOfLastSavedPaymentMethod"] as? Bool {
      configuration.allowsRemovalOfLastSavedPaymentMethod = allowsRemovalOfLastSavedPaymentMethod
    }
    
    if let paymentMethodOrder = params["paymentMethodOrder"] as? Array<String> {
      configuration.paymentMethodOrder = paymentMethodOrder
    }
    
    configuration.cardBrandAcceptance = computeCardBrandAcceptance(params: params)
    
    if let formSheetActionParams = params["formSheetAction"] as? NSDictionary,
       let actionType = formSheetActionParams["type"] as? String {
      if actionType == "confirm" {
        configuration.formSheetAction = .confirm { [weak self] (result: EmbeddedPaymentElementResult) in
          guard let self = self else { return }
          let resultDict: [String: Any]
          switch result {
          case .completed:
            resultDict = ["status": "completed"]
          case .canceled:
            resultDict = ["status": "canceled"]
          case .failed(let error):
            resultDict = [
              "status": "failed",
              "error": error.localizedDescription
            ]
          }
          
          // Send the result back to JS via an event.
          self.sendEvent(withName: "embeddedPaymentElementFormSheetConfirmComplete", body: resultDict)
        }
      } else if actionType == "continue" {
        configuration.formSheetAction = .continue
      }
    }
    
    if let rowSelectionBehaviorParams = params["rowSelectionBehavior"] as? NSDictionary,
       let behaviorType = rowSelectionBehaviorParams["type"] as? String {
      if behaviorType == "default" {
        configuration.rowSelectionBehavior = .default
      } else if behaviorType == "immediateAction" {
        configuration.rowSelectionBehavior = .immediateAction { [weak self] in
          // Send an event back to JS to notify that a row has been selected.
          // Replace the event name and body details as needed.
          self?.sendEvent(withName: "embeddedPaymentElementRowSelectionImmediateAction", body: [:])
        }
      }
    }
    
    return (nil, configuration)
  }
  
}
