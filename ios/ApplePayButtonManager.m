#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "RCTViewManager.h"

@interface RCT_EXTERN_MODULE(ApplePayButtonManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onPay, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(type, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(buttonStyle, NSNumber)
@end
