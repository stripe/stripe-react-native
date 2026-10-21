#import "CheckoutPaymentElementViewComponentView.h"
#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface CheckoutPaymentElementViewComponentView () <RCTCheckoutPaymentElementViewViewProtocol>
@end

@implementation CheckoutPaymentElementViewComponentView {
  CheckoutPaymentElementContainerView *_view;
}

+ (void)load { [super load]; }

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const CheckoutPaymentElementViewProps>();
    [self prepareView];
  }
  return self;
}

- (void)prepareView
{
  _view = [CheckoutPaymentElementContainerView new];
  self.contentView = _view;
  __weak __typeof(self) weakSelf = self;
  _view.onHeightChanged = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) { return; }
    CheckoutPaymentElementViewEventEmitter::OnHeightChanged payload = {.height = [event[@"height"] doubleValue]};
    std::static_pointer_cast<const CheckoutPaymentElementViewEventEmitter>(strongSelf->_eventEmitter)->onHeightChanged(payload);
  };
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &viewProps = *std::static_pointer_cast<const CheckoutPaymentElementViewProps>(props);
  _view.controllerId = RCTNSStringFromString(viewProps.controllerId);
  [super updateProps:props oldProps:oldProps];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<CheckoutPaymentElementViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [_view detach];
  [super prepareForRecycle];
  [self prepareView];
}
@end

Class<RCTComponentViewProtocol> CheckoutPaymentElementViewCls(void)
{
  return CheckoutPaymentElementViewComponentView.class;
}
