#import "CardFieldComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "RCTFollyConvert.h"
#import "StripeNewArchConversions.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;
using namespace stripe::react;

@interface CardFieldComponentView () <RCTCardFieldViewProtocol>
@end

@implementation CardFieldComponentView {
  CardFieldView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const CardFieldProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[CardFieldView alloc] initWithFrame:self.frame];
  self.contentView = _view;

  __weak __typeof(self) weakSelf = self;

  _view.onCardChange = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    CardFieldEventEmitter::OnCardChange emitterEvent = {.card = convertIdToFollyDynamic(event[@"card"])};
    std::static_pointer_cast<const CardFieldEventEmitter>(strongSelf->_eventEmitter)
        ->onCardChange(std::move(emitterEvent));
  };

  _view.onFocusChange = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    CardFieldEventEmitter::OnFocusChange emitterEvent = {.focusedField = RCTStringFromNSString(event[@"focusedField"])};
    std::static_pointer_cast<const CardFieldEventEmitter>(strongSelf->_eventEmitter)
        ->onFocusChange(std::move(emitterEvent));
  };
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const CardFieldProps>(props);

  _view.autofocus = newViewProps.autofocus;
  _view.cardStyle = convertFollyDynamicToNSDictionary(newViewProps.cardStyle);
  _view.countryCode = RCTNSStringFromStringNilIfEmpty(newViewProps.countryCode);
  _view.dangerouslyGetFullCardDetails = newViewProps.dangerouslyGetFullCardDetails;
  _view.disabled = newViewProps.disabled;
  _view.onBehalfOf = RCTNSStringFromStringNilIfEmpty(newViewProps.onBehalfOf);
  _view.placeholders = convertFollyDynamicToNSDictionary(newViewProps.placeholders);
  _view.postalCodeEnabled = newViewProps.postalCodeEnabled;
  _view.preferredNetworks = convertIntVectorToNSArray(newViewProps.preferredNetworks);

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<CardFieldComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTCardFieldHandleCommand(self, commandName, args);
}

- (void)blur
{
  [_view blur];
}

- (void)focus
{
  [_view focus];
}

- (void)clear
{
  [_view clear];
}

@end

Class<RCTComponentViewProtocol> CardFieldCls(void)
{
  return CardFieldComponentView.class;
}
