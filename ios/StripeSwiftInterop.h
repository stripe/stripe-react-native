// Import this header instead of the generated Swift header directly to make sure
// it includes all its dependencies.

// The generated Swift header is missing some type defs.
@protocol STPAuthenticationContext;
@protocol STPApplePayContextDelegate;
@protocol PKPaymentAuthorizationViewControllerDelegate;
@protocol STPIssuingCardEphemeralKeyProvider;
@protocol PKAddPaymentPassViewControllerDelegate;
@protocol STPAUBECSDebitFormViewDelegate;
@protocol STPPaymentCardTextFieldDelegate;
@protocol STPCardFormViewDelegate;

typedef NS_ENUM(NSInteger, STPPaymentStatus);

// The generated Swift header also depends on these headers.
#import <React/RCTBridgeModule.h>
#import <React/RCTVersion.h>
#import <React/RCTViewManager.h>

// Older integrations used the stripe_react_native module name. SwiftPM uses
// StripeReactNativeCore for the Swift implementation target.
#if __has_include(<StripeReactNativeCore/StripeReactNativeCore-Swift.h>)
#import <StripeReactNativeCore/StripeReactNativeCore-Swift.h>
#elif __has_include("StripeReactNativeCore-Swift.h")
#import "StripeReactNativeCore-Swift.h"
#elif __has_include("stripe_react_native/stripe_react_native-Swift.h")
#import <stripe_react_native/stripe_react_native-Swift.h>
#elif __has_include(<stripe_react_native-Swift.h>)
#import <stripe_react_native-Swift.h>
#endif
