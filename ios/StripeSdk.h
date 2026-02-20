#ifdef RCT_NEW_ARCH_ENABLED
#import <rnstripe/rnstripe.h>
#else
#import <React/RCTBridgeModule.h>
#endif

#import "StripeSdkEventEmitterCompat.h"

NS_ASSUME_NONNULL_BEGIN

@class StripeSdkImpl;

#ifdef RCT_NEW_ARCH_ENABLED
// This is a temporary compat layer for event emitters on new arch.
// Versions before RN 0.80 crash sometimes when setting the event emitter callback.
// Use NativeStripeSdkModuleSpecBase once we drop support for RN < 0.80.
@interface StripeSdk : StripeSdkEventEmitterCompat <NativeStripeSdkModuleSpec>
#else
@interface StripeSdk : StripeSdkEventEmitterCompat <RCTBridgeModule>
#endif

@end

NS_ASSUME_NONNULL_END

