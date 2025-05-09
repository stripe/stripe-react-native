//
//  AddToWalletButtonView.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 3/28/22.
//

import Foundation
import Stripe

@objc(AddToWalletButtonView)
public class AddToWalletButtonView: UIView {
    var pushProvisioningContext: STPPushProvisioningContext? = nil
    var addToWalletButton: PKAddPassButton? = nil

    @objc public var testEnv: Bool = false
    @objc public var iOSButtonStyle: NSString?
    @objc public var cardDetails: NSDictionary?
    @objc public var ephemeralKey: NSDictionary?
    @objc public var onCompleteAction: RCTDirectEventBlock?

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
  
    @objc public func didSetProps() {
        if let addToWalletButton = addToWalletButton {
            addToWalletButton.removeFromSuperview()
        }

        let style = Mappers.mapToPKAddPassButtonStyle(style: iOSButtonStyle as String?)

        self.addToWalletButton = PKAddPassButton.init(addPassButtonStyle: style)

        if let addToWalletButton = self.addToWalletButton {
            addToWalletButton.addTarget(self, action: #selector(beginPushProvisioning), for: .touchUpInside)
            self.addSubview(addToWalletButton)
        }
    }

    public override func didSetProps(_ changedProps: [String]!) {
        // This is only called on old arch, for new arch didSetProps() will be called
        // by the view component.
        self.didSetProps()
    }

    @objc func beginPushProvisioning() {
        if (!PushProvisioningUtils.canAddPaymentPass(isTestMode: self.testEnv)) {
            onCompleteAction!(
                Errors.createError(
                    ErrorType.Failed,
                    "This app cannot add cards to Apple Pay. For information on requesting the necessary entitlement, see the Card Issuers section at developer.apple.com/apple-pay/."
                ) as? [AnyHashable : Any]
            )
            return
        }

        guard let cardHolderName = cardDetails?["name"] as? String else {
            onCompleteAction!(
                Errors.createError(
                    ErrorType.Failed,
                    "Missing parameters. `cardDetails.name` must be supplied in the props to <AddToWalletButton />"
                ) as? [AnyHashable : Any]
            )
            return
        }

        if (cardHolderName.isEmpty) {
            onCompleteAction!(
                Errors.createError(
                    ErrorType.Failed,
                    "`cardDetails.name` is required, but the passed string was empty"
                ) as? [AnyHashable : Any]
            )
            return
        }

        let config = STPPushProvisioningContext.requestConfiguration(
            withName: cardHolderName,
            description: cardDetails?["description"] as? String,
            last4: cardDetails?["lastFour"] as? String,
            brand: Mappers.mapToCardBrand(cardDetails?["brand"] as? String),
            primaryAccountIdentifier: cardDetails?["primaryAccountIdentifier"] as? String
        )

        // We can use STPFakeAddPaymentPassViewController ONLY IN TEST MODE. If STPFakeAddPaymentPassViewController is
        // used with a live mode card, the flow will fail and show a 'Signing certificate was invalid' error.
        let controller = {
            return self.testEnv ? STPFakeAddPaymentPassViewController(requestConfiguration: config, delegate: self) : PKAddPaymentPassViewController(requestConfiguration: config, delegate: self)
        }()

        let vc = findViewControllerPresenter(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController())
        vc.present(controller!, animated: true, completion: nil)
    }
    
    override public init(frame: CGRect) {
        super.init(frame: frame)
    }
    
    override public func layoutSubviews() {
        if let addToWalletButton = self.addToWalletButton {
            addToWalletButton.frame = self.bounds
        }
    }
}


extension AddToWalletButtonView: PKAddPaymentPassViewControllerDelegate {
    public func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler handler: @escaping (PKAddPaymentPassRequest) -> Void) {
        self.pushProvisioningContext = STPPushProvisioningContext(keyProvider: self)

        self.pushProvisioningContext?.addPaymentPassViewController(controller, generateRequestWithCertificateChain: certificates, nonce: nonce, nonceSignature: nonceSignature, completionHandler: handler);
    }

    public func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
        if let error = error as NSError? {
            onCompleteAction!(
                Errors.createError(
                    error.code == PKAddPaymentPassError.userCancelled.rawValue ? ErrorType.Canceled : ErrorType.Failed,
                    error as NSError?
                ) as? [AnyHashable : Any]
            )
        } else {
            onCompleteAction!([
                "error": NSNull(),
            ] as [AnyHashable : Any])
        }
        controller.dismiss(animated: true, completion: nil)
    }
}


extension AddToWalletButtonView: STPIssuingCardEphemeralKeyProvider {
    public func createIssuingCardKey(withAPIVersion apiVersion: String, completion: @escaping STPJSONResponseCompletionBlock) {
        if let ephemeralKey = self.ephemeralKey as? [AnyHashable : Any] {
            completion(ephemeralKey, nil)
        } else {
            onCompleteAction!(
                Errors.createError(
                    ErrorType.Failed,
                    "Missing parameters. `ephemeralKey` must be supplied in the props to <AddToWalletButton />"
                ) as? [AnyHashable : Any]
            )
            completion(nil, nil)
        }
    }
}
