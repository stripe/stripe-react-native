//
//  StripeSdk+PaymentSheet.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 1/6/23.
//

import Foundation
@_spi(ExperimentalAllowsRemovalOfLastSavedPaymentMethodAPI) @_spi(CustomerSessionBetaAccess) @_spi(EmbeddedPaymentElementPrivateBeta) @_spi(STP) @_spi(PaymentMethodOptionsSetupFutureUsagePreview) @_spi(CustomPaymentMethodsBeta) import StripePaymentSheet


extension StripeSdkImpl {
    internal func buildPaymentSheetConfiguration(
            params: NSDictionary
    ) -> (error: NSDictionary?, configuration: PaymentSheet.Configuration?) {
        var configuration = PaymentSheet.Configuration()

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
            do {
              let display = StripeSdkImpl.mapToLinkDisplay(value: linkParams["display"] as? String)
              configuration.link = PaymentSheet.LinkConfiguration(display: display)
            } catch {
                return(error: Errors.createError(ErrorType.Failed, error.localizedDescription), configuration: nil)
            }
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
            configuration.billingDetailsCollectionConfiguration.name = StripeSdkImpl.mapToCollectionMode(str: billingConfigParams["name"] as? String)
            configuration.billingDetailsCollectionConfiguration.phone = StripeSdkImpl.mapToCollectionMode(str: billingConfigParams["phone"] as? String)
            configuration.billingDetailsCollectionConfiguration.email = StripeSdkImpl.mapToCollectionMode(str: billingConfigParams["email"] as? String)
            configuration.billingDetailsCollectionConfiguration.address = StripeSdkImpl.mapToAddressCollectionMode(str: billingConfigParams["address"] as? String)
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
            var customerEphemeralKeySecret = params["customerEphemeralKeySecret"] as? String
            var customerClientSecret = params["customerSessionClientSecret"] as? String
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

        switch params["paymentMethodLayout"] as? String? {
          case "Horizontal":
            configuration.paymentMethodLayout = .horizontal
          case "Vertical":
            configuration.paymentMethodLayout = .vertical
          default:
            configuration.paymentMethodLayout = .automatic
        }

        configuration.cardBrandAcceptance = computeCardBrandAcceptance(params: params)

        // Parse custom payment method configuration
        if let customPaymentMethodConfig = params["customPaymentMethodConfiguration"] as? [String: Any] {
            configuration.customPaymentMethodConfiguration = StripeSdkImpl.buildCustomPaymentMethodConfiguration(
            from: customPaymentMethodConfig,
            sdkImpl: self
          )
        }
        
        return (nil, configuration)
    }

