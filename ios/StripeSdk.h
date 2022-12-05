
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNStripeSdkSpec.h"

@interface StripeSdk : NSObject <NativeStripeSdkSpec>
#else
#import <React/RCTBridgeModule.h>

@interface StripeSdk : NSObject <RCTBridgeModule>
#endif

@end
