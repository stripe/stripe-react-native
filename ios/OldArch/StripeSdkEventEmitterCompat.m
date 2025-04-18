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
    @"onFinancialConnectionsEvent"
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

@end

#endif