    internal func preparePaymentSheetInstance(
        params: NSDictionary,
        configuration: PaymentSheet.Configuration,
        resolve: @escaping RCTPromiseResolveBlock
    ) {
        self.paymentSheetFlowController = nil

        func handlePaymentSheetFlowControllerResult(result: Result<PaymentSheet.FlowController, Error>, stripeSdk: StripeSdkImpl?) {
            switch result {
            case .failure(let error):
                resolve(Errors.createError(ErrorType.Failed, error as NSError))
            case .success(let paymentSheetFlowController):
                self.paymentSheetFlowController = paymentSheetFlowController
                var result: NSDictionary? = nil
                if let paymentOption = stripeSdk?.paymentSheetFlowController?.paymentOption {
                    result = [
                        "label": paymentOption.label,
                        "image": paymentOption.image.pngData()?.base64EncodedString() ?? ""
                    ]
                }
                resolve(Mappers.createResult("paymentOption", result))
            }
        }

        if let paymentIntentClientSecret = params["paymentIntentClientSecret"] as? String {
            if (!Errors.isPIClientSecretValid(clientSecret: paymentIntentClientSecret)) {
                resolve(Errors.createError(ErrorType.Failed, "`secret` format does not match expected client secret formatting."))
                return
            }

            if params["customFlow"] as? Bool == true {
                PaymentSheet.FlowController.create(paymentIntentClientSecret: paymentIntentClientSecret,
                                                   configuration: configuration) { [weak self] result in
                    handlePaymentSheetFlowControllerResult(result: result, stripeSdk: self)
                }
            } else {
                self.paymentSheet = PaymentSheet(paymentIntentClientSecret: paymentIntentClientSecret, configuration: configuration)
                resolve([])
            }
        } else if let setupIntentClientSecret = params["setupIntentClientSecret"] as? String {
            if (!Errors.isSetiClientSecretValid(clientSecret: setupIntentClientSecret)) {
                resolve(Errors.createError(ErrorType.Failed, "`secret` format does not match expected client secret formatting."))
                return
            }

            if params["customFlow"] as? Bool == true {
                PaymentSheet.FlowController.create(setupIntentClientSecret: setupIntentClientSecret,
                                                   configuration: configuration) { [weak self] result in
                    handlePaymentSheetFlowControllerResult(result: result, stripeSdk: self)
                }
            } else {
                self.paymentSheet = PaymentSheet(setupIntentClientSecret: setupIntentClientSecret, configuration: configuration)
                resolve([])
            }
        } else {
            guard let intentConfiguration = params["intentConfiguration"] as? NSDictionary else {
                resolve(Errors.createError(ErrorType.Failed, "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration` is required"))
                return
            }
            guard let modeParams =  intentConfiguration["mode"] as? NSDictionary else {
                resolve(Errors.createError(ErrorType.Failed, "One of `paymentIntentClientSecret`, `setupIntentClientSecret`, or `intentConfiguration.mode` is required"))
                return
            }
            if (intentConfiguration.object(forKey: "confirmHandler") == nil) {
                resolve(Errors.createError(ErrorType.Failed, "You must provide `intentConfiguration.confirmHandler` if you are not passing an intent client secret"))
                return
            }
            let captureMethodString = intentConfiguration["captureMethod"] as? String
            let intentConfig = buildIntentConfiguration(
                modeParams: modeParams,
                paymentMethodTypes: intentConfiguration["paymentMethodTypes"] as? [String],
                captureMethod: mapCaptureMethod(captureMethodString)
            )

            if params["customFlow"] as? Bool == true {
                PaymentSheet.FlowController.create(intentConfiguration: intentConfig, configuration: configuration) { [weak self] result in
                    handlePaymentSheetFlowControllerResult(result: result, stripeSdk: self)
                }
            } else {
                self.paymentSheet = PaymentSheet(
                    intentConfiguration: intentConfig,
                    configuration: configuration
                )
                resolve([])
            }
        }
    }

    internal func computeCardBrandAcceptance(params: NSDictionary) -> PaymentSheet.CardBrandAcceptance {
      if let cardBrandAcceptanceParams = params["cardBrandAcceptance"] as? NSDictionary {
          if let filter = cardBrandAcceptanceParams["filter"] as? String {
              switch filter {
              case "all":
                return .all
              case "allowed":
                  if let brands = cardBrandAcceptanceParams["brands"] as? [String] {
                      let cardBrands = brands.compactMap { mapToCardBrandCategory(brand: $0) }
                    return .allowed(brands: cardBrands)
                  }
              case "disallowed":
                  if let brands = cardBrandAcceptanceParams["brands"] as? [String] {
                      let cardBrands = brands.compactMap { mapToCardBrandCategory(brand: $0) }
                    return .disallowed(brands: cardBrands)
                  }
              default:
                  break
              }
          }
      }

      return .all
    }

    private func mapToCardBrandCategory(brand: String) -> PaymentSheet.CardBrandAcceptance.BrandCategory? {
        switch brand {
        case "visa":
            return .visa
        case "mastercard":
            return .mastercard
        case "amex":
            return .amex
        case "discover":
            return .discover
        default:
            return nil
        }
    }

    func mapCaptureMethod(_ captureMethod: String?) -> PaymentSheet.IntentConfiguration.CaptureMethod {
        if let captureMethod = captureMethod {
            switch captureMethod {
            case "Automatic": return PaymentSheet.IntentConfiguration.CaptureMethod.automatic
            case "Manual": return PaymentSheet.IntentConfiguration.CaptureMethod.manual
            case "AutomaticAsync": return PaymentSheet.IntentConfiguration.CaptureMethod.automaticAsync
            default: return PaymentSheet.IntentConfiguration.CaptureMethod.automatic
            }
        }
        return PaymentSheet.IntentConfiguration.CaptureMethod.automatic
    }

