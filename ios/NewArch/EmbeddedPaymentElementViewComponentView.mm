#import "EmbeddedPaymentElementViewComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "RCTFollyConvert.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface EmbeddedPaymentElementViewComponentView () <RCTEmbeddedPaymentElementViewViewProtocol>
@end

@implementation EmbeddedPaymentElementViewComponentView {
  EmbeddedPaymentElementContainerView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const EmbeddedPaymentElementViewProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [EmbeddedPaymentElementContainerView new];
  self.contentView = _view;
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTEmbeddedPaymentElementViewHandleCommand(self, commandName, args);
}

- (void)clearPaymentOption
{
  // Android only.
}

- (void)confirm
{
  // Android only.
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<EmbeddedPaymentElementViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}



@end

Class<RCTComponentViewProtocol> EmbeddedPaymentElementViewCls(void)
{
  return EmbeddedPaymentElementViewComponentView.class;
}
