#import <XCTest/XCTest.h>
#import "../StripeSdkEventEmitterCompat.h"

@interface StripeSdkEventEmitterCompatTests : XCTestCase
@end

@implementation StripeSdkEventEmitterCompatTests

- (void)testSupportsExpressCheckoutCompletionEvent
{
  StripeSdkEventEmitterCompat *emitter = [[StripeSdkEventEmitterCompat alloc] init];
  XCTAssertTrue([[emitter supportedEvents] containsObject:@"checkoutExpressCheckoutDidComplete"]);
}

@end
