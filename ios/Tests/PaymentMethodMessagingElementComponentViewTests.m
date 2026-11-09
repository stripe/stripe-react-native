#import <XCTest/XCTest.h>
#import <UIKit/UIKit.h>

@interface PaymentMethodMessagingElementComponentViewTests : XCTestCase
@end

@implementation PaymentMethodMessagingElementComponentViewTests

- (void)testInitialInvalidConfigurationReplaysWhenFabricEmitterAttaches
{
  Class componentViewClass = NSClassFromString(@"PaymentMethodMessagingElementViewComponentView");
  XCTAssertNotNil(componentViewClass);

  UIView *componentView = [[componentViewClass alloc] initWithFrame:CGRectZero];
  UIView *containerView = componentView.subviews.firstObject;
  XCTAssertEqualObjects(NSStringFromClass(containerView.class), @"PaymentMethodMessagingElementContainerView");

  [containerView setValue:@{@"amount" : @1000} forKey:@"configuration"];

  __block NSDictionary *event = nil;
  void (^handler)(NSDictionary *) = ^(NSDictionary *payload) {
    event = payload;
  };

  [componentView setValue:[handler copy] forKey:@"stripe_onConfigureResultForTesting"];
  XCTAssertNil(event);

  // `updateEventEmitter` flushes pending events after attaching the Fabric
  // emitter; constructing a real C++ EventEmitter here is impractical, so this
  // DEBUG helper exercises the same flush path.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
  [componentView performSelector:@selector(stripe_flushPendingEventsForTesting)];
#pragma clang diagnostic pop

  NSDictionary *result = event[@"result"];
  XCTAssertEqualObjects(result[@"status"], @"failed");
  XCTAssertEqualObjects(result[@"message"], @"currency is required");
  XCTAssertEqualObjects(result[@"code"], @"InvalidConfiguration");
}

- (void)testPrepareForRecycleDropsPendingAndIgnoresOutgoingCallbacks
{
  Class componentViewClass = NSClassFromString(@"PaymentMethodMessagingElementViewComponentView");
  XCTAssertNotNil(componentViewClass);

  UIView *componentView = [[componentViewClass alloc] initWithFrame:CGRectZero];
  UIView *oldContainer = componentView.subviews.firstObject;
  XCTAssertNotNil(oldContainer);

  [oldContainer setValue:@{@"amount" : @1000} forKey:@"configuration"];

  id retainedOutgoingConfigureCallback = [oldContainer valueForKey:@"onConfigureResult"];
  id retainedOutgoingHeightCallback = [oldContainer valueForKey:@"onHeightChanged"];
  XCTAssertNotNil(retainedOutgoingConfigureCallback);
  XCTAssertNotNil(retainedOutgoingHeightCallback);

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
  [componentView performSelector:@selector(prepareForRecycle)];
#pragma clang diagnostic pop

  XCTAssertNil([oldContainer valueForKey:@"onConfigureResult"]);
  XCTAssertNil([oldContainer valueForKey:@"onHeightChanged"]);

  UIView *newContainer = componentView.subviews.firstObject;
  XCTAssertNotNil(newContainer);
  XCTAssertNotEqualObjects(oldContainer, newContainer);

  __block NSDictionary *event = nil;
  void (^handler)(NSDictionary *) = ^(NSDictionary *payload) {
    event = payload;
  };
  [componentView setValue:[handler copy] forKey:@"stripe_onConfigureResultForTesting"];

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
  [componentView performSelector:@selector(stripe_flushPendingEventsForTesting)];
#pragma clang diagnostic pop
  XCTAssertNil(event);

  // A retained pre-recycle block must not refill pending caches or deliver into
  // the next Fabric element after generation invalidation.
  void (^outgoingConfigure)(NSDictionary *) = retainedOutgoingConfigureCallback;
  outgoingConfigure(@{@"result" : @{@"status" : @"loaded"}});
  void (^outgoingHeight)(NSDictionary *) = retainedOutgoingHeightCallback;
  outgoingHeight(@{@"height" : @42, @"viewTag" : @1});

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
  [componentView performSelector:@selector(stripe_flushPendingEventsForTesting)];
#pragma clang diagnostic pop
  XCTAssertNil(event);
}

@end
