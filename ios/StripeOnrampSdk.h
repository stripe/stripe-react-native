#ifdef RCT_NEW_ARCH_ENABLED
#import <rnstripe/rnstripe.h>
#endif

#import "StripeSdkEventEmitterCompat.h"

NS_ASSUME_NONNULL_BEGIN

#ifdef RCT_NEW_ARCH_ENABLED
@interface StripeOnrampSdk : StripeSdkEventEmitterCompat <NativeOnrampSdkModuleSpec>
#else
@interface StripeOnrampSdk : StripeSdkEventEmitterCompat <RCTBridgeModule>
#endif
@end

NS_ASSUME_NONNULL_END
