#import "StripeOnrampSdk.h"
#import "StripeSwiftInterop.h"

@interface StripeOnrampSdk () <StripeOnrampSdkEmitter>
@end

@implementation StripeOnrampSdk
RCT_EXPORT_MODULE(OnrampSdk)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    StripeSdkImpl.shared.onrampEmitter = self;
  }
  return self;
}

RCT_EXPORT_METHOD(configureOnramp:(nonnull NSDictionary *)config
                          resolve:(nonnull RCTPromiseResolveBlock)resolve
                           reject:(nonnull RCTPromiseRejectBlock)reject)
{
  NSLog(@"[OnrampSdk] configureOnramp called with config: %@", config);
  [StripeSdkImpl.shared configureOnramp:config resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(hasLinkAccount:(nonnull NSString *)email
                         resolve:(nonnull RCTPromiseResolveBlock)resolve
                          reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared hasLinkAccount:email resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(registerLinkUser:(nonnull NSDictionary *)info
                           resolve:(nonnull RCTPromiseResolveBlock)resolve
                            reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared registerLinkUser:info resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(authenticateUser:(nonnull RCTPromiseResolveBlock)resolve
                            reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared authenticateUser:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(authenticateUserWithToken:(nonnull NSString *)linkAuthTokenClientSecret
                                    resolve:(nonnull RCTPromiseResolveBlock)resolve
                                     reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared authenticateUserWithToken:linkAuthTokenClientSecret resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(registerWalletAddress:(nonnull NSString *)address
                                network:(nonnull NSString *)network
                                resolve:(nonnull RCTPromiseResolveBlock)resolve
                                 reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared registerWalletAddress:address network:network resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(attachKycInfo:(nonnull NSDictionary *)info
                        resolve:(nonnull RCTPromiseResolveBlock)resolve
                         reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared attachKycInfo:info resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(presentKycInfoVerification:(NSDictionary *)updatedAddress
                                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared presentKycInfoVerification:updatedAddress resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(updatePhoneNumber:(nonnull NSString *)phone
                            resolve:(nonnull RCTPromiseResolveBlock)resolve
                             reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared updatePhoneNumber:phone resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(verifyIdentity:(nonnull RCTPromiseResolveBlock)resolve
                          reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared verifyIdentity:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(collectPaymentMethod:(nonnull NSString *)paymentMethod
                     platformPayParams:(nonnull NSDictionary *)platformPayParams
                               resolve:(nonnull RCTPromiseResolveBlock)resolve
                                reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared collectPaymentMethod:paymentMethod platformPayParams:platformPayParams resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(createCryptoPaymentToken:(nonnull RCTPromiseResolveBlock)resolve
                                    reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared createCryptoPaymentToken:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(performCheckout:(nonnull NSString *)onrampSessionId
                          resolve:(nonnull RCTPromiseResolveBlock)resolve
                           reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared performCheckout:onrampSessionId resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(provideCheckoutClientSecret:(NSString *)clientSecret)
{
  [StripeSdkImpl.shared provideCheckoutClientSecret:clientSecret];
}

RCT_EXPORT_METHOD(logout:(nonnull RCTPromiseResolveBlock)resolve
                  reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared logout:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(onrampAuthorize:(nonnull NSString *)linkAuthIntentId
                          resolve:(nonnull RCTPromiseResolveBlock)resolve
                           reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared onrampAuthorize:linkAuthIntentId resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(getCryptoTokenDisplayData:(nonnull NSDictionary *)token
                          resolve:(nonnull RCTPromiseResolveBlock)resolve
                           reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared getCryptoTokenDisplayData:token resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(initialise:(nonnull NSDictionary *)params
                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared initialise:params resolver:resolve rejecter:reject];
}


#ifdef RCT_NEW_ARCH_ENABLED

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeOnrampSdkModuleSpecJSI>(params);
}

#endif

@end
