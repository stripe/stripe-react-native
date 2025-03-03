#import "AuBECSDebitFormComponentView.h"

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

@interface AuBECSDebitFormComponentView () <RCTAuBECSDebitFormViewProtocol>
@end

@implementation AuBECSDebitFormComponentView {
  AuBECSDebitFormView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const AuBECSDebitFormProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[AuBECSDebitFormView alloc] initWithFrame:self.frame];
  self.contentView = _view;

  __weak __typeof(self) weakSelf = self;

  _view.onCompleteAction = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    AuBECSDebitFormEventEmitter::OnCompleteAction emitterEvent = {
        .name = RCTStringFromNSString(event[@"name"]),
        .accountNumber = RCTStringFromNSString(event[@"accountNumber"]),
        .bsbNumber = RCTStringFromNSString(event[@"bsbNumber"]),
        .email = RCTStringFromNSString(event[@"email"])};
    std::static_pointer_cast<const AuBECSDebitFormEventEmitter>(strongSelf->_eventEmitter)
        ->onCompleteAction(std::move(emitterEvent));
  };
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const AuBECSDebitFormProps>(props);

  _view.companyName = RCTNSStringFromStringNilIfEmpty(newViewProps.companyName);
  _view.formStyle = convertFollyDynamicToNSDictionaryOrNil(newViewProps.formStyle);

  [super updateProps:props oldProps:oldProps];

  [_view didSetProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<AuBECSDebitFormComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> AuBECSDebitFormCls(void)
{
  return AuBECSDebitFormComponentView.class;
}
