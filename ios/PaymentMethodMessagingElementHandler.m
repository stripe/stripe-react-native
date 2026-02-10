#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PaymentMethodMessagingElementView, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(appearance, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(configuration, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onLoadComplete, RCTDirectEventBlock)
@end
