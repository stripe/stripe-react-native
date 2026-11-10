#import <XCTest/XCTest.h>
#import <UIKit/UIKit.h>

/// Fabric component-view coverage without production test sinks.
/// Pending-event enqueue/invalidate/flush behavior is unit-tested in
/// `PMMEDirectEventQueueTests`. Direct configure failures, equal-prop
/// reassignment, and recycle callback clearing are covered by
/// `PaymentMethodMessagingElementViewTests`. Height-only Fabric prop updates
/// are guarded in `updateProps` by comparing appearance/configuration against
/// `_props` before touching Swift setters.
@interface PaymentMethodMessagingElementComponentViewTests : XCTestCase
@end

@implementation PaymentMethodMessagingElementComponentViewTests

- (void)testPrepareForRecycleSwapsContainerAndNilsOutgoingCallbacks
{
  Class componentViewClass = NSClassFromString(@"PaymentMethodMessagingElementViewComponentView");
  XCTAssertNotNil(componentViewClass);

  UIView *componentView = [[componentViewClass alloc] initWithFrame:CGRectZero];
  UIView *oldContainer = componentView.subviews.firstObject;
  XCTAssertNotNil(oldContainer);
  XCTAssertEqualObjects(NSStringFromClass(oldContainer.class), @"PaymentMethodMessagingElementContainerView");

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
  XCTAssertNotNil([newContainer valueForKey:@"onConfigureResult"]);
  XCTAssertNotNil([newContainer valueForKey:@"onHeightChanged"]);
}

@end
