#ifdef RCT_NEW_ARCH_ENABLED
#import <rnstripe/rnstripe.h>
#else
#import <React/RCTBridgeModule.h>
#import "StripeSdkEventEmitterCompat.h"
#endif

NS_ASSUME_NONNULL_BEGIN

#ifdef RCT_NEW_ARCH_ENABLED
@interface StripeOnrampSdk : NativeOnrampSdkModuleSpecBase <NativeOnrampSdkModuleSpec>
#else
@interface StripeOnrampSdk : StripeSdkEventEmitterCompat <RCTBridgeModule>
#endif
@end

NS_ASSUME_NONNULL_END
