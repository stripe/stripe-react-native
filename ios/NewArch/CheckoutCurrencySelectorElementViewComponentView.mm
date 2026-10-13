#import "CheckoutCurrencySelectorElementViewComponentView.h"
#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface CheckoutCurrencySelectorElementViewComponentView () <RCTCheckoutCurrencySelectorElementViewViewProtocol>
@end

@implementation CheckoutCurrencySelectorElementViewComponentView {
  CheckoutCurrencySelectorElementContainerView *_view;
}

+ (void)load { [super load]; }

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const CheckoutCurrencySelectorElementViewProps>();
    _view = [CheckoutCurrencySelectorElementContainerView new];
    self.contentView = _view;
    __weak __typeof(self) weakSelf = self;
    _view.onHeightChanged = ^(NSDictionary *event) {
      __typeof(self) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) { return; }
      CheckoutCurrencySelectorElementViewEventEmitter::OnHeightChanged payload = {
        .height = [event[@"height"] doubleValue]
      };
      std::static_pointer_cast<const CheckoutCurrencySelectorElementViewEventEmitter>(strongSelf->_eventEmitter)->onHeightChanged(payload);
    };
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &viewProps = *std::static_pointer_cast<const CheckoutCurrencySelectorElementViewProps>(props);
  _view.controllerId = RCTNSStringFromString(viewProps.controllerId);
  [super updateProps:props oldProps:oldProps];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<CheckoutCurrencySelectorElementViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_view detach];
  _view.controllerId = nil;
}

@end

Class<RCTComponentViewProtocol> CheckoutCurrencySelectorElementViewCls(void)
{
  return CheckoutCurrencySelectorElementViewComponentView.class;
}