    func buildIntentConfiguration(
        modeParams: NSDictionary,
        paymentMethodTypes: [String]?,
        captureMethod: PaymentSheet.IntentConfiguration.CaptureMethod
    ) -> PaymentSheet.IntentConfiguration {
        var mode: PaymentSheet.IntentConfiguration.Mode
        if let amount = modeParams["amount"] as? Int {
            mode = PaymentSheet.IntentConfiguration.Mode.payment(
                amount: amount,
                currency: modeParams["currencyCode"] as? String ?? "",
                setupFutureUsage: setupFutureUsageFromString(from: modeParams["setupFutureUsage"] as? String ?? ""),
                captureMethod: captureMethod,
                paymentMethodOptions: buildPaymentMethodOptions(paymentMethodOptionsParams: modeParams["paymentMethodOptions"] as? NSDictionary ?? [:])
            )
        } else {
            mode = PaymentSheet.IntentConfiguration.Mode.setup(
                currency: modeParams["currencyCode"] as? String,
                setupFutureUsage: modeParams["setupFutureUsage"] as? String == "OffSession" ? .offSession : .onSession
            )
        }

        return PaymentSheet.IntentConfiguration.init(
            mode: mode,
            paymentMethodTypes: paymentMethodTypes,
            confirmHandler: { paymentMethod, shouldSavePaymentMethod, intentCreationCallback in
                self.paymentSheetIntentCreationCallback = intentCreationCallback
                self.emitter?.emitOnConfirmHandlerCallback([
                    "paymentMethod": Mappers.mapFromPaymentMethod(paymentMethod) ?? NSNull(),
                    "shouldSavePaymentMethod": shouldSavePaymentMethod
                ])
            })
    }
    
    func buildPaymentMethodOptions(paymentMethodOptionsParams: NSDictionary) -> PaymentSheet.IntentConfiguration.Mode.PaymentMethodOptions? {
        if let sfuDictionary = paymentMethodOptionsParams["setupFutureUsageValues"] as? NSDictionary {
            var setupFutureUsageValues: [STPPaymentMethodType: PaymentSheet.IntentConfiguration.SetupFutureUsage] = [:]
            
            for (paymentMethodCode, sfuValue) in sfuDictionary {
                if let paymentMethodCode = paymentMethodCode as? String,
                    let sfuString = sfuValue as? String {
                    let setupFutureUsage = setupFutureUsageFromString(from: sfuString)
                    let paymentMethodType = STPPaymentMethodType.fromIdentifier(paymentMethodCode)
                    
                    if let setupFutureUsage = setupFutureUsage {
                        if paymentMethodType != .unknown {
                            setupFutureUsageValues[paymentMethodType] = setupFutureUsage
                        }
                    }
                }
            }
            
            if !setupFutureUsageValues.isEmpty {
                return PaymentSheet.IntentConfiguration.Mode.PaymentMethodOptions(setupFutureUsageValues: setupFutureUsageValues)
            }
        }

        return nil
    }
    
    func setupFutureUsageFromString(from string: String) -> PaymentSheet.IntentConfiguration.SetupFutureUsage? {
        switch string {
        case "OnSession":
            return PaymentSheet.IntentConfiguration.SetupFutureUsage.onSession
        case "OffSession":
            return PaymentSheet.IntentConfiguration.SetupFutureUsage.offSession
        case "None":
            return PaymentSheet.IntentConfiguration.SetupFutureUsage.none
        default:
            return nil
        }
    }

    func buildCustomerHandlersForPaymentSheet(applePayParams: NSDictionary) -> PaymentSheet.ApplePayConfiguration.Handlers? {
        if (applePayParams["request"] == nil) {
            return nil
        }
        return PaymentSheet.ApplePayConfiguration.Handlers(paymentRequestHandler: { request in
            do {
                try request.configureRequestType(requestParams: applePayParams)
            } catch {
                // At this point, we can't resolve a promise with an error object, so our best option is to create a redbox error
                RCTMakeAndLogError(error.localizedDescription, nil, nil)
            }
            return request
        }, authorizationResultHandler: { result, completion in
            if applePayParams.object(forKey: "setOrderTracking") != nil {
                self.orderTrackingHandler = (result, completion)
                self.emitter?.emitOnOrderTrackingCallback()
            } else {
                completion(result)
            }
        })
    }

    internal static func mapToCollectionMode(str: String?) -> PaymentSheet.BillingDetailsCollectionConfiguration.CollectionMode {
        switch str {
        case "automatic":
            return .automatic
        case "never":
            return .never
        case "always":
            return .always
        default:
            return .automatic
        }
    }

    internal static func mapToAddressCollectionMode(str: String?) -> PaymentSheet.BillingDetailsCollectionConfiguration.AddressCollectionMode {
        switch str {
        case "automatic":
            return .automatic
        case "never":
            return .never
        case "full":
            return .full
        default:
            return .automatic
        }
    }

