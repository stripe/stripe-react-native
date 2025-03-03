#import "AddressSheetViewComponentView.h"

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

@interface AddressSheetViewComponentView () <RCTAddressSheetViewViewProtocol>
@end

@implementation AddressSheetViewComponentView {
  AddressSheetView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const AddressSheetViewProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[AddressSheetView alloc] initWithFrame:self.frame];
  self.contentView = _view;

  __weak __typeof(self) weakSelf = self;

  _view.onSubmitAction = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    AddressSheetViewEventEmitter::OnSubmitAction emitterEvent = {.result = convertIdToFollyDynamic(event[@"result"])};
    std::static_pointer_cast<const AddressSheetViewEventEmitter>(strongSelf->_eventEmitter)
        ->onSubmitAction(std::move(emitterEvent));
  };

  _view.onErrorAction = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    AddressSheetViewEventEmitter::OnErrorAction emitterEvent = {.error = convertIdToFollyDynamic(event[@"error"])};
    std::static_pointer_cast<const AddressSheetViewEventEmitter>(strongSelf->_eventEmitter)
        ->onErrorAction(std::move(emitterEvent));
  };
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const AddressSheetViewProps>(props);

  _view.visible = newViewProps.visible;
  _view.presentationStyle = RCTNSStringFromString(newViewProps.presentationStyle);
  _view.animationStyle = RCTNSStringFromString(newViewProps.animationStyle);
  _view.appearance = convertFollyDynamicToNSDictionaryOrNil(newViewProps.appearance);
  _view.defaultValues = convertFollyDynamicToNSDictionaryOrNil(newViewProps.defaultValues);
  _view.additionalFields = convertFollyDynamicToNSDictionaryOrNil(newViewProps.additionalFields);
  _view.allowedCountries = convertStringVectorToNSArray(newViewProps.allowedCountries);
  _view.autocompleteCountries = convertStringVectorToNSArray(newViewProps.autocompleteCountries);
  _view.primaryButtonTitle = RCTNSStringFromStringNilIfEmpty(newViewProps.primaryButtonTitle);
  _view.sheetTitle = RCTNSStringFromStringNilIfEmpty(newViewProps.sheetTitle);

  [super updateProps:props oldProps:oldProps];

  [_view didSetProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<AddressSheetViewComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> AddressSheetViewCls(void)
{
  return AddressSheetViewComponentView.class;
}
