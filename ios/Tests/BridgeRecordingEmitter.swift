import Foundation
@testable import stripe_react_native

/// Records the events a runner needs to assert; the rest are ignored.
final class BridgeRecordingEmitter: NSObject, StripeSdkEmitter {
    private(set) var events: [String: Any] = [:]

    func emitEmbeddedPaymentElementLoadingFailed(_ value: [String: Any]) { events["loadingFailed"] = value }

    func emitCheckoutServerUpdateRequested(_ value: [String: Any]) {}
    func emitOnConfirmHandlerCallback(_ value: [String: Any]) {}
    func emitOnConfirmationTokenHandlerCallback(_ value: [String: Any]) {}
    func emitOnFinancialConnectionsEvent(_ value: [String: Any]) {}
    func emitOnOrderTrackingCallback() {}
    func emitOnCustomerAdapterFetchPaymentMethodsCallback() {}
    func emitOnCustomerAdapterAttachPaymentMethodCallback(_ value: [String: Any]) {}
    func emitOnCustomerAdapterDetachPaymentMethodCallback(_ value: [String: Any]) {}
    func emitOnCustomerAdapterSetSelectedPaymentOptionCallback(_ value: [String: Any]) {}
    func emitOnCustomerAdapterFetchSelectedPaymentOptionCallback() {}
    func emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback() {}
    func emitOnCustomerSessionProviderSetupIntentClientSecret() {}
    func emitOnCustomerSessionProviderCustomerSessionClientSecret(_ value: [String: Any]) {}
    func emitEmbeddedPaymentElementDidUpdateHeight(_ value: [String: Any]) {}
    func emitEmbeddedPaymentElementWillPresent() {}
    func emitEmbeddedPaymentElementDidUpdatePaymentOption(_ value: [String: Any]) {}
    func emitEmbeddedPaymentElementFormSheetConfirmComplete(_ value: [String: Any]) {}
    func emitEmbeddedPaymentElementRowSelectionImmediateAction() {}
    func emitOnCustomPaymentMethodConfirmHandlerCallback(_ value: [String: Any]) {}
    func emitPaymentMethodMessagingElementDidUpdateHeight(_ value: [String: Any]) {}
    func emitPaymentMethodMessagingElementConfigureResult(_ value: [String: Any]) {}
    func emitCheckoutControllerDidUpdate(_ value: [String: Any]) {}
    func emitCheckoutControllerDidSelectPaymentOption(_ value: [String: Any]) {}
    func emitCheckoutExpressCheckoutDidComplete(_ value: [String: Any]) {}
}
