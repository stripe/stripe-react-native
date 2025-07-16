#ifndef RCT_NEW_ARCH_ENABLED

#import "StripeSdkEventEmitterCompat.h"

@implementation StripeSdkEventEmitterCompat

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"onOrderTrackingCallback",
    @"onConfirmHandlerCallback",
    @"onCustomerAdapterFetchPaymentMethodsCallback",
    @"onCustomerAdapterAttachPaymentMethodCallback",
    @"onCustomerAdapterDetachPaymentMethodCallback",
    @"onCustomerAdapterSetSelectedPaymentOptionCallback",
    @"onCustomerAdapterFetchSelectedPaymentOptionCallback",
    @"onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback",
    @"onFinancialConnectionsEvent",
    @"embeddedPaymentElementDidUpdateHeight",
    @"embeddedPaymentElementWillPresent",
    @"embeddedPaymentElementDidUpdatePaymentOption",
    @"embeddedPaymentElementFormSheetConfirmComplete",
    @"embeddedPaymentElementRowSelectionImmediateAction",
    @"embeddedPaymentElementLoadingFailed",
    @"onCustomPaymentMethodConfirmHandlerCallback"
  ];
}

- (void)emitOnConfirmHandlerCallback:(NSDictionary *)value
{
  [self sendEventWithName:@"onConfirmHandlerCallback" body:value];
}

- (void)emitOnFinancialConnectionsEvent:(NSDictionary *)value
{
  [self sendEventWithName:@"onFinancialConnectionsEvent" body:value];
}

- (void)emitOnOrderTrackingCallback
{
  [self sendEventWithName:@"onOrderTrackingCallback" body:@{}];
}

- (void)emitOnCustomerAdapterFetchPaymentMethodsCallback
{
  [self sendEventWithName:@"onCustomerAdapterFetchPaymentMethodsCallback" body:@{}];
}

- (void)emitOnCustomerAdapterAttachPaymentMethodCallback:(NSDictionary *)value
{
  [self sendEventWithName:@"onCustomerAdapterAttachPaymentMethodCallback" body:value];
}

- (void)emitOnCustomerAdapterDetachPaymentMethodCallback:(NSDictionary *)value
{
  [self sendEventWithName:@"onCustomerAdapterDetachPaymentMethodCallback" body:value];
}

- (void)emitOnCustomerAdapterSetSelectedPaymentOptionCallback:(NSDictionary *)value
{
  [self sendEventWithName:@"onCustomerAdapterSetSelectedPaymentOptionCallback" body:value];
}

- (void)emitOnCustomerAdapterFetchSelectedPaymentOptionCallback
{
  [self sendEventWithName:@"onCustomerAdapterFetchSelectedPaymentOptionCallback" body:@{}];
}

- (void)emitOnCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback
{
  [self sendEventWithName:@"onCustomerAdapterSetupIntentClientSecretForCustomerAttachCallback" body:@{}];
}

- (void)emitEmbeddedPaymentElementDidUpdateHeight:(NSDictionary *)value
{
  [self sendEventWithName:@"embeddedPaymentElementDidUpdateHeight" body:value];
}

- (void)emitEmbeddedPaymentElementWillPresent
{
  [self sendEventWithName:@"embeddedPaymentElementWillPresent" body:@{}];
}

- (void)emitEmbeddedPaymentElementDidUpdatePaymentOption:(NSDictionary *)value
{
  [self sendEventWithName:@"embeddedPaymentElementDidUpdatePaymentOption" body:value];
}

- (void)emitEmbeddedPaymentElementFormSheetConfirmComplete:(NSDictionary *)value
{
  [self sendEventWithName:@"embeddedPaymentElementFormSheetConfirmComplete" body:value];
}

- (void)emitEmbeddedPaymentElementRowSelectionImmediateAction
{
  [self sendEventWithName:@"embeddedPaymentElementRowSelectionImmediateAction" body:@{}];
}

- (void)emitEmbeddedPaymentElementLoadingFailed:(NSDictionary *)value
{
  [self sendEventWithName:@"embeddedPaymentElementLoadingFailed"  body:value];
}

- (void)emitOnCustomPaymentMethodConfirmHandlerCallback:(NSDictionary *)value
{
  [self sendEventWithName:@"onCustomPaymentMethodConfirmHandlerCallback" body:value];
}

@end

#endif
