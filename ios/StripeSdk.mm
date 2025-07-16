#import "StripeSdk.h"
#import "StripeSwiftInterop.h"

@interface StripeSdk () <StripeSdkEmitter>
@end

@implementation StripeSdk

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSDictionary *)constantsToExport
{
  // Used for old arch.
  return [StripeSdkImpl.shared getConstants];
}

- (NSDictionary *)getConstants
{
  // Used for new arch.
  return [StripeSdkImpl.shared getConstants];
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    StripeSdkImpl.shared.emitter = self;
  }
  return self;
}

// Clang format is really bad at fromatting method with macros.
/* clang-format off */

RCT_EXPORT_METHOD(canAddCardToWallet:(nonnull NSDictionary *)params
                             resolve:(nonnull RCTPromiseResolveBlock)resolve
                              reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared canAddCardToWallet:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(collectBankAccount:(BOOL)isPaymentIntent
                        clientSecret:(nonnull NSString *)clientSecret
                              params:(nonnull NSDictionary *)params
                             resolve:(nonnull RCTPromiseResolveBlock)resolve
                              reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared collectBankAccount:isPaymentIntent
                              clientSecret:clientSecret
                                    params:params
                                  resolver:resolve
                                  rejecter:reject];
}

RCT_EXPORT_METHOD(collectBankAccountToken:(nonnull NSString *)clientSecret
                                   params:(nonnull NSDictionary *)params
                                  resolve:(nonnull RCTPromiseResolveBlock)resolve
                                   reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared collectBankAccountToken:clientSecret params:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(collectFinancialConnectionsAccounts:(nonnull NSString *)clientSecret
                                               params:(nonnull NSDictionary *)params
                                              resolve:(nonnull RCTPromiseResolveBlock)resolve
                                               reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared collectFinancialConnectionsAccounts:clientSecret
                                                     params:params
                                                   resolver:resolve
                                                   rejecter:reject];
}

RCT_EXPORT_METHOD(configureOrderTracking:(nonnull NSString *)orderTypeIdentifier
                         orderIdentifier:(nonnull NSString *)orderIdentifier
                           webServiceUrl:(nonnull NSString *)webServiceUrl
                     authenticationToken:(nonnull NSString *)authenticationToken
                                 resolve:(nonnull RCTPromiseResolveBlock)resolve
                                  reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared configureOrderTracking:orderTypeIdentifier
                               orderIdentifier:orderIdentifier
                                 webServiceUrl:webServiceUrl
                           authenticationToken:authenticationToken
                                      resolver:resolve
                                      rejecter:reject];
}

RCT_EXPORT_METHOD(confirmPayment:(nonnull NSString *)paymentIntentClientSecret
                          params:(nonnull NSDictionary *)params
                         options:(nonnull NSDictionary *)options
                         resolve:(nonnull RCTPromiseResolveBlock)resolve
                          reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared confirmPayment:paymentIntentClientSecret
                                  data:params
                               options:options
                              resolver:resolve
                              rejecter:reject];
}

RCT_EXPORT_METHOD(confirmPaymentSheetPayment:(nonnull RCTPromiseResolveBlock)resolve
                                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared confirmPaymentSheetPayment:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(confirmPlatformPay:(nonnull NSString *)clientSecret
                              params:(nonnull NSDictionary *)params
                     isPaymentIntent:(BOOL)isPaymentIntent
                             resolve:(nonnull RCTPromiseResolveBlock)resolve
                              reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared confirmPlatformPay:clientSecret
                                    params:params
                           isPaymentIntent:isPaymentIntent
                                  resolver:resolve
                                  rejecter:reject];
}

RCT_EXPORT_METHOD(confirmSetupIntent:(nonnull NSString *)paymentIntentClientSecret
                              params:(nonnull NSDictionary *)params
                             options:(nonnull NSDictionary *)options
                             resolve:(nonnull RCTPromiseResolveBlock)resolve
                              reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared confirmSetupIntent:paymentIntentClientSecret
                                      data:params
                                   options:options
                                  resolver:resolve
                                  rejecter:reject];
}

