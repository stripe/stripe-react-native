#import "CardFormComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import "StripeNewArchConversions.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;
using namespace stripe::react;

@interface CardFormComponentView () <RCTCardFormViewProtocol>
@end

@implementation CardFormComponentView {
  CardFormView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const CardFormProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[CardFormView alloc] initWithFrame:self.frame];
  self.contentView = _view;

  __weak __typeof(self) weakSelf = self;

  _view.onFormComplete = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    CardFormEventEmitter::OnFormComplete emitterEvent = {.card = convertIdToFollyDynamic(event[@"card"])};
    std::static_pointer_cast<const CardFormEventEmitter>(strongSelf->_eventEmitter)
        ->onFormComplete(std::move(emitterEvent));
  };

  _view.onFocusChange = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    NSString *focusedField = event[@"focusedField"];
    if (focusedField.length == 0) {
      return;
    }
    CardFormEventEmitter::OnFocusChange emitterEvent;
    if ([focusedField isEqualToString:@"CardNumber"]) {
      emitterEvent.focusedField = CardFormEventEmitter::OnFocusChangeFocusedField::CardNumber;
    } else if ([focusedField isEqualToString:@"Cvc"]) {
      emitterEvent.focusedField = CardFormEventEmitter::OnFocusChangeFocusedField::Cvc;
    } else if ([focusedField isEqualToString:@"ExpiryDate"]) {
      emitterEvent.focusedField = CardFormEventEmitter::OnFocusChangeFocusedField::ExpiryDate;
    } else if ([focusedField isEqualToString:@"PostalCode"]) {
      emitterEvent.focusedField = CardFormEventEmitter::OnFocusChangeFocusedField::PostalCode;
    } else {
      return;
    }
    std::static_pointer_cast<const CardFormEventEmitter>(strongSelf->_eventEmitter)
        ->onFocusChange(std::move(emitterEvent));
  };
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const CardFormProps>(props);

  _view.autofocus = newViewProps.autofocus;
  _view.cardStyle = convertFollyDynamicToNSDictionary(newViewProps.cardStyle);
  _view.dangerouslyGetFullCardDetails = newViewProps.dangerouslyGetFullCardDetails;
  _view.disabled = newViewProps.disabled;
  _view.preferredNetworks = convertIntVectorToNSArray(newViewProps.preferredNetworks);

  [super updateProps:props oldProps:oldProps];

  [_view didSetProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<CardFormComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTCardFormHandleCommand(self, commandName, args);
}

- (void)blur
{
  [_view blur];
}

- (void)focus
{
  [_view focus];
}

@end

Class<RCTComponentViewProtocol> CardFormCls(void)
{
  return CardFormComponentView.class;
}
