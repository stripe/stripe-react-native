#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "RCTViewManager.h"

@interface RCT_EXTERN_MODULE(CardFieldManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(postalCodeEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(value, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onCardChange, RCTDirectEventBlock)
@end
