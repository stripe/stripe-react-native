//
//  ApplePayViewController.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 9/15/22.
//

import Foundation
import Stripe

extension StripeSdk : PKPaymentAuthorizationViewControllerDelegate, STPApplePayContextDelegate {
    func paymentAuthorizationViewController(
        _ controller: PKPaymentAuthorizationViewController,
        didAuthorizePayment payment: PKPayment,
        handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        applePaymentMethodFlowCanBeCanceled = false
        STPAPIClient.shared.createPaymentMethod(with: payment) { paymentMethod, error in
            if let error = error {
                self.createNativePayPaymentMethodResolver?(Errors.createError(ErrorType.Failed, error))
            } else {
                STPAPIClient.shared.createToken(with: payment) { token, error in
                    if let error = error {
                        self.createNativePayPaymentMethodResolver?(Errors.createError(ErrorType.Failed, error))
                    } else {
                        var promiseResult = ["paymentMethod": Mappers.mapFromPaymentMethod(paymentMethod) ?? [:]]
                        if let token = token {
                            promiseResult["token"] = Mappers.mapFromToken(token: token)
                        }
                        self.createNativePayPaymentMethodResolver?(promiseResult)
                    }
                }
            }
            completion(PKPaymentAuthorizationResult.init(status: .success, errors: nil))
        }
    }
    
    func paymentAuthorizationViewControllerDidFinish(
        _ controller: PKPaymentAuthorizationViewController
    ) {
        if (applePaymentMethodFlowCanBeCanceled) {
            self.createNativePayPaymentMethodResolver?(Errors.createError(ErrorType.Canceled, "The payment has been canceled"))
            applePaymentMethodFlowCanBeCanceled = false
        }
        _ = maybeDismissApplePay()
    }
    
    func maybeDismissApplePay() -> Bool {
        if let applePaymentAuthorizationController = applePaymentAuthorizationController {
            DispatchQueue.main.async {
                applePaymentAuthorizationController.dismiss(animated: true)
            }
            return true
        }
        return false
    }
    
    @available(iOS 15.0, *)
    func paymentAuthorizationViewController(
        _ controller: PKPaymentAuthorizationViewController,
        didChangeCouponCode couponCode: String,
        handler completion: @escaping (PKPaymentRequestCouponCodeUpdate) -> Void
    ) {
        self.couponCodeUpdateHandler = completion
        sendEvent(withName: "onDidSetCouponCode", body: ["couponCode": couponCode])
    }
    
    func paymentAuthorizationViewController(
        _ controller: PKPaymentAuthorizationViewController,
        didSelect shippingMethod: PKShippingMethod,
        handler completion: @escaping (PKPaymentRequestShippingMethodUpdate) -> Void
    ) {
        self.shippingMethodUpdateHandler = completion
        sendEvent(withName: "onDidSetShippingMethod", body: ["shippingMethod": Mappers.mapFromShippingMethod(shippingMethod: shippingMethod)])
    }
    
    func paymentAuthorizationViewController(
        _ controller: PKPaymentAuthorizationViewController,
        didSelectShippingContact contact: PKContact,
        handler completion: @escaping (PKPaymentRequestShippingContactUpdate) -> Void
    ) {
        self.shippingContactUpdateHandler = completion
        sendEvent(withName: "onDidSetShippingContact", body: ["shippingContact": Mappers.mapFromShippingContact(shippingContact: contact)])
    }
    
    func applePayContext(
        _ context: STPApplePayContext,
        didSelect shippingMethod: PKShippingMethod,
        handler: @escaping (PKPaymentRequestShippingMethodUpdate) -> Void
    ) {
        self.shippingMethodUpdateHandler = handler
        sendEvent(withName: "onDidSetShippingMethod", body: ["shippingMethod": Mappers.mapFromShippingMethod(shippingMethod: shippingMethod)])
    }
    
    func applePayContext(
        _ context: STPApplePayContext,
        didSelectShippingContact contact: PKContact,
        handler: @escaping (PKPaymentRequestShippingContactUpdate) -> Void
    ) {
        self.shippingContactUpdateHandler = handler
        sendEvent(withName: "onDidSetShippingContact", body: ["shippingContact": Mappers.mapFromShippingContact(shippingContact: contact)])
    }
    
    func applePayContext(
        _ context: STPApplePayContext,
        didCreatePaymentMethod paymentMethod: STPPaymentMethod,
        paymentInformation: PKPayment,
        completion: @escaping STPIntentClientSecretCompletionBlock
    ) {
        self.applePayCompletionCallback = completion
        
        let address = paymentMethod.billingDetails?.address?.line1?.split(whereSeparator: \.isNewline)
        if (address?.indices.contains(0) == true) {
            paymentMethod.billingDetails?.address?.line1 = String(address?[0] ?? "")
        }
        if (address?.indices.contains(1) == true) {
            paymentMethod.billingDetails?.address?.line2 = String(address?[1] ?? "")
        }
        
        let method = Mappers.mapFromPaymentMethod(paymentMethod)
        self.applePayRequestResolver?(Mappers.createResult("paymentMethod", method))
        self.applePayRequestRejecter = nil
    }
    
    func applePayContext(
        _ context: STPApplePayContext,
        didCompleteWith status: STPPaymentStatus,
        error: Error?
    ) {
        switch status {
        case .success:
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
            confirmApplePayPaymentResolver?([])
            break
        case .error:
            let message = "Payment not completed"
            applePayCompletionRejecter?(ErrorType.Failed, message, nil)
            applePayRequestRejecter?(ErrorType.Failed, message, nil)
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
            break
        case .userCancellation:
            let message = "The payment has been canceled"
            applePayCompletionRejecter?(ErrorType.Canceled, message, nil)
            applePayRequestRejecter?(ErrorType.Canceled, message, nil)
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
            break
        @unknown default:
            let message = "Payment not completed"
            applePayCompletionRejecter?(ErrorType.Unknown, message, nil)
            applePayRequestRejecter?(ErrorType.Unknown, message, nil)
            applePayCompletionRejecter = nil
            applePayRequestRejecter = nil
        }
    }
    
}
