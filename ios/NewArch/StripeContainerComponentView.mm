#import "StripeContainerComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "RCTFollyConvert.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface StripeContainerComponentView () <RCTStripeContainerViewProtocol>
@end

@implementation StripeContainerComponentView {
  StripeContainerView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const StripeContainerProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[StripeContainerView alloc] initWithFrame:self.frame];
  self.contentView = _view;
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const StripeContainerProps>(props);

  _view.keyboardShouldPersistTaps = newViewProps.keyboardShouldPersistTaps;

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<StripeContainerComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> StripeContainerCls(void)
{
  return StripeContainerComponentView.class;
}
