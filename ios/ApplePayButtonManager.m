#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(ApplePayButtonManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(type, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(buttonStyle, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(borderRadius, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onShippingMethodSelectedAction, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onShippingContactSelectedAction, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCouponCodeEnteredAction, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onOrderTrackingAction, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(hasShippingMethodCallback, BOOL)
RCT_EXPORT_VIEW_PROPERTY(hasShippingContactCallback, BOOL)
RCT_EXPORT_VIEW_PROPERTY(hasCouponCodeCallback, BOOL)
RCT_EXPORT_VIEW_PROPERTY(hasOrderTrackingCallback, BOOL)

@end
