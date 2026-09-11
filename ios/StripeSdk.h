#import <rnstripe/rnstripe.h>

#import "StripeSdkEventEmitterCompat.h"

NS_ASSUME_NONNULL_BEGIN

@class StripeSdkImpl;

// This is a temporary compat layer for event emitters on new arch.
// Versions before RN 0.80 crash sometimes when setting the event emitter callback.
// Use NativeStripeSdkModuleSpecBase once we drop support for RN < 0.80.
@interface StripeSdk : StripeSdkEventEmitterCompat <NativeStripeSdkModuleSpec>

@end

NS_ASSUME_NONNULL_END

