#import "CheckoutExpressCheckoutElementViewComponentView.h"
#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface CheckoutExpressCheckoutElementViewComponentView () <RCTCheckoutExpressCheckoutElementViewViewProtocol>
@end

@implementation CheckoutExpressCheckoutElementViewComponentView {
  CheckoutExpressCheckoutElementContainerView *_view;
}

+ (void)load { [super load]; }

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const CheckoutExpressCheckoutElementViewProps>();
    _view = [CheckoutExpressCheckoutElementContainerView new];
    self.contentView = _view;
    __weak __typeof(self) weakSelf = self;
    _view.onHeightChanged = ^(NSDictionary *event) {
      __typeof(self) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) { return; }
      CheckoutExpressCheckoutElementViewEventEmitter::OnHeightChanged payload = {
        .height = [event[@"height"] doubleValue]
      };
      std::static_pointer_cast<const CheckoutExpressCheckoutElementViewEventEmitter>(strongSelf->_eventEmitter)->onHeightChanged(payload);
    };
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &viewProps = *std::static_pointer_cast<const CheckoutExpressCheckoutElementViewProps>(props);
  _view.controllerId = RCTNSStringFromString(viewProps.controllerId);
  [super updateProps:props oldProps:oldProps];
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter
{
  [super updateEventEmitter:eventEmitter];
  [_view replayHeight];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<CheckoutExpressCheckoutElementViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [_view detach];
  _view.controllerId = nil;
  [super prepareForRecycle];
}

@end

Class<RCTComponentViewProtocol> CheckoutExpressCheckoutElementViewCls(void)
{
  return CheckoutExpressCheckoutElementViewComponentView.class;
}
