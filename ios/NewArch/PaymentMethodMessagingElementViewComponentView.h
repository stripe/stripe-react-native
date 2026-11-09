#import <React/RCTViewComponentView.h>

@interface PaymentMethodMessagingElementViewComponentView : RCTViewComponentView
@end

#if DEBUG
@interface PaymentMethodMessagingElementViewComponentView (Testing)
@property (nonatomic, copy, nullable) void (^stripe_onConfigureResultForTesting)(NSDictionary *event);
@property (nonatomic, copy, nullable) void (^stripe_onHeightChangedForTesting)(NSDictionary *event);
- (void)stripe_flushPendingEventsForTesting;
@end
#endif
