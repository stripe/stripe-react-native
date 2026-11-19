#import <React/RCTBridgeModule.h>
#import <objc/message.h>

@interface HarnessCheckoutCoverage : NSObject <RCTBridgeModule>
@end

@implementation HarnessCheckoutCoverage

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(prepareCheckoutController:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  Class builder = NSClassFromString(@"HarnessCheckoutSession");
  SEL selector = @selector(registerFixtureControllerWithResolve:reject:);
  if (!builder || ![builder respondsToSelector:selector]) {
    reject(@"Failed", @"HarnessCheckoutSession is unavailable", nil);
    return;
  }
  void (*msgSend)(id, SEL, void (^)(NSString *), void (^)(NSString *)) =
      (void (*)(id, SEL, void (^)(NSString *), void (^)(NSString *)))objc_msgSend;
  msgSend(
      builder,
      selector,
      ^(NSString *controllerId) {
        resolve(controllerId);
      },
      ^(NSString *message) {
        reject(@"Failed", message, nil);
      });
}

RCT_EXPORT_METHOD(invalidateCheckoutControllers:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  Class sdk = NSClassFromString(@"StripeSdkImpl");
  if (!sdk) {
    reject(@"Failed", @"StripeSdkImpl is unavailable", nil);
    return;
  }
  id (*msgSend)(id, SEL) = (id (*)(id, SEL))objc_msgSend;
  id shared = msgSend(sdk, @selector(shared));
  if (!shared) {
    reject(@"Failed", @"StripeSdkImpl.shared is unavailable", nil);
    return;
  }
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    msgSend(shared, @selector(invalidateCheckoutControllers));
    dispatch_async(dispatch_get_main_queue(), ^{
      msgSend(shared, @selector(invalidateCheckoutControllers));
      resolve(nil);
    });
  });
}

@end
