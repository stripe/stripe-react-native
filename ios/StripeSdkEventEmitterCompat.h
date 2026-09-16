// This is a compat layer for new architecture event emitters on React Native < 0.80.
// It avoids crashes when setting the generated event emitter callback by using RCTEventEmitter.

#import <React/RCTEventEmitter.h>

@interface StripeSdkEventEmitterCompat : RCTEventEmitter

- (void)emitOnConfirmHandlerCallback:(NSDictionary *)value;
- (void)emitOnConfirmationTokenHandlerCallback:(NSDictionary *)value;
- (void)emitOnFinancialConnectionsEvent:(NSDictionary *)value;
- (void)emitOnOrderTrackingCallback;
- (void)emitOnCustomerAdapterFetchPaymentMethodsCallback;
- (void)emitOnCustomerAdapterAttachPaymentMethodCallback:(NSDictionary *)value;
- (void)emitOnCustomerAdapterDetachPaymentMethodCallback:(NSDictionary *)value;
- (void)emitOnCustomerAdapterSetSelectedPaymentOptionCallback:(NSDictionary *)value;
- (void)emitOnCustomerAdapterFetchSelectedPaymentOptionCallback;
- (void)emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback;
- (void)emitOnCustomerSessionProviderSetupIntentClientSecret;
- (void)emitOnCustomerSessionProviderCustomerSessionClientSecret;
- (void)emitEmbeddedPaymentElementDidUpdateHeight:(NSDictionary *)value;
- (void)emitEmbeddedPaymentElementWillPresent;
- (void)emitEmbeddedPaymentElementDidUpdatePaymentOption:(NSDictionary *)value;
- (void)emitEmbeddedPaymentElementFormSheetConfirmComplete:(NSDictionary *)value;
- (void)emitEmbeddedPaymentElementRowSelectionImmediateAction;
- (void)emitEmbeddedPaymentElementLoadingFailed:(NSDictionary *)value;
- (void)emitOnCustomPaymentMethodConfirmHandlerCallback:(NSDictionary *)value;
- (void)emitOnCheckoutClientSecretRequested:(NSDictionary *)value;
- (void)emitPaymentMethodMessagingElementDidUpdateHeight:(NSDictionary *)value;
- (void)emitPaymentMethodMessagingElementConfigureResult:(NSDictionary *)value;
- (void)emitCheckoutControllerDidUpdate:(NSDictionary *)value;
@end
