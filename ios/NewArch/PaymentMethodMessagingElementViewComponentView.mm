#import "PaymentMethodMessagingElementViewComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "StripeNewArchConversions.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface PaymentMethodMessagingElementViewComponentView () <RCTPaymentMethodMessagingElementViewViewProtocol>
@end

@implementation PaymentMethodMessagingElementViewComponentView {
  PaymentMethodMessagingElementContainerView *_view;
  NSDictionary *_pendingConfigureResultEvent;
  NSDictionary *_pendingHeightChangedEvent;
  NSUInteger _eventCallbackGeneration;
#if DEBUG
  void (^_stripe_onConfigureResultForTesting)(NSDictionary *);
  void (^_stripe_onHeightChangedForTesting)(NSDictionary *);
#endif
}

+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const PaymentMethodMessagingElementViewProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [PaymentMethodMessagingElementContainerView new];
  self.contentView = _view;

  __weak __typeof(self) weakSelf = self;
  NSUInteger generation = _eventCallbackGeneration;

  _view.onConfigureResult = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || strongSelf->_eventCallbackGeneration != generation) {
      return;
    }
    [strongSelf dispatchConfigureResultEvent:event];
  };

  _view.onHeightChanged = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || strongSelf->_eventCallbackGeneration != generation) {
      return;
    }
    [strongSelf dispatchHeightChangedEvent:event];
  };
}

- (void)dispatchConfigureResultEvent:(NSDictionary *)event
{
#if DEBUG
  if (_stripe_onConfigureResultForTesting) {
    _stripe_onConfigureResultForTesting(event);
    return;
  }
#endif
  if (!_eventEmitter) {
    _pendingConfigureResultEvent = [event copy];
    return;
  }

  PaymentMethodMessagingElementViewEventEmitter::OnConfigureResult emitterEvent = {
      .result = convertIdToFollyDynamic(event[@"result"])};
  std::static_pointer_cast<const PaymentMethodMessagingElementViewEventEmitter>(_eventEmitter)
      ->onConfigureResult(std::move(emitterEvent));
}

- (void)dispatchHeightChangedEvent:(NSDictionary *)event
{
#if DEBUG
  if (_stripe_onHeightChangedForTesting) {
    _stripe_onHeightChangedForTesting(event);
    return;
  }
#endif
  if (!_eventEmitter) {
    _pendingHeightChangedEvent = [event copy];
    return;
  }

  PaymentMethodMessagingElementViewEventEmitter::OnHeightChanged emitterEvent = {
      .height = [event[@"height"] doubleValue],
      .viewTag = [event[@"viewTag"] intValue]};
  std::static_pointer_cast<const PaymentMethodMessagingElementViewEventEmitter>(_eventEmitter)
      ->onHeightChanged(std::move(emitterEvent));
}

- (void)flushPendingEvents
{
  NSDictionary *pendingConfigureResultEvent = _pendingConfigureResultEvent;
  NSDictionary *pendingHeightChangedEvent = _pendingHeightChangedEvent;
  _pendingConfigureResultEvent = nil;
  _pendingHeightChangedEvent = nil;

  if (pendingConfigureResultEvent) {
    [self dispatchConfigureResultEvent:pendingConfigureResultEvent];
  }
  if (pendingHeightChangedEvent) {
    [self dispatchHeightChangedEvent:pendingHeightChangedEvent];
  }
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const PaymentMethodMessagingElementViewProps>(props);

  _view.appearance = stripe::react::convertFollyDynamicToNSDictionaryOrNil(newViewProps.appearance);
  _view.configuration = stripe::react::convertFollyDynamicToNSDictionary(newViewProps.configuration);

  [super updateProps:props oldProps:oldProps];
}

- (void)updateEventEmitter:(const facebook::react::EventEmitter::Shared &)eventEmitter
{
  [super updateEventEmitter:eventEmitter];
  [self flushPendingEvents];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<PaymentMethodMessagingElementViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  // Invalidate any retained blocks from the outgoing container before canceling
  // in-flight create work, so late completions cannot refill pending caches or
  // deliver into the next Fabric element after `_eventEmitter` is cleared.
  _eventCallbackGeneration += 1;
  [_view prepareForRecycle];
  _pendingConfigureResultEvent = nil;
  _pendingHeightChangedEvent = nil;
  [super prepareForRecycle];
  [self prepareView];
}

@end

#if DEBUG
@implementation PaymentMethodMessagingElementViewComponentView (Testing)

- (void)setStripe_onConfigureResultForTesting:(void (^)(NSDictionary *event))handler
{
  _stripe_onConfigureResultForTesting = [handler copy];
}

- (void (^)(NSDictionary *event))stripe_onConfigureResultForTesting
{
  return _stripe_onConfigureResultForTesting;
}

- (void)setStripe_onHeightChangedForTesting:(void (^)(NSDictionary *event))handler
{
  _stripe_onHeightChangedForTesting = [handler copy];
}

- (void (^)(NSDictionary *event))stripe_onHeightChangedForTesting
{
  return _stripe_onHeightChangedForTesting;
}

- (void)stripe_flushPendingEventsForTesting
{
  // Mirrors the production flush path invoked from `updateEventEmitter`.
  [self flushPendingEvents];
}

@end
#endif

Class<RCTComponentViewProtocol> PaymentMethodMessagingElementViewCls(void)
{
  return PaymentMethodMessagingElementViewComponentView.class;
}
