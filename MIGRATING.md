# Migration Guide

## iOS: Stripe iOS SDK now resolved through Swift Package Manager (requires dynamic frameworks)

On React Native 0.75 and above, `@stripe/stripe-react-native` resolves its [Stripe iOS SDK](https://github.com/stripe/stripe-ios) dependency through Swift Package Manager instead of CocoaPods, because the Stripe iOS SDK is deprecating CocoaPods support. This requires building with dynamic frameworks. If your Podfile doesn't already set that linkage, add:

```ruby
use_frameworks! :linkage => :dynamic
```

For Expo apps, set `"useFrameworks": "dynamic"` via the [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/) plugin.

If your app can't build with dynamic frameworks yet, you can temporarily keep resolving the Stripe iOS SDK through CocoaPods (available while the Stripe iOS SDK continues publishing pods): add `$StripeDisableSPM = true` at the top of your Podfile, or for Expo set `"disableSPM": true` on this SDK's config plugin.

React Native versions below 0.75 are unaffected and continue to use CocoaPods resolution.

See [Stripe iOS SDK resolution](README.md#stripe-ios-sdk-resolution) in the README for more detail and a troubleshooting guide.

## Android SDK 36 requirement (stripe-android 23.x)

Recent versions of `@stripe/stripe-react-native` depend on `stripe-android 23.x`, which requires:

- `compileSdkVersion` 36
- `targetSdkVersion` 36
- `minSdkVersion` 23

Update your app's `android/build.gradle`:

```groovy
android {
    compileSdkVersion 36

    defaultConfig {
        minSdkVersion 23
        targetSdkVersion 36
    }
}
```

If you cannot upgrade to Android SDK 36, pin to an older `@stripe/stripe-react-native` version that uses `stripe-android` 22.x or earlier.

This is an Android-specific build requirement and does not affect iOS.

## Migrating from versions < 0.29.0

The legacy Apple Pay and Google Pay APIs (`useApplePay`, `useGooglePay`, `presentApplePay`, `confirmApplePayPayment`, `initGooglePay`, `presentGooglePay`, `createGooglePayPaymentMethod`, `<ApplePayButton />`, `<GooglePayButton />`) were removed in v0.29.0.

Use the Platform Pay API instead:

### `isApplePaySupported` / `isGooglePaySupported`

Replaced by `isPlatformPaySupported`:

```diff
- isGooglePaySupported(myParams);
+ isPlatformPaySupported({googlePay: myParams});
```

### `presentApplePay`, `confirmApplePayPayment`, `initGooglePay`, `presentGooglePay`, `createGooglePayPaymentMethod`

Replaced by:

- `confirmPlatformPaySetupIntent` — to confirm a setup intent
- `confirmPlatformPayPayment` — to confirm a payment intent
- `createPlatformPayPaymentMethod` — to create a payment method
- `createPlatformPayToken` — if migrating from Tipsi Stripe and using the legacy Tokens API

### `updateApplePaySummaryItems`

Replaced by `updatePlatformPaySheet`, which accepts an object with the `applePay` key containing `summaryItems`, `shippingMethods`, and `errors`.

### `useGooglePay` / `useApplePay`

Replaced by the `usePlatformPay` hook. Callbacks previously passed to `useApplePay` are now set via props on `<PlatformPayButton />`.

### `<GooglePayButton />` / `<ApplePayButton />`

Replaced by `<PlatformPayButton />`.

## Migrating from versions < 0.8.0

v0.8.0 changed parameters for `createPaymentMethod`, `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`.

### 1. Renamed `type` to `paymentMethodType`

Affects the first argument to `createPaymentMethod`, and the second argument to `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`.

### 2. Moved payment method data under `paymentMethodData`

All payment-method-specific fields now go under a nested `paymentMethodData` key:

```diff
- {
-   type: 'Card',
-   token: myToken,
-   billingDetails: myBillingDetails,
- }
+ {
+   paymentMethodType: 'Card',
+   paymentMethodData: {
+     token: myToken,
+     billingDetails: myBillingDetails,
+   },
+ }
```

This pattern applies to all payment method types (Ideal, SepaDebit, Bancontact, Klarna, etc.).

### 3. Moved `setupFutureUsage` to the `options` argument

`setupFutureUsage` is now passed as the third argument to `confirmPayment` and `confirmSetupIntent`, instead of the second.

### 4. Renamed `type` to `paymentMethodType` on result types

Affects `PaymentMethod.Result`, `PaymentIntent.Result`, and `SetupIntent.Result`.