    internal static func mapToLinkDisplay(value: String?) -> PaymentSheet.LinkConfiguration.Display {
        switch value {
        case "automatic":
            return .automatic
        case "never":
            return .never
        default:
            return .automatic
        }
    }
    
    // MARK: - Common Custom Payment Method Helper

    // Simple data structure for parsed custom payment method data
    struct ParsedCustomPaymentMethod {
      let id: String
      let subtitle: String?
      let disableBillingDetailCollection: Bool
    }

    // Simple parser that extracts data without type complexity
    static func parseCustomPaymentMethods(from config: [String: Any]) -> [ParsedCustomPaymentMethod] {
      guard let customMethods = config["customPaymentMethods"] as? [[String: Any]],
            !customMethods.isEmpty else { return [] }

      return customMethods.compactMap { methodDict in
        guard let id = methodDict["id"] as? String else { return nil }
        let subtitle = methodDict["subtitle"] as? String
        let disableBillingDetailCollection = methodDict["disableBillingDetailCollection"] as? Bool ?? true

        return ParsedCustomPaymentMethod(
          id: id,
          subtitle: subtitle,
          disableBillingDetailCollection: disableBillingDetailCollection
        )
      }
    }

    // Overload for NSDictionary
    static func parseCustomPaymentMethods(from config: NSDictionary) -> [ParsedCustomPaymentMethod] {
      guard let customPaymentMethods = config["customPaymentMethods"] as? NSArray,
            customPaymentMethods.count > 0 else { return [] }

      var parsedMethods: [ParsedCustomPaymentMethod] = []

      for customPaymentMethodData in customPaymentMethods {
        if let customPaymentMethodDict = customPaymentMethodData as? NSDictionary,
           let id = customPaymentMethodDict["id"] as? String {
          let subtitle = customPaymentMethodDict["subtitle"] as? String
          let disableBillingDetailCollection = customPaymentMethodDict["disableBillingDetailCollection"] as? Bool ?? true

          parsedMethods.append(ParsedCustomPaymentMethod(
            id: id,
            subtitle: subtitle,
            disableBillingDetailCollection: disableBillingDetailCollection
          ))
        }
      }

      return parsedMethods
    }

    private static func buildCustomPaymentMethodConfiguration(
      from config: [String: Any],
      sdkImpl: StripeSdkImpl
    ) -> PaymentSheet.CustomPaymentMethodConfiguration? {
      let parsedMethods = parseCustomPaymentMethods(from: config)
      guard !parsedMethods.isEmpty else { return nil }

      let customMethods = parsedMethods.map { parsed in
         var cpm = PaymentSheet.CustomPaymentMethodConfiguration.CustomPaymentMethod(
          id: parsed.id,
          subtitle: parsed.subtitle
        )
        cpm.disableBillingDetailCollection = parsed.disableBillingDetailCollection
        return cpm
      }

      return .init(
        customPaymentMethods: customMethods,
        customPaymentMethodConfirmHandler: createCustomPaymentMethodConfirmHandler(sdkImpl: sdkImpl)
      )
    }

    // MARK: - Common Custom Payment Method Handler

    static func createCustomPaymentMethodConfirmHandler(
      sdkImpl: StripeSdkImpl?
    ) -> PaymentSheet.CustomPaymentMethodConfiguration.CustomPaymentMethodConfirmHandler {
      return { customPaymentMethod, billingDetails in
        // Send event to JS with the custom payment method data
        let customPaymentMethodDict: [String: Any] = [
            "id": customPaymentMethod.id
        ]

        let billingDetailsDict = Mappers.mapFromBillingDetails(billingDetails: billingDetails)
        let payload: [String: Any] = [
          "customPaymentMethod": customPaymentMethodDict,
          "billingDetails": billingDetailsDict
        ]

        // Use async/await with continuation instead of blocking semaphore
        return await withCheckedContinuation { continuation in
          // Set up callback to receive result from JavaScript
          sdkImpl?.customPaymentMethodResultCallback = { result in
            sdkImpl?.customPaymentMethodResultCallback = nil
            continuation.resume(returning: result)
          }
          
          // Emit event to JavaScript
          sdkImpl?.emitter?.emitOnCustomPaymentMethodConfirmHandlerCallback(payload)
        }
      }
    }
}

