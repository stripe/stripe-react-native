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
  PMMEDirectEventQueue *_eventQueue;
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
    _eventQueue = [PMMEDirectEventQueue new];
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [PaymentMethodMessagingElementContainerView new];
  self.contentView = _view;

  __weak __typeof(self) weakSelf = self;
  NSUInteger generation = _eventQueue.generation;

  _view.onConfigureResult = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || strongSelf->_eventQueue.generation != generation) {
      return;
    }
    [strongSelf dispatchConfigureResultEvent:event];
  };

  _view.onHeightChanged = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || strongSelf->_eventQueue.generation != generation) {
      return;
    }
    [strongSelf dispatchHeightChangedEvent:event];
  };
}

- (void)dispatchConfigureResultEvent:(NSDictionary *)event
{
  if (!_eventEmitter) {
    [_eventQueue enqueueConfigureResult:event];
    return;
  }

  PaymentMethodMessagingElementViewEventEmitter::OnConfigureResult emitterEvent = {
      .result = convertIdToFollyDynamic(event[@"result"])};
  std::static_pointer_cast<const PaymentMethodMessagingElementViewEventEmitter>(_eventEmitter)
      ->onConfigureResult(std::move(emitterEvent));
}

- (void)dispatchHeightChangedEvent:(NSDictionary *)event
{
  if (!_eventEmitter) {
    [_eventQueue enqueueHeightChanged:event];
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
  __weak __typeof(self) weakSelf = self;
  [_eventQueue flushWithConfigureDeliver:^(NSDictionary *event) {
    [weakSelf dispatchConfigureResultEvent:event];
  }
                           heightDeliver:^(NSDictionary *event) {
                             [weakSelf dispatchHeightChangedEvent:event];
                           }];
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
  [_eventQueue invalidate];
  [_view prepareForRecycle];
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> PaymentMethodMessagingElementViewCls(void)
{
  return PaymentMethodMessagingElementViewComponentView.class;
}
