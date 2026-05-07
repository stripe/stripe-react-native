#import "EmbeddedPaymentElementViewComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "StripeNewArchConversions.h"
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

#pragma mark - Shared Codegen Commands

// These commands are declared on the shared `NativeEmbeddedPaymentElement`
// component spec because Android targets its mounted Compose view directly.
// iOS does not handle EPE actions through this view: the view only hosts
// `StripeSdkImpl.shared.embeddedInstance.view`, while create/update/confirm/
// clear are routed through `StripeSdkImpl` module methods. The no-op methods
// keep the generated Fabric command protocol satisfied on iOS.
- (void)clearPaymentOption
{
}

- (void)confirm
{
}

- (void)update:(NSString *)intentConfigurationJson
{
}

- (void)updateWithCheckout:(NSString *)sessionKey
{
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
