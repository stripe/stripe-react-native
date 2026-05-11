#import "StripeCurrencySelectorElementComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "StripeNewArchConversions.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface StripeCurrencySelectorElementComponentView () <RCTStripeCurrencySelectorElementViewProtocol>
@end

@implementation StripeCurrencySelectorElementComponentView {
  StripeCurrencySelectorElementContainerView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const StripeCurrencySelectorElementProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[StripeCurrencySelectorElementContainerView alloc] initWithFrame:self.frame];
  self.contentView = _view;
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const StripeCurrencySelectorElementProps>(props);

  _view.sessionKey = RCTNSStringFromStringNilIfEmpty(newViewProps.sessionKey);
  _view.disabled = newViewProps.disabled;

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<StripeCurrencySelectorElementComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> StripeCurrencySelectorElementCls(void)
{
  return StripeCurrencySelectorElementComponentView.class;
}
