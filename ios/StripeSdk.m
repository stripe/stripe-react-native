#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StripeSdk, NSObject)

RCT_EXTERN_METHOD(
                  initialise:(NSString *)publishableKey
                  appInfo: (NSDictionary *)appInfo
                  stripeAccountId: (NSString *)stripeAccountId
                  params: (NSDictionary *)params
                  merchantIdentifier: (NSString *)merchantIdentifier
                  )

RCT_EXTERN_METHOD(
                  isApplePaySupported: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(
                  payWithApplePay:(NSArray *)items
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(
                  registerApplePayCallbacks:(RCTResponseSenderBlock)onSuccess
                  onError:(RCTResponseSenderBlock)onError)

RCT_EXTERN_METHOD(unregisterApplePayCallbacks)

RCT_EXTERN_METHOD(
                  completePaymentWithApplePay:(NSString *)clientSecret
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  registerConfirmPaymentCallbacks:(RCTResponseSenderBlock)onSuccess
                  onError:(RCTResponseSenderBlock)onError)

RCT_EXTERN_METHOD(unregisterConfirmPaymentCallbacks)

RCT_EXTERN_METHOD(
                  createPaymentMethod:(NSDictionary *)params
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  handleNextPaymentAction:(NSString *)paymentIntentClientSecret
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(
                  confirmPaymentMethod:(NSString *)paymentIntentClientSecret
                  params:(NSDictionary *)params
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject
                  )
RCT_EXTERN_METHOD(configure3dSecure:(NSDictionary *)params)


RCT_EXTERN_METHOD(
                  registerConfirmSetupIntentCallbacks:(RCTResponseSenderBlock)onSuccess
                  onError: (RCTResponseSenderBlock)onError
                  )

RCT_EXTERN_METHOD(unregisterConfirmSetupIntentCallbacks)

RCT_EXTERN_METHOD(
                  confirmSetupIntent:(NSString *)setupIntentClientSecret
                  card: (NSDictionary *)card
                  billingDetails: (NSDictionary *)billingDetails
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject
                  )


@end
