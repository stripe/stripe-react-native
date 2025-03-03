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
}
