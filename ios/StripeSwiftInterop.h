// Import this header instead of stripe_react_native-Swift.h to make sure
// it includes all its dependencies.

// stripe_react_native-Swift.h is missing some type defs.
@protocol STPAuthenticationContext;
@protocol STPApplePayContextDelegate;
@protocol PKPaymentAuthorizationViewControllerDelegate;
@protocol STPIssuingCardEphemeralKeyProvider;
@protocol PKAddPaymentPassViewControllerDelegate;
@protocol STPAUBECSDebitFormViewDelegate;
@protocol STPPaymentCardTextFieldDelegate;
@protocol STPCardFormViewDelegate;

typedef NS_ENUM(NSUInteger, STPPaymentStatus);

// stripe_react_native-Swift.h also depends on these headers.
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

// When using frameworks the import is different.
#if __has_include("stripe_react_native/stripe_react_native-Swift.h")
#import <stripe_react_native/stripe_react_native-Swift.h>
#elif __has_include(<stripe_react_native-Swift.h>)
#import <stripe_react_native-Swift.h>
#endif
