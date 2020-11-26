#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "RCTViewManager.h"
#import <Stripe/Stripe.h>

@interface RCT_EXTERN_MODULE(ApplePayButtonManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onPay, RCTDirectEventBlock)
@end
