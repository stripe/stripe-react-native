#ifdef RCT_NEW_ARCH_ENABLED
#import <rnstripe/rnstripe.h>
#else
#import <React/RCTBridgeModule.h>
#import "StripeSdkEventEmitterCompat.h"
#endif

NS_ASSUME_NONNULL_BEGIN

@class StripeSdkImpl;

#ifdef RCT_NEW_ARCH_ENABLED
@interface StripeSdk : NativeStripeSdkModuleSpecBase <NativeStripeSdkModuleSpec>
#else
@interface StripeSdk : StripeSdkEventEmitterCompat <RCTBridgeModule>
#endif

@end

NS_ASSUME_NONNULL_END

