#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StripeSdk, NSObject)

RCT_EXTERN_METHOD(initialise:(NSString *)publishableKey)

RCT_EXTERN_METHOD(
                  registerConfirmPaymentCallbacks:(RCTResponseSenderBlock)onSuccess
                  onError:(RCTResponseSenderBlock)onError)

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

@end