RCT_EXPORT_METHOD(createPaymentMethod:(nonnull NSDictionary *)params
                              options:(nonnull NSDictionary *)options
                              resolve:(nonnull RCTPromiseResolveBlock)resolve
                               reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared createPaymentMethod:params options:options resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(createPlatformPayPaymentMethod:(nonnull NSDictionary *)params
                         usesDeprecatedTokenFlow:(BOOL)usesDeprecatedTokenFlow
                                         resolve:(nonnull RCTPromiseResolveBlock)resolve
                                          reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared createPlatformPayPaymentMethod:params
                               usesDeprecatedTokenFlow:usesDeprecatedTokenFlow
                                              resolver:resolve
                                              rejecter:reject];
}

RCT_EXPORT_METHOD(createToken:(nonnull NSDictionary *)params
                      resolve:(nonnull RCTPromiseResolveBlock)resolve
                       reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared createToken:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(createTokenForCVCUpdate:(nonnull NSString *)cvc
                                  resolve:(nonnull RCTPromiseResolveBlock)resolve
                                   reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared createTokenForCVCUpdate:cvc resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(customerAdapterAttachPaymentMethodCallback:(nonnull NSDictionary *)paymentMethod
                                                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                                                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customerAdapterAttachPaymentMethodCallback:paymentMethod resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(customerAdapterDetachPaymentMethodCallback:(nonnull NSDictionary *)paymentMethod
                                                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                                                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customerAdapterDetachPaymentMethodCallback:paymentMethod resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(customerAdapterFetchPaymentMethodsCallback:(nonnull NSArray *)paymentMethods
                                                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                                                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customerAdapterFetchPaymentMethodsCallback:paymentMethods resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(customerAdapterFetchSelectedPaymentOptionCallback:(NSString *_Nullable)paymentOption
                                                            resolve:(nonnull RCTPromiseResolveBlock)resolve
                                                             reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customerAdapterFetchSelectedPaymentOptionCallback:paymentOption
                                                                 resolver:resolve
                                                                 rejecter:reject];
}

RCT_EXPORT_METHOD(customerAdapterSetSelectedPaymentOptionCallback:(nonnull RCTPromiseResolveBlock)resolve
                                                           reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customerAdapterSetSelectedPaymentOptionCallback:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(customerAdapterSetupIntentClientSecretForCustomerAttachCallback:(nonnull NSString *)clientSecret
                                                                          resolve:(nonnull RCTPromiseResolveBlock)resolve
                                                                           reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customerAdapterSetupIntentClientSecretForCustomerAttachCallback:clientSecret
                                                                               resolver:resolve
                                                                               rejecter:reject];
}

RCT_EXPORT_METHOD(dismissPlatformPay:(nonnull RCTPromiseResolveBlock)resolve
                              reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared dismissPlatformPay:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(handleNextAction:(nonnull NSString *)paymentIntentClientSecret
                         returnURL:(NSString *_Nullable)returnURL
                           resolve:(nonnull RCTPromiseResolveBlock)resolve
                            reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared handleNextAction:paymentIntentClientSecret
                               returnURL:returnURL
                                resolver:resolve
                                rejecter:reject];
}

RCT_EXPORT_METHOD(handleNextActionForSetup:(nonnull NSString *)setupIntentClientSecret
                                 returnURL:(NSString *_Nullable)returnURL
                                   resolve:(nonnull RCTPromiseResolveBlock)resolve
                                    reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared handleNextActionForSetup:setupIntentClientSecret
                                       returnURL:returnURL
                                        resolver:resolve
                                        rejecter:reject];
}

RCT_EXPORT_METHOD(handleURLCallback:(nonnull NSString *)url
                            resolve:(nonnull RCTPromiseResolveBlock)resolve
                             reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared handleURLCallback:url resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(initCustomerSheet:(nonnull NSDictionary *)params
          customerAdapterOverrides:(nonnull NSDictionary *)customerAdapterOverrides
                           resolve:(nonnull RCTPromiseResolveBlock)resolve
                            reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared initCustomerSheet:params
                 customerAdapterOverrides:customerAdapterOverrides
                                 resolver:resolve
                                 rejecter:reject];
}

RCT_EXPORT_METHOD(initPaymentSheet:(nonnull NSDictionary *)params
                           resolve:(nonnull RCTPromiseResolveBlock)resolve
                            reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared initPaymentSheet:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(initialise:(nonnull NSDictionary *)params
                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared initialise:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(intentCreationCallback:(nonnull NSDictionary *)result
                                 resolve:(nonnull RCTPromiseResolveBlock)resolve
                                  reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared intentCreationCallback:result resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(isCardInWallet:(nonnull NSDictionary *)params
                         resolve:(nonnull RCTPromiseResolveBlock)resolve
                          reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared isCardInWallet:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(isPlatformPaySupported:(nonnull NSDictionary *)params
                                 resolve:(nonnull RCTPromiseResolveBlock)resolve
                                  reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared isPlatformPaySupported:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(openApplePaySetup:(nonnull RCTPromiseResolveBlock)resolve
                             reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared openApplePaySetup:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(presentCustomerSheet:(nonnull NSDictionary *)params
                               resolve:(nonnull RCTPromiseResolveBlock)resolve
                                reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared presentCustomerSheet:params resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(presentPaymentSheet:(nonnull NSDictionary *)options
                              resolve:(nonnull RCTPromiseResolveBlock)resolve
                               reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared presentPaymentSheet:options resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(resetPaymentSheetCustomer:(nonnull RCTPromiseResolveBlock)resolve
                                     reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared resetPaymentSheetCustomer:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(retrieveCustomerSheetPaymentOptionSelection:(nonnull RCTPromiseResolveBlock)resolve
                                                       reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared retrieveCustomerSheetPaymentOptionSelection:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(retrievePaymentIntent:(nonnull NSString *)clientSecret
                                resolve:(nonnull RCTPromiseResolveBlock)resolve
                                 reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared retrievePaymentIntent:clientSecret resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(retrieveSetupIntent:(nonnull NSString *)clientSecret
                              resolve:(nonnull RCTPromiseResolveBlock)resolve
                               reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared retrieveSetupIntent:clientSecret resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(updatePlatformPaySheet:(nonnull NSArray *)summaryItems
                         shippingMethods:(nonnull NSArray *)shippingMethods
                                  errors:(nonnull NSArray *)errors
                                 resolve:(nonnull RCTPromiseResolveBlock)resolve
                                  reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared updatePlatformPaySheet:summaryItems
                               shippingMethods:shippingMethods
                                        errors:errors
                                      resolver:resolve
                                      rejecter:reject];
}

RCT_EXPORT_METHOD(verifyMicrodeposits:(BOOL)isPaymentIntent
                         clientSecret:(nonnull NSString *)clientSecret
                               params:(nonnull NSDictionary *)params
                              resolve:(nonnull RCTPromiseResolveBlock)resolve
                               reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared verifyMicrodeposits:isPaymentIntent
                               clientSecret:clientSecret
                                     params:params
                                   resolver:resolve
                                   rejecter:reject];
}

RCT_EXPORT_METHOD(createEmbeddedPaymentElement:(nonnull NSDictionary *)intentConfig
                                 configuration:(nonnull NSDictionary *)configuration
                                       resolve:(nonnull RCTPromiseResolveBlock)resolve
                                        reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared createEmbeddedPaymentElement:intentConfig
                                       configuration:configuration
                                             resolve:resolve
                                              reject:reject];
}

RCT_EXPORT_METHOD(confirmEmbeddedPaymentElement:(NSInteger)viewTag
                                        resolve:(nonnull RCTPromiseResolveBlock)resolve
                                         reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared confirmEmbeddedPaymentElement:resolve reject:reject];
}

RCT_EXPORT_METHOD(updateEmbeddedPaymentElement:(NSDictionary *)intentConfig
                                       resolve:(nonnull RCTPromiseResolveBlock)resolve
                                        reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared updateEmbeddedPaymentElement:intentConfig resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(clearEmbeddedPaymentOption:(NSInteger)viewTag
                                     resolve:(nonnull RCTPromiseResolveBlock)resolve
                                      reject:(nonnull RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared clearEmbeddedPaymentOption];
  resolve(nil);
}

RCT_EXPORT_METHOD(customPaymentMethodResultCallback:(nonnull NSDictionary *)result
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [StripeSdkImpl.shared customPaymentMethodResultCallback:result resolver:resolve rejecter:reject];
}

/* clang-format on */

#ifdef RCT_NEW_ARCH_ENABLED

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeStripeSdkModuleSpecJSI>(params);
}

#endif

@end
