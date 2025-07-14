import Foundation

@objc public protocol StripeSdkEmitter {
    func emitOnConfirmHandlerCallback(_ value: [String: Any])
    func emitOnFinancialConnectionsEvent(_ value: [String: Any])
    func emitOnOrderTrackingCallback()
    func emitOnCustomerAdapterFetchPaymentMethodsCallback()
    func emitOnCustomerAdapterAttachPaymentMethodCallback(_ value: [String: Any])
    func emitOnCustomerAdapterDetachPaymentMethodCallback(_ value: [String: Any])
    func emitOnCustomerAdapterSetSelectedPaymentOptionCallback(_ value: [String: Any])
    func emitOnCustomerAdapterFetchSelectedPaymentOptionCallback()
    func emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback()
    func emitEmbeddedPaymentElementDidUpdateHeight(_ value: [String: Any])
    func emitEmbeddedPaymentElementWillPresent()
    func emitEmbeddedPaymentElementDidUpdatePaymentOption(_ value: [String: Any])
    func emitEmbeddedPaymentElementFormSheetConfirmComplete(_ value: [String: Any])
    func emitEmbeddedPaymentElementRowSelectionImmediateAction()
    func emitEmbeddedPaymentElementLoadingFailed(_ value: [String: Any])
    func emitOnCustomPaymentMethodConfirmHandlerCallback(_ value: [String: Any])
}
