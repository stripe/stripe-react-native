#import "ConnectInlineHostComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface ConnectInlineHostComponentView () <RCTStripeConnectInlineHostViewProtocol>
@end

@implementation ConnectInlineHostComponentView {
  ConnectInlineSheetCoordinator *_coordinator;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const StripeConnectInlineHostProps>();
    _props = defaultProps;
    [self prepareCoordinator];
  }

  return self;
}

- (void)dealloc
{
  [_coordinator detach];
}

- (void)prepareCoordinator
{
  [_coordinator detach];
  _coordinator = [[ConnectInlineSheetCoordinator alloc] initWithHostView:self];

  __weak __typeof(self) weakSelf = self;

  _coordinator.onAttach = ^(BOOL attached) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    StripeConnectInlineHostEventEmitter::OnAttach event = {.attached = static_cast<bool>(attached)};
    std::static_pointer_cast<const StripeConnectInlineHostEventEmitter>(strongSelf->_eventEmitter)
        ->onAttach(std::move(event));
  };

  _coordinator.onOpenUrl = ^(NSString *url) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    StripeConnectInlineHostEventEmitter::OnOpenUrl event = {.url = std::string([url UTF8String])};
    std::static_pointer_cast<const StripeConnectInlineHostEventEmitter>(strongSelf->_eventEmitter)
        ->onOpenUrl(std::move(event));
  };
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const StripeConnectInlineHostProps>(props);

  _coordinator.connectJsOrigin = RCTNSStringFromStringNilIfEmpty(newViewProps.connectJsOrigin);
  _coordinator.sheetBackgroundColor = RCTUIColorFromSharedColor(newViewProps.sheetBackgroundColor);

  [super updateProps:props oldProps:oldProps];
  [_coordinator setNeedsAttach];
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [super mountChildComponentView:childComponentView index:index];
  [_coordinator setNeedsAttach];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [_coordinator setNeedsAttach];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTStripeConnectInlineHostHandleCommand(self, commandName, args);
}

- (void)sheetChanged:(NSString *)sheetId height:(double)height dismissible:(BOOL)dismissible
{
  [_coordinator sheetChangedWithSheetId:sheetId height:height dismissible:dismissible];
}

- (void)resetSheets
{
  [_coordinator resetSheets];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<StripeConnectInlineHostComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareCoordinator];
}

@end

Class<RCTComponentViewProtocol> StripeConnectInlineHostCls(void)
{
  return ConnectInlineHostComponentView.class;
}
