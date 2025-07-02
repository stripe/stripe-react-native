#import "ApplePayButtonComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "RCTFollyConvert.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface ApplePayButtonComponentView () <RCTApplePayButtonViewProtocol>
@end

@implementation ApplePayButtonComponentView {
  ApplePayButtonView *_view;
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const ApplePayButtonProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [[ApplePayButtonView alloc] initWithFrame:self.frame];
  self.contentView = _view;
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const ApplePayButtonProps>(props);

  _view.type = @(newViewProps.type);
  _view.buttonStyle = @(newViewProps.buttonStyle);
  _view.disabled = newViewProps.disabled;
  _view.borderRadius = @(newViewProps.borderRadius);
  
  // Set the boolean flags from props
  _view.hasShippingMethodCallback = newViewProps.hasShippingMethodCallback;
  _view.hasShippingContactCallback = newViewProps.hasShippingContactCallback;
  _view.hasCouponCodeCallback = newViewProps.hasCouponCodeCallback;
  _view.hasOrderTrackingCallback = newViewProps.hasOrderTrackingCallback;

  [super updateProps:props oldProps:oldProps];

  // Set up callbacks conditionally based on the boolean flags
  __weak __typeof(self) weakSelf = self;
  
  if (newViewProps.hasShippingMethodCallback) {
    _view.onShippingMethodSelectedAction = ^(NSDictionary *event) {
      __typeof(self) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) {
        return;
      }
      ApplePayButtonEventEmitter::OnShippingMethodSelectedAction emitterEvent = {
          .shippingMethod = convertIdToFollyDynamic(event[@"shippingMethod"])};
      std::static_pointer_cast<const ApplePayButtonEventEmitter>(strongSelf->_eventEmitter)
          ->onShippingMethodSelectedAction(std::move(emitterEvent));
    };
  } else {
    _view.onShippingMethodSelectedAction = nil;
  }

  if (newViewProps.hasShippingContactCallback) {
    _view.onShippingContactSelectedAction = ^(NSDictionary *event) {
      __typeof(self) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) {
        return;
      }
      ApplePayButtonEventEmitter::OnShippingContactSelectedAction emitterEvent = {
          .shippingContact = convertIdToFollyDynamic(event[@"shippingContact"])};
      std::static_pointer_cast<const ApplePayButtonEventEmitter>(strongSelf->_eventEmitter)
          ->onShippingContactSelectedAction(std::move(emitterEvent));
    };
  } else {
    _view.onShippingContactSelectedAction = nil;
  }

  if (newViewProps.hasCouponCodeCallback) {
    _view.onCouponCodeEnteredAction = ^(NSDictionary *event) {
      __typeof(self) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) {
        return;
      }
      ApplePayButtonEventEmitter::OnCouponCodeEnteredAction emitterEvent = {
          .couponCode = RCTStringFromNSString(event[@"couponCode"])};
      std::static_pointer_cast<const ApplePayButtonEventEmitter>(strongSelf->_eventEmitter)
          ->onCouponCodeEnteredAction(std::move(emitterEvent));
    };
  } else {
    _view.onCouponCodeEnteredAction = nil;
  }

  if (newViewProps.hasOrderTrackingCallback) {
    _view.onOrderTrackingAction = ^(NSDictionary *event) {
      __typeof(self) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) {
        return;
      }
      ApplePayButtonEventEmitter::OnOrderTrackingAction emitterEvent = {};
      std::static_pointer_cast<const ApplePayButtonEventEmitter>(strongSelf->_eventEmitter)
          ->onOrderTrackingAction(std::move(emitterEvent));
    };
  } else {
    _view.onOrderTrackingAction = nil;
  }

  [_view didSetProps];
}

#pragma mark - RCTComponentViewProtocol

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<ApplePayButtonComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> ApplePayButtonCls(void)
{
  return ApplePayButtonComponentView.class;
}
