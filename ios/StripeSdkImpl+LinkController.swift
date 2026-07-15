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
        let setupIntentClientSecret = params["setupIntentClientSecret"] as? String

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

        let configuration = LinkConfiguration(
            supportedPaymentMethodTypes: supportedPaymentMethodTypes,
            allowLogout: allowLogout,
            merchantDisplayName: merchantDisplayName
        )

        LinkController.create(
            apiClient: STPAPIClient.shared,
            setupIntentClientSecret: setupIntentClientSecret,
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
