//
//  StripeSdkImpl+LinkController.swift
//  stripe-react-native
//
//  @PrivatePreview This implementation is in private preview and may change without notice.
//

import Foundation
@_spi(LinkControllerPreview) import StripePaymentSheet

extension StripeSdkImpl {
    @objc(initLinkController:resolver:rejecter:)
    public func initLinkController(
        _ params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let email = params["email"] as? String
        let phoneNumber = params["phoneNumber"] as? String
        let merchantDisplayName = params["merchantDisplayName"] as? String
        let allowLogout = params["allowLogout"] as? Bool ?? true

        var supportedPaymentMethodTypes: [LinkPaymentMethodType]?
        if let rawTypes = params["supportedPaymentMethodTypes"] as? [String] {
            supportedPaymentMethodTypes = rawTypes.compactMap { rawValue in
                switch rawValue {
                case "card": return .card
                case "bankAccount": return .bankAccount
                default: return nil
                }
            }
        }

        let paymentMethodTypes = params["paymentMethodTypes"] as? [String]

        var billingConfig: PaymentSheet.BillingDetailsCollectionConfiguration?
        if let billingParams = params["billingDetailsCollectionConfiguration"] as? [String: Any?] {
            billingConfig = .init(
                name: Self.mapToCollectionMode(str: billingParams["name"] as? String),
                phone: Self.mapToCollectionMode(str: billingParams["phone"] as? String),
                email: Self.mapToCollectionMode(str: billingParams["email"] as? String),
                address: Self.mapToAddressCollectionMode(str: billingParams["address"] as? String),
                attachDefaultsToPaymentMethod: billingParams["attachDefaultsToPaymentMethod"] as? Bool ?? false
            )
        }

        var appearance: LinkAppearance?
        if let appearanceParams = params["appearance"] as? [String: Any?] {
            appearance = Self.mapToLinkControllerAppearance(appearanceParams)
        }

        let configuration = LinkConfiguration(
            supportedPaymentMethodTypes: supportedPaymentMethodTypes,
            paymentMethodTypes: paymentMethodTypes,
            allowLogout: allowLogout,
            merchantDisplayName: merchantDisplayName,
            billingDetailsCollectionConfiguration: billingConfig
        )

        LinkController.create(
            apiClient: STPAPIClient.shared,
            appearance: appearance,
            configuration: configuration
        ) { [weak self] result in
            switch result {
            case .success(let controller):
                self?.linkController = controller
                self?.linkControllerEmail = email
                self?.linkControllerPhone = phoneNumber
                resolve([:])
            case .failure(let error):
                resolve(Errors.createError(ErrorType.Failed, error))
            }
        }
    }

    @objc(presentLinkController:rejecter:)
    public func presentLinkController(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let controller = linkController else {
            resolve(Errors.createError(ErrorType.Failed, "LinkController has not been initialized. Call initLinkController first."))
            return
        }

        Task { @MainActor in
            let presentingViewController = findViewControllerPresenter(
                from: RCTKeyWindow()?.rootViewController ?? UIViewController()
            )

            controller.present(
                email: linkControllerEmail ?? "",
                phoneNumber: linkControllerPhone,
                from: presentingViewController
            ) { result in
                switch result {
                case .success(.completed(let paymentMethod)):
                    var response: [String: Any] = [:]
                    if let paymentMethodDict = Mappers.mapFromPaymentMethod(paymentMethod) {
                        response["paymentMethod"] = paymentMethodDict
                    }
                    if let preview = controller.paymentMethodPreview {
                        response["paymentMethodPreview"] = Self.mapLinkPaymentMethodPreview(preview)
                    }
                    resolve(response)
                case .success(.canceled):
                    resolve(Errors.createError(ErrorType.Canceled, "The customer canceled the Link flow."))
                case .failure(let error):
                    resolve(Errors.createError(ErrorType.Failed, error))
                }
            }
        }
    }

