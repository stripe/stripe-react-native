import Foundation
@_spi(PaymentMethodMessagingElementPreview) @_spi(STP) import StripePaymentSheet
import UIKit

@objc(PaymentMethodMessagingElementView)
class PaymentMethodMessagingElementView: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return PaymentMethodMessagingElementContainerView(frame: .zero)
    }
}

@objc(PaymentMethodMessagingElementContainerView)
public class PaymentMethodMessagingElementContainerView: UIView, UIGestureRecognizerDelegate {
    private var paymentMethodMessagingElementView: UIView?
    private var messagingInstance: PaymentMethodMessagingElement?
    private var appearanceConfig: PaymentMethodMessagingElement.Appearance?
    private var lastConfig: NSDictionary?

    @objc var appearance: NSDictionary? {
        didSet {
            if let appearance = appearance {
                appearanceConfig = parseAppearance(params: appearance)
                // Re-initialize if configuration already exists
                if let config = lastConfig {
                    initMessagingElement(config: config)
                }
            }
        }
    }

    @objc var configuration: NSDictionary? {
        didSet {
            if let configuration = configuration {
                lastConfig = configuration
                initMessagingElement(config: configuration)
            }
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        fatalError()
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            // Only attach when we have a valid window
            attachPaymentElementIfAvailable()
        }
    }

    public override func willMove(toWindow newWindow: UIWindow?) {
        super.willMove(toWindow: newWindow)
        if newWindow == nil {
            // Remove the view when moving away from window
            removePaymentMethodMessagingElement()
        }
    }

    private func attachPaymentElementIfAvailable() {
        removePaymentMethodMessagingElement()
        guard let messagingElement = messagingInstance else {
            return
        }

        let messagingElementView = messagingElement.view
        addSubview(messagingElementView)
        messagingElementView.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            messagingElementView.topAnchor.constraint(equalTo: topAnchor),
            messagingElementView.leadingAnchor.constraint(equalTo: leadingAnchor),
            messagingElementView.trailingAnchor.constraint(equalTo: trailingAnchor),
            messagingElementView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        self.paymentMethodMessagingElementView = messagingElementView
    }

    private func removePaymentMethodMessagingElement() {
        paymentMethodMessagingElementView?.removeFromSuperview()
        paymentMethodMessagingElementView = nil
    }

    private func parseAppearance(params: NSDictionary) -> PaymentMethodMessagingElement.Appearance {
        var appearance = PaymentMethodMessagingElement.Appearance()

        // Parse theme/style
        if let styleString = params["style"] as? String {
            switch styleString {
            case "dark":
                appearance.style = .alwaysDark
            case "flat":
                appearance.style = .flat
            case "light":
                appearance.style = .alwaysLight
            default:
                appearance.style = .automatic
            }
        }

        // Parse font
        if let fontParams = params["font"] as? NSDictionary {
            let scale = fontParams["scale"] as? CGFloat ?? 1
            if let fontFamily = fontParams["family"] as? String,
               let customFont = UIFont(name: fontFamily, size: UIFont.systemFontSize * scale) {
                appearance.font = customFont
            }
        }

        // Parse colors
        if let textColorHex = parseThemedColor(params: params, key: "textColor") {
            appearance.textColor = textColorHex
        }

        if let linkTextColorHex = parseThemedColor(params: params, key: "linkTextColor") {
            appearance.infoIconColor = linkTextColorHex
        }

        return appearance
    }

    private func parseThemedColor(params: NSDictionary, key: String) -> UIColor? {
        // Check if it's a dictionary with light/dark keys
        if let colorDict = params[key] as? [String: String] {
            let lightHex = colorDict["light"]
            let darkHex = colorDict["dark"]

            if let light = lightHex, let dark = darkHex {
                if #available(iOS 13.0, *) {
                    return UIColor { traitCollection in
                        return traitCollection.userInterfaceStyle == .dark
                            ? UIColor(hexString: dark)
                            : UIColor(hexString: light)
                    }
                } else {
                    return UIColor(hexString: light)
                }
            }
        }

        // Check if it's a plain string
        if let colorString = params[key] as? String {
            return UIColor(hexString: colorString)
        }

        return nil
    }

    private func buildPaymentMethodMessagingElementConfiguration(
        params: NSDictionary
    ) -> (error: NSDictionary?, configuration: PaymentMethodMessagingElement.Configuration?) {

        // Parse required parameters
        guard let amount = params["amount"] as? Int else {
            let error: NSDictionary = [
                "code": "InvalidConfiguration",
                "message": "amount is required",
            ]
            return (error, nil)
        }

        guard let currency = params["currency"] as? String else {
            let error: NSDictionary = [
                "code": "InvalidConfiguration",
                "message": "currency is required",
            ]
            return (error, nil)
        }

        // Parse optional parameters
        let locale = params["locale"] as? String
        let country = params["country"] as? String

        var paymentMethodTypes: [STPPaymentMethodType]?
        if let paymentMethodTypesArray = params["paymentMethodTypes"] as? [String] {
            paymentMethodTypes = paymentMethodTypesArray.map {
                STPPaymentMethodType.fromIdentifier($0)
            }
        }

        var configuration = PaymentMethodMessagingElement.Configuration(
            amount: amount,
            currency: currency,
            locale: locale,
            countryCode: country,
            paymentMethodTypes: paymentMethodTypes,
        )

        // Apply appearance if available
        if let appearance = appearanceConfig {
            configuration.appearance = appearance
        }

        return (nil, configuration)
    }

    private func initMessagingElement(config: NSDictionary) {
        let configResult = buildPaymentMethodMessagingElementConfiguration(params: config)

        if let error = configResult.error {
            StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult([
                "status": "failed",
                "error": error,
            ])
            return
        }

        guard let configuration = configResult.configuration else {
            return
        }

        var resultMap: [String: String] = [:]
        var height: CGFloat? = 0

        Task {
            do {
                StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult(["status": "loading"])
                switch await PaymentMethodMessagingElement.create(configuration: configuration) {
                case .success(let paymentMethodMessagingElement):
                    self.messagingInstance = paymentMethodMessagingElement
                    height = self.messagingInstance?.view.systemLayoutSizeFitting(CGSize(width: paymentMethodMessagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
                    resultMap["status"] = "loaded"
                case .noContent:
                    resultMap["status"] = "no_content"
                    self.messagingInstance = nil
                case .failed(let error):
                    self.messagingInstance = nil
                    resultMap["status"] = "failed"
                    resultMap["message"] = error.localizedDescription
                }
                
                StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": height ?? 0])
                StripeSdkImpl.shared.emitter?.emitPaymentMethodMessagingElementConfigureResult(resultMap)
                attachPaymentElementIfAvailable()
            }
        }
    }
}