    @objc(confirmLinkControllerSetupIntent:resolver:rejecter:)
    public func confirmLinkControllerSetupIntent(
        _ params: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let clientSecret = params["clientSecret"] as? String else {
            resolve(Errors.createError(ErrorType.Failed, "clientSecret is required."))
            return
        }

        guard let controller = linkController else {
            resolve(Errors.createError(ErrorType.Failed, "LinkController has not been initialized. Call initLinkController first."))
            return
        }

        Task { @MainActor in
            let presentingViewController = findViewControllerPresenter(
                from: RCTKeyWindow()?.rootViewController ?? UIViewController()
            )

            controller.confirmSetupIntent(
                clientSecret: clientSecret,
                from: presentingViewController
            ) { result in
                switch result {
                case .success(.completed):
                    resolve([:])
                case .success(.canceled):
                    resolve(Errors.createError(ErrorType.Canceled, "The customer canceled SetupIntent confirmation."))
                case .failure(let error):
                    resolve(Errors.createError(ErrorType.Failed, error))
                }
            }
        }
    }

    private static func mapToLinkControllerAppearance(_ params: [String: Any?]) -> LinkAppearance {
        let lightColorsParams = params["lightColors"] as? [String: Any?]
        let darkColorsParams = params["darkColors"] as? [String: Any?]

        func parseColor(_ hex: Any??) -> UIColor? {
            guard let str = hex as? String else { return nil }
            return UIColor(hexString: str)
        }

        func traitColor(light: Any??, dark: Any??) -> UIColor? {
            let l = parseColor(light)
            let d = parseColor(dark)
            switch (l, d) {
            case let (l?, d?): return UIColor { $0.userInterfaceStyle == .dark ? d : l }
            case (nil, let d?): return d
            case (let l?, nil): return l
            default: return nil
            }
        }

        let primary = traitColor(light: lightColorsParams?["primary"], dark: darkColorsParams?["primary"])
        let contentOnPrimary = traitColor(light: lightColorsParams?["contentOnPrimary"], dark: darkColorsParams?["contentOnPrimary"])
        let selectedBorder = traitColor(light: lightColorsParams?["borderSelected"], dark: darkColorsParams?["borderSelected"])

        var colors: LinkAppearance.Colors?
        if primary != nil || contentOnPrimary != nil || selectedBorder != nil {
            colors = LinkAppearance.Colors(primary: primary, contentOnPrimary: contentOnPrimary, selectedBorder: selectedBorder)
        }

        var primaryButtonConfiguration: LinkAppearance.PrimaryButtonConfiguration?
        if let pbParams = params["primaryButton"] as? [String: Any] {
            let cornerRadius = pbParams["cornerRadius"] as? CGFloat
            let height = pbParams["height"] as? CGFloat
            primaryButtonConfiguration = LinkAppearance.PrimaryButtonConfiguration(cornerRadius: cornerRadius, height: height)
        }

        let style: PaymentSheet.UserInterfaceStyle
        switch params["style"] as? String ?? "" {
        case "ALWAYS_LIGHT": style = .alwaysLight
        case "ALWAYS_DARK": style = .alwaysDark
        default: style = .automatic
        }

        let reduceLinkBranding = params["reduceLinkBranding"] as? Bool ?? false

        return LinkAppearance(colors: colors, primaryButton: primaryButtonConfiguration, style: style, reduceLinkBranding: reduceLinkBranding)
    }

    private static func mapLinkPaymentMethodPreview(_ preview: LinkController.PaymentMethodPreview) -> [String: Any] {
        let iconBase64 = "data:image/png;base64," + (preview.icon.pngData()?.base64EncodedString(options: []) ?? "")
        var result: [String: Any] = [
            "icon": iconBase64,
            "label": preview.label,
        ]
        if let sublabel = preview.sublabel {
            result["sublabel"] = sublabel
        }
        return result
    }
}
