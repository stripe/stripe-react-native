# CHANGELOG

## 0.50.3 - 2025-08-07

**Fixed**
- Fixed Android crash when using `RowSelectionBehavior.ImmediateAction` with `FormSheetAction.Confirm` in EmbeddedPaymentElement.

## 0.50.2 - 2025-08-06

**Changes**
- Renamed `RowStyle.FlatWithChevron` to `RowStyle.FlatWithDisclosure` and updated related interfaces (`ChevronConfig` → `DisclosureConfig`).
- Updated `stripe-ios` to 24.19.0
- Updated `stripe-android` to 21.22.+
- Added `successBackgroundColor` and `successTextColor` properties to `PrimaryButtonColorConfig` for customizing the primary button appearance in success states.

**Fixes**
- Fixed missing `onCustomPaymentMethodConfirmHandlerCallback` in old architecture codegen patch. This resolves pod install failures when using React Native 0.74+ with old architecture and custom payment methods.
- Fixes an issue where saved payment methods weren't auto selected when using `EmbeddedPaymentElement` on Android.

## 0.50.1 - 2025-07-22

**Fixes**
- Fixed embedded payment element color support to accept both single color strings and light/dark color objects for `ThemedColor` properties (separatorColor, selectedColor, unselectedColor, checkmark color, chevron color).
- Fixed Android crash when providing partial `billingDetailsCollectionConfiguration` objects. Now gracefully handles missing fields like `attachDefaultsToPaymentMethod` by using safe accessor methods with default values.
- Fixed Android Kotlin compilation errors where nullable `ReadableMap?` was passed to functions expecting non-nullable `ReadableMap`. Added null checks in `EmbeddedPaymentElementViewManager` and `AddToWalletButtonManager`. [#1988](https://github.com/stripe/stripe-react-native/issues/1988)

## 0.50.0 - 2025-07-17

**Features**
- Added support for Custom Payment Methods in PaymentSheet and Embedded Payment Element.

**Fixes**
- Removed Sofort from playground pages. Sofort is no longer support by Stripe.
- **Patches**
- Fixed codegen error when using React Native 0.74+ with old architecture by converting EventEmitter properties to callback functions in TurboModule interface. [#1977](https://github.com/stripe/stripe-react-native/issues/1977). See `patches/README.md` for more info.

## 0.49.0 - 2025-07-02

**Features**
- Added rowSelectionBehavior to `EmbeddedPaymentElementConfiguration` with `immediateAction` option
- Added `flatWithChevron` to `AppearanceParams.embeddedPaymentElement.rowConfig.style`
- Added `PaymentMethodOptions` to `PaymentMode` to enable setting payment method level setup future usage value
- Added `None` to `FutureUsage`

## 0.48.0 - 2025-06-11

**Feature**
- Added `height` to `PrimaryButtonConfig.shapes`.
- Added `formInsetValues` to `AppearanceParams`.

## 0.47.1 - 2025-05-29

**Fixes**
- Fixed EmbeddedPaymentElement unable to present view controllers after navigating back and forth between screens.
- Fixed EmbeddedPaymentElement not sizing correctly on Android when the user has saved payment methods.

## 0.47.0 - 2025-05-21

**Features**
- Added `customerEphemeralKeySecret` and `customerSessionClientSecret` to EmbeddedPaymentElement 

## 0.46.0 - 2025-05-08

**Features**
- Added support for the Embedded Payment Element. Learn more by visiting the [docs](https://docs.stripe.com/payments/mobile/embedded).

## 0.45.0 - 2025-04-29

** Features **
- Support for the New Architecture in React Native v0.68 or later.
- Ability to update saved cards when using CustomerSessions (private preview)

**Fixes**
- Updated `stripe-ios` to 24.12.\*
- Updated `stripe-android` to 21.12.\*

## 0.44.0 - 2025-04-15

**Features**

- Added `LinkParams` to allow control over Link in PaymentSheet.

**Fixes**

- Updated `stripe-ios` to 24.11.\*
- Updated `stripe-android` to 21.10.\*
- Fixed an issue where launching a Financial Connections flow would fail on Android.

## 0.43.0 - 2025-03-11

**Features**

- Financial Connections now supports dark mode, and will automatically adapt to the device's theme. [Learn more](https://docs.stripe.com/financial-connections/other-data-powered-products?platform=react-native#connections-customize-react-native) about configuring appearance settings.
- Added card brand filtering to PaymentSheet and CustomerSheet to specify allowed or blocked card brands. [1857](https://github.com/stripe/stripe-react-native/pull/1857)

**Fixes**

- Updated `stripe-ios` to 24.7.\*
- Updated `stripe-android` to 21.6.\*
- Supports React Native 0.78
- Compatible with new architecture when bridgeless mode is disabled

## 0.42.0 - 2025-02-25

**Features**

- Added ability to pass an `onEvent` listener to Financial Connections methods via a `params` argument. This includes the following methods, both when used directly or via `useStripe` or `useFinancialConnectionsSheet`:
  - `collectBankAccountForPayment`
  - `collectBankAccountForSetup`
  - `collectBankAccountToken`
  - `collectFinancialConnectionsAccounts`
- Added ability to pass `metadata` to `PaymentMethod.ConfirmParams` and `PaymentMethod.CreateParams`

## 0.41.0 - 2024-12-19

**Fixes**

- Updated `stripe-ios` to 24.2.\*

## 0.40.0 - 2024-11-19

**Breaking changes**

- Removed support for FPX payments via the bank picker UI. If you'd like to accept FPX payments, we recommend using [Mobile Payment Element](https://docs.stripe.com/payments/accept-a-payment?platform=react-native). Also see the [FPX Payment guide](https://docs.stripe.com/payments/fpx/accept-a-payment?web-or-mobile=mobile) for more info on how to integrate FPX specifically.

**Features**

- `CustomerSheet` is now generally available!
  - If you were using `CustomerSheetBeta`, change that to `CustomerSheet`.
  - If you were using `CustomerSheetBeta.CustomerSheet`, change that to `CustomerSheet.Component`
- Enabled vertical mode

## 0.39.0 - 2024-10-15

**Features**

- Adds support for CustomerSession in private beta [1744](https://github.com/stripe/stripe-react-native/pull/1744)
- Added `onBehalfOf` prop to CardField

**Fixes**

- Updated `stripe-ios` to 23.30.\*
- Updated `stripe-android` to 20.52.\*

## 0.38.6 - 2024-09-04

**Fixes**

- Fixed build errors on Android when using React Native 0.75.x

## 0.38.4 - 2024-08-02

**Fixes**

- Fixed an issue on Android where `allowsRemovalOfLastSavedPaymentMethod` would default to `false` if not provided.

## 0.38.3 - 2024-07-22

**Fixes**

- Fixed an issue on Android where `CustomerSheet` could get stuck in an error state after forwarding an error to the `intentCreationCallback`.

## 0.38.2 - 2024-07-19

**Fixes**

- Updated `stripe-ios` to 23.28.\*
- Updated `stripe-android` to 20.48.\*

## 0.38.1 - 2024-06-28

**Fixes**

- Fixed `preferredNetworks` prop on CardForm on iOS not always being applied
- Updated `stripe-android` to 20.47.3

## 0.38.0 - 2024-05-24

**Features**

- Adds support for `paymentMethodOrder` in PaymentSheet, which provides client side sorting of payment methods.
- Updated `stripe-android` to 20.44.\*

## 0.37.3 - 2024-04-19

**Fixes**

- Fixed an issue with generating App Privacy reports.
- Updated `stripe-ios` to 23.27.\*
- Updated `stripe-android` to 20.41.\*

## 0.37.2 - 2024-04-02

**Fixes**

- Updated `stripe-ios` to 23.26.\*
- Updated `stripe-android` to 20.40.\*

## 0.37.1 - 2024-03-15

**Fixes**

- Updated `stripe-ios` to 23.25.\*
- Updated `stripe-android` to 20.39.\*

## 0.37.0 - 2024-02-16

**Breaking changes**

- Your `compileSdkVersion` (in `android/build.gradle`) now must be at least 34. Changing your `compileSdkVersion` does not change runtime behavior.

**Fixes**

- Fixed an issue on Android where the SDK was unable to follow URL redirects in some cases.
- Fixed an issue on Android where Google Pay & Link were not saved as default payment methods in PaymentSheet.

## 0.36.0 - 2024-02-02

**Features**

- Use `preferredNetworks` on `CardField`, `CardForm`, `CustomerSheet`, and `PaymentSheet` to set the list of preferred networks that should be used to process payments made with a co-branded card.
- Set the Google Pay button type that is used in PaymentSheet with the `googlePay.buttonType` parameter.

**Fixes**

- Fixed an issue on Android where `CardField`'s `placeholderColor` wasn't being applied to the card brand icon.

## 0.35.1 - 2024-01-16 (📌 Expo SDK 50)

**Fixes**

- Fixed a build error on Android when using React Native 0.73.0 and higher [#1579](https://github.com/stripe/stripe-react-native/pull/1579)
- Fixed the test mock for `useStripe` [#1559](https://github.com/stripe/stripe-react-native/pull/1559)
- Fixed a build error on Android that would only occur when using the `nx` build tool [#1586](https://github.com/stripe/stripe-react-native/pull/1586)

## 0.35.0 - 2023-11-02

**Features**

- Added support for RevolutPay bindings

## 0.34.0 - 2023-10-25

**Features**

- Added new `presentationStyle` options for CustomerSheet and AddressSheet. [#1515](https://github.com/stripe/stripe-react-native/pull/1515)
- Support `PlatformPayButton`'s `appearance` and `borderRadius` props on Android. [#1534](https://github.com/stripe/stripe-react-native/pull/1534)
- PaymentSheet now supports Swish for PaymentIntents in private beta [#1542](https://github.com/stripe/stripe-react-native/pull/1542)
- PaymentSheet now supports saved payment method support for SEPA family payment methods [#1542](https://github.com/stripe/stripe-react-native/pull/1542)

**Fixes**

- Fixed an issue on Android where apps could crash when launching Google Pay
- Fixed an issue on Android where `street` in `shippingContact` for PlatformPay methods would include `null` in the string
- Fixed an issue on Android where `phoneNumber` in `ShippingContact` for PlatformPay methods would be `null`
- Removed XML asset files, library size reduced. [#1534](https://github.com/stripe/stripe-react-native/pull/1534)

## 0.33.0 - 2023-09-22

**Features**

- Added the `amount` and `label` params to `initPaymentSheet`'s `googlePay` field configuration. Use this to diplay the amount for setup intents.
- Added the `amount` and `label` params `createPlatformPayPaymentMethod`, `confirmPlatformPayPayment`, and `confirmPlatformPaySetupIntent`.
- PaymentSheet now supports the following payment methods on both iOS and Android (previously some of the following were iOS only) for SetupIntents and PaymentIntents with setup for future usage:
  - Alipay
  - BECS Direct Debit
  - Cash App Pay
  - iDEAL
  - SEPA
  - Sofort
  - Bancontact
  - BLIK
  - Boleto
  - Revolut Pay
  - OXXO (PaymentIntents only)
  - Konbini (PaymentIntents only)
- PaymentSheet now supports the following payment methods on iOS only for SetupIntents and PaymentIntents with setup for future usage:
  - PayNow
  - PromptPay

**Fixes**

- Fixed an issue on iOS where the value for the `paymentMethod` field on the returned `paymentIntent` object from `confirmPlatformPayPayment` and the returned `setupIntent` object from `confirmPlatformPaySetupIntent` would be null.

## 0.32.0 - 2023-09-15

**Features**

- `createPlatformPayPaymentMethod` and `createPlatformPayToken` now also include an optional `shippingContact` field in their results. [#1500](https://github.com/stripe/stripe-react-native/pull/1500)
- Added the `removeSavedPaymentMethodMessage` field to `initPaymentSheet` to display a custom message when a saved payment method is removed. iOS Only. [#1498](https://github.com/stripe/stripe-react-native/pull/1498)

**Fixes**

- Fixed an issue on iOS where recollecting the CVC wouldn't work correctly. [#1501](https://github.com/stripe/stripe-react-native/pull/1501)

## 0.31.1 - 2023-09-08

**Features**

- **[BETA]** Added [CustomerSheet](https://stripe.com/docs/elements/customer-sheet?platform=react-native) API, a prebuilt UI component that lets your customers manage their saved payment methods. [#1491](https://github.com/stripe/stripe-react-native/pull/1491)
- [PaymentSheet] Added support for AmazonPay (private beta), BLIK (iOS only), GrabPay, and FPX with PaymentIntents. [#1491](https://github.com/stripe/stripe-react-native/pull/1491)

**Fixes**

- Fixed font scaling on Android PaymentSheet not respecting floating-point number values. [#1469](https://github.com/stripe/stripe-react-native/pull/1469)

## 0.30.0 - 2023-08-04

**Features**

- Added the `handleNextActionForSetup` method. This can be used exactly like `handleNextAction`, except with [SetupIntents](https://stripe.com/docs/api/setup_intents). [#1440](https://github.com/stripe/stripe-react-native/pull/1440)
- `canAddCardToWallet` now returns the `fpanLastFour` and `dpanLastFour` in the `GooglePayCardToken` type. The `cardLastFour` field (which is now superseded by `fpanLastFour`) is deprecated.

**Fixes**

- Fixed an error on Android where `AddressSheet` would throw an error if submitted with the keyboard open. [#1462](https://github.com/stripe/stripe-react-native/pull/1462)
- Fixed an issue where `state` was not included in the returned PaymentIntent's `shippingDetails` on iOS. [#1465](https://github.com/stripe/stripe-react-native/pull/1465)
- Fixed an error where `usePaymentSheet` could cause infinite reloads. [#1439](https://github.com/stripe/stripe-react-native/pull/1439)'

## 0.29.0 - 2023-07-13

**Breaking changes**

- The Apple Pay and Google Pay APIs, which are deprecated and were replaced with the [Platform Pay API](https://github.com/stripe/stripe-react-native/blob/master/docs/Platform-Pay-Migration.md) last year, have been removed. [#1424](https://github.com/stripe/stripe-react-native/pull/1424)

**Features**

- You can now collect payment details before creating a `PaymentIntent` or `SetupIntent`. See [our docs](https://stripe.com/docs/payments/accept-a-payment-deferred?platform=react-native) for more info. This integration also allows you to [confirm the Intent on the server](https://stripe.com/docs/payments/finalize-payments-on-the-server?platform=react-native). [#1424](https://github.com/stripe/stripe-react-native/pull/1424)

**Fixes**

- Fixes `handleURLCallback` to only take action on iOS, no-op on Android. [#1423](https://github.com/stripe/stripe-react-native/pull/1423)

## 0.28.0 - 2023-06-16 (📌 Expo SDK 49)

**Features**

- Added a `disabled` prop to `CardField` and `CardForm` which applies a disabled state such that user input is not accepted. [#1403](https://github.com/stripe/stripe-react-native/pull/1403)

**Fixes**

- Fixed an instance on Android where `collectBankAccountToken` or `collectFinancialConnectionsAccounts` could result in a fatal error. [#1401](https://github.com/stripe/stripe-react-native/pull/1401)
- Resolve with better error objects on iOS in `confirmPaymentSheetPayment`, `createTokenForCVCUpdate`, `createPaymentMethod`, `retrievePaymentIntent`, and `retrieveSetupIntent` [#1399](https://github.com/stripe/stripe-react-native/pull/1399)

## 0.27.2 - 2023-05-15

**Fixes**

- Updated `stripe-android` from 20.24.0 to 20.25.+ [#1384](https://github.com/stripe/stripe-react-native/pull/1384)
- Updated `stripe-ios` from 23.7.+ to 23.8.+ [#1384](https://github.com/stripe/stripe-react-native/pull/1384)

## 0.27.1 - 2023-05-03

> Note: [Xcode 13 is no longer supported by Apple](https://developer.apple.com/news/upcoming-requirements/). Please upgrade to Xcode 14.1 or later.

**Fixes**

- Fixed the type of `created` on `Token.Result` on Android (was a number, should be a string). [#1369](https://github.com/stripe/stripe-react-native/pull/1369)
- Fixed `AddToWalletButton` not properly resolving the `androidAssetSource` in release mode. [#1373](https://github.com/stripe/stripe-react-native/pull/1373)
- Fixed `isPlatformPaySupported` not respecting `existingPaymentMethodRequired` or `testEnv` on Android. [#1374](https://github.com/stripe/stripe-react-native/pull/1374)

## 0.27.0 - 2023-04-21

**Features**

- Added `billingDetailsCollectionConfiguration` to `initPaymentSheet` parameters. Use this to configure the collection of email, phone, name, or address in the Payment Sheet. [See the docs here](https://stripe.com/docs/payments/accept-a-payment?platform=react-native&ui=payment-sheet#collect-billing-details) [#1361](https://github.com/stripe/stripe-react-native/pull/1361)

**Fixes**

- Updated Google Pay button asset to match Google's most recent branding guidelines. [#1343](https://github.com/stripe/stripe-react-native/pull/1343)
- Fixed type for `ApplePay.ShippingContact.phoneNumber`. [#1349](https://github.com/stripe/stripe-react-native/pull/1349)
- Fixed `CardResult` type to include `threeDSecureUsage`. [#1347](https://github.com/stripe/stripe-react-native/pull/1347)

## 0.26.0 - 2023-03-16

**Features**

- Added support for PayPal and CashApp to PaymentSheet, `confirmPayment`, and `confirmSetupIntent`. [#1331](https://github.com/stripe/stripe-react-native/pull/1331)

**Fixes**

- Compatible with v0.1.4 of `@stripe/stripe-identity-react-native`. [8fa8a7a](https://github.com/stripe/stripe-react-native/commit/8fa8a7a0595a31d7422af6bbe26d696ba5e211f7)

## 0.25.0 - 2023-02-27

**Features**

- Added the `supportsTapToPay` option to `canAddCardToWallet`. [#1308](https://github.com/stripe/stripe-react-native/pull/1308)

**Fixes**

- Fixed an issue on iOS where `canAddCardToWallet` would always return a `details.status` of `UNSUPPORTED_DEVICE` on iPads. [#1305](https://github.com/stripe/stripe-react-native/pull/1305)
- Fixed an issue on iOS where `canAddCardToWallet` would always return a `{canAddCard: false}` if the card in question had been provsioned on the current device, but **had not yet been provisioned** on a paired Watch. [#1305](https://github.com/stripe/stripe-react-native/pull/1305)
- Fixed an issue on iOS where the **deprecated** `onDidSetShippingMethod` & `onDidSetShippingContact` events wouldn't be triggered if you were using the `useApplePay` hook _without_ using the `ApplePayButton` component. [#1298](https://github.com/stripe/stripe-react-native/pull/1298)
- Fixed an issue on Android where `canAddCardToWallet` could result in a null pointer exception on devices without NFC compatibility. [#1308](https://github.com/stripe/stripe-react-native/pull/1308)

## 0.24.0 - 2023-02-17

**Breaking changes**

- [#1248](https://github.com/stripe/stripe-react-native/pull/1248) Renamed the `paymentSummaryItems` field in `initPaymentSheet()`'s `applePay` params to `cartItems`. So your change will look like this:

```diff
 initPaymentSheet({
   ...
   applePay: {
-    paymentSummaryItems: [
+    cartItems: [
   }
  ...
 })
```

**Features**

- Added the `setOrderTracking` property to the `PlatformPayButton` component and the `initPaymentSheet` method. Use this callback for setting the order details to give users the ability to track and manage their purchases in Wallet. To learn more about order tracking, see [Apple’s Wallet Orders documentation](https://developer.apple.com/documentation/walletorders). [#1248](https://github.com/stripe/stripe-react-native/pull/1248)
- Added the `buttonType` field to `initPaymentSheet()`'s `applePay` params. Use this to set the text displayed by the call to action button in the Apple Pay sheet.[#1248](https://github.com/stripe/stripe-react-native/pull/1248)
- Added the `request` field to `initPaymentSheet()`'s, `confirmPlatformPayPayment()`'s, and `confirmPlatformPaySetupIntent`'s `applePay` params. Use this to support different types of payment requests, like `RecurringPaymentRequest`, `AutomaticReloadPaymentRequest`, and `MultiMerchantRequest`.[#1248](https://github.com/stripe/stripe-react-native/pull/1248)
- Added an `options` argument to `presentPaymentSheet` which includes a `timeout` property. [#1287](https://github.com/stripe/stripe-react-native/pull/1287)

## 0.23.3 - 2023-02-07 (📌 Expo SDK 48)

**Fixes**

- Fixes a build failure on Android when using `stripe-android` v20.19.2. [#1289](https://github.com/stripe/stripe-react-native/pull/1289)

## 0.23.2 - 2023-02-06

**Fixes**

- Fixed a bug on Android where `canAddCardToWallet` wouldn't correctly return the `details.token` object. [#1282](https://github.com/stripe/stripe-react-native/pull/1282)

## 0.23.1 - 2023-01-25

> **Note**: This version pulls in a new version of `stripe-android` that now requires v1.8.0 of the Kotlin Gradle plugin. [Refer to this issue for a limited workaround](https://github.com/stripe/stripe-react-native/issues/1294#issuecomment-1426150258).

**Fixes**

- Fixed an issue with `confirmPlatformPaySetupIntent` on iOS. [#1266](https://github.com/stripe/stripe-react-native/pull/1266)
- Fixed types so that Klarna accepts the `shippingDetails` property. [#1272](https://github.com/stripe/stripe-react-native/pull/1272)
- Both [`PaymentIntent.Result`](https://stripe.dev/stripe-react-native/api-reference/interfaces/PaymentIntent.Result.html) and [`SetupIntent.Result`](https://stripe.dev/stripe-react-native/api-reference/interfaces/SetupIntent.Result.html) types now include a `paymentMethod` field. This replaces the `paymentMethodId` field, which will be removed in a later release. [#1272](https://github.com/stripe/stripe-react-native/pull/1272)

## 0.23.0 - 2023-01-09

**Breaking changes**

- `createPlatformPayPaymentMethod` no longer returns a `token` object. [#1236](https://github.com/stripe/stripe-react-native/issues/1236)
  - If your integration depends on Stripe's Tokens API, please use `createPlatformPayToken`, which accepts identical arguments.

**Fixes**

- Fixed an issue with `createPlatformPayPaymentMethod` on iOS where a "Canceled" error could be returned in production. [#1236](https://github.com/stripe/stripe-react-native/issues/1236)
- Fixed an issue where the `PlatformPayButton` with `type={PlatformPay.ButtonType.GooglePayMark}` would be unclickable. [#1236](https://github.com/stripe/stripe-react-native/issues/1236)
- Fixed an issue on Android where `CardField` would render without the necessary padding. [48debb2](https://github.com/stripe/stripe-react-native/commit/48debb27de4b02d8309b4e42737be066cdf33835)
- Fixed an issue on iOS where providing a `null` value to certain method parameters would result in a crash. [#1252](https://github.com/stripe/stripe-react-native/pull/1252)

## 0.22.1 - 2022-12-07

**Fixes**

- Fixed the `ShippingMethod` type to contain the `isPending` field instead of a `type` field (which previously was never correct). This reflects the inputs accepted. [#1227](https://github.com/stripe/stripe-react-native/pull/1227)
- Fixed the `ShippingMethod` type to contain the `startDate` and `endDate` keys, if applicable. [#1227](https://github.com/stripe/stripe-react-native/pull/1227)
- Fixed instances of the "duplicate registered views" error. [#1233](https://github.com/stripe/stripe-react-native/pull/1233)
- Fixed extra margin that was being added to `<CardForm />` on Android. [#1234](https://github.com/stripe/stripe-react-native/pull/1234)

## 0.22.0 - 2022-12-02

**Breaking changes**

**Features**

- Added the `hasPairedAppleWatch` option to `canAddCardToWallet`. [#1219](https://github.com/stripe/stripe-react-native/pull/1219)
- Added new functions and a new component to streamline integrating with Apple and Google Pay and add more feature support. See the [Migrating to Platform Pay guide](https://github.com/stripe/stripe-react-native/blob/master/docs/Platform-Pay-Migration.md) for more details. The old Apple and Google Pay APIs are marked as `deprecated` and will be removed in a future release, but are still supported in this version.

**Fixes**

- Fixed an issue where builds would error with the message `'const' enums are not supported.` [see commit](https://github.com/stripe/stripe-react-native/commit/f882bfa588aa6d23a980b4b43d2cca660ca1dd2a)
- Fixed an issue where the `canAddCardToWallet` method would sometimes wrongly return `false` with a `details.status` of `MISSING_CONFIGURATION` in production builds. [#1215](https://github.com/stripe/stripe-react-native/pull/1215)
- Fixed an issue on Android where, for certain countries, the postal code would not be enabled but would still be required. [#1213](https://github.com/stripe/stripe-react-native/pull/1213)
- Fixed an issue on iOS where `canAddCardToWallet` would return `false` if the card had already been provisioned on a paired device like an Apple Watch, but had not yet been provisioned on the current device, and would also return `false` if the card had been provisioned on the current device, but not on a paired Apple Watch. [#1219](https://github.com/stripe/stripe-react-native/pull/1219)

## 0.21.0 - 2022-11-15

**Breaking changes**

**Features**

- Added the `<AddressSheet />` component, which enables you to collect local and international shipping or billing addresses from your customers _with_ address autocomplete. [#1169](https://github.com/stripe/stripe-react-native/pull/1169)
  - [Find the docs here](https://stripe.com/docs/elements/address-element?platform=react-native)
- Added the `defaultShippingDetails` field to the `params` argument in `initPaymentSheet(params)`. This will allow you to collect shipping details (either in your own UI or using the new `<AddressSheet />` component) for payments in the Payment Sheet. [#1169](https://github.com/stripe/stripe-react-native/pull/1169)

**Fixes**

- Fixed a build error on Android when using Kotlin version 1.7.10. [#1195](https://github.com/stripe/stripe-react-native/pull/1195)

## 0.20.0 - 2022-11-03

**Breaking changes**

- This library now supports iOS 13 and up, due to `stripe-ios` increasing the deployment target. If you would like to build for iOS 12, please continue to use `@stripe/stripe-react-native@0.19.0`. [#1190](https://github.com/stripe/stripe-react-native/pull/1190)

**Features**

- Added [Link](https://stripe.com/docs/payments/link) support in Payment Sheet. [#1176](https://github.com/stripe/stripe-react-native/pull/1176)
- Added the `resetPaymentSheetCustomer` method to clear persisted authentication state in the PaymentSheet. [#1176](https://github.com/stripe/stripe-react-native/pull/1176)
- Added `preferredNetwork` and `availableNetworks` fields to the `CardResult` payment method. [#1176](https://github.com/stripe/stripe-react-native/pull/1176)
- Added support for custom fonts to `CardForm` and `CardView` on Android. [#1150](https://github.com/stripe/stripe-react-native/pull/1150)
- Added support for customizing the call to action button label in Payment Sheet by providing the `primaryButtonLabel` property to `initPaymentSheet()`. [#1190](https://github.com/stripe/stripe-react-native/pull/1190)

**Fixes**

- Fixed an issue on iOS where `confirmSetupIntent` would throw an error if the `Card` payment method was provided with the `paymentMethodId` parameter. [#1151](https://github.com/stripe/stripe-react-native/pull/1151)
- Upgraded `stripe-android` to 20.15.+. [#1176](https://github.com/stripe/stripe-react-native/pull/1176)
- Upgraded `stripe-ios` to 23.1.+. [#1190](https://github.com/stripe/stripe-react-native/pull/1190)
- Fixed `FinancialConnections.Subcategory` and `FinancialConnections.Permission` types to be camel-case instead of snake case. [#1176](https://github.com/stripe/stripe-react-native/pull/1176)
- Fixed an issue with Financial Connections on iOS where the app wouldn't properly redirect back after authentication. [#1178](https://github.com/stripe/stripe-react-native/pull/1178)
- Fixed `borderWidth` and `borderRadius` for `<CardField />` and `CardForm />` was inconsistent across iOS and Android. [#1182](https://github.com/stripe/stripe-react-native/pull/1182)

## 0.19.0 - 2022-09-16 (📌 Expo SDK 47)

**Breaking changes**

- To comply with Google's [new branding guidelines for the Google Pay button](https://developers.google.com/pay/api/android/guides/brand-guidelines), the `<GooglePayButton />` component's `type` prop now only accepts `standard` or `pay` (`pay_shadow`, `pay_dark`, `standard_shadow`, and `standard_dark` were all removed). It defaults to `standard`. [#1135](https://github.com/stripe/stripe-react-native/pull/1135)
- Your `compileSdkVersion` (in `android/build.gradle`) now must be at least 33. Changing your `compileSdkVersion` does not change runtime behavior.

**Features**

- Add `returnURL` as an optional parameter to `handleNextAction`. Use this so the Stripe SDK can redirect back to your app after authentication. [#1104](https://github.com/stripe/stripe-react-native/pull/1104)

**Fixes**

- Fixed an issue where the error resolved on iOS wasn't the root error. [#1105](https://github.com/stripe/stripe-react-native/pull/1105)
- Fix Expo Config Plugin support on SDK 46. [#1111](https://github.com/stripe/stripe-react-native/pull/1111)
- Updated `stripe-ios` from 22.7.+ to 22.8.+. Updated `stripe-android` from 20.9.+ to 20.12.+. This updates the Google Pay button to match the new brand guidelines. [#1135](https://github.com/stripe/stripe-react-native/pull/1135)

## 0.18.1 - 2022-08-19

**Breaking changes**

**Features**

**Fixes**

- Fixed an issue where some promises on Android would never resolve when using React Native 0.65.x or under. [#1089](https://github.com/stripe/stripe-react-native/pull/1089).

## 0.18.0 - 2022-08-17

**Breaking changes**

- Your `compileSdkVersion` (in `android/build.gradle`) now must be at least `32`. Changing your `compileSdkVersion` does not change runtime behavior.

**Features**

- `confirmPayment` can now be called with _just_ a client secret (e.g. `await confirmPayment("payment-intent-id")`), in other words the payment method can be excluded. If the payment method is excluded, it is assumed by the SDK that you have attached the payment method on the server-side during payment intent creation. [#1084](https://github.com/stripe/stripe-react-native/pull/1084)
- Payment Sheet now supports Link on iOS. [#1086](https://github.com/stripe/stripe-react-native/pull/1086).

**Fixes**

- Fixed a bug on Android where `collectBankAccountForPayment`, `collectBankAccountForSetup`, `collectBankAccountToken`, and `collectFinancialConnectionsAccounts` wouldn't work with Stripe Connect accounts. [#1086](https://github.com/stripe/stripe-react-native/pull/1086).
- Upgraded `stripe-ios` to 22.7.+ and `stripe-android` to 20.9.+.

## 0.17.0 - 2022-08-11

**Breaking changes**

**Features**

- Added the [`collectBankAccountToken`](https://stripe.com/docs/financial-connections/connect-payouts?platform=react-native) & [`collectFinancialConnectionsAccounts`](https://stripe.com/docs/financial-connections/other-data-powered-products?platform=react-native) functions.

**Fixes**

- Fixed an issue where `collectBankAccountForPayment` and `collectBankAccountForSetup` would fail on Android when using React Native 0.65.x or under. [#1059](https://github.com/stripe/stripe-react-native/pull/1059)
- Fixed an issue where Android apps could crash with the error `IllegalStateException: Cannot remove Fragment attached to a different FragmentManager`. [#1054](https://github.com/stripe/stripe-react-native/pull/1054)
- Bumped Gradle from 4.2.2 to 7.1.1. [#1058](https://github.com/stripe/stripe-react-native/pull/1058)

## 0.16.0 - 2022-07-22

**Breaking changes**

- The `<GooglePayButton />` component no longer overrides the `type` to use the dark mode version when the device is in Dark Mode. If you set the `type` value, it will always be respected. If you don't set the `type` value, it will match the system's theme (`standard_shadow` when in Light Mode, and `standard_dark` when in Dark Mode). [#1051](https://github.com/stripe/stripe-react-native/pull/1051)

**Features**

- Added support for `pay_dark` and `standard_dark` to the `<GooglePayButton />` component's `type` prop. This allows you to display the [dark Google Pay button](https://developers.google.com/pay/api/android/guides/brand-guidelines). [#1051](https://github.com/stripe/stripe-react-native/pull/1051)
- Added support for `borderColor`, `borderRadius`, and `cursorColor` to `CardForm`'s `cardStyle` prop on iOS (already exists on Android). [#1048](https://github.com/stripe/stripe-react-native/pull/1048)

**Fixes**

- Reduced the size of the `@stripe/stripe-react-native` by preventing unnecessary files from being published. [#1043](https://github.com/stripe/stripe-react-native/pull/1043)

## 0.15.0 - 2022-07-14

**Breaking changes**

- [#1020](https://github.com/stripe/stripe-react-native/pull/1020) Changed some of fields for the `params` object that is supplied to `initPaymentSheet(params)`:
  - **Changed the `applePay` field**. Previously this field accepted a boolean, now it accepts an object of type `ApplePayParams`, which includes the `merchantCountryCode` field, and a new `paymentSummaryItems` field (see "Features" below).
  - **Changed the `googlePay` field**. Previously this field accepted a boolean, now it accepts an object of type `GooglePayParams`, which includes the `merchantCountryCode`, `currencyCode`, and `testEnv` fields.
  - Since the `merchantCountryCode` field now lives under the `applePay` and `googlePay` objects, it has been removed from the base `params` object.
  - Similarly, since the `currencyCode` and `testEnv` fields now live under the `googlePay` object, they have been removed from the base `params` object .
- [#1020](https://github.com/stripe/stripe-react-native/pull/1020) In `ApplePay.CartSummaryItem`:
  - Renamed `type` to `isPending`- (if you had `type: 'pending'`, replace it with `isPending: true`. if `type: 'final'`, either remove it or set `isPending: false`).
    - The same change was made to `ApplePay.ShippingMethod`: renamed `type` to `isPending`.
  - Added a **new** `paymentType` field. This field is **required**, and in all pre-existing cases where you created a `CartSummaryItem`, should be set to `paymentType: 'Immediate'` (support for types `Deferred` and `Recurring` wasn't available until this release).

**Features**

- Added support for iOS 15 `paymentSummaryItems`: `PKDeferredPaymentSummaryItem` and `PKRecurringPaymentSummaryItem`.
- You can now specify Apple Pay line items to be displayed when paying with Apple Pay in PaymentSheet by providing `applePay.paymentSummaryItems` to the `initPaymentSheet` method. [#1020](https://github.com/stripe/stripe-react-native/pull/1020)
- Added support for Affirm (previously, Affirm was only available in the Payment Sheet). [1036](https://github.com/stripe/stripe-react-native/pull/1036)

**Fixes**

- Fixed behavior of `CardField` and `CardForm` on Android to match that on iOS; postal code input no longer accepts characters that are never present in postal codes (anything besides 0-9, a-z, A-Z, hyphens, and whitespace). [#1027](https://github.com/stripe/stripe-react-native/pull/1027).
- Fixed an issue on older version of React Native where calling `collectBankAccountForSetup` or `collectBankAccountForPayment` and getting a `Canceled` result could cause a crash. [#1037](https://github.com/stripe/stripe-react-native/pull/1037)
- Fixed an issue where some Android builds would fail on the `lintVitalRelease` step. [#1038](https://github.com/stripe/stripe-react-native/pull/1038)

## 0.14.0 - 2022-06-30

**Breaking changes**

**Features**

- Added the `canAddCardToWallet` method. [#986](https://github.com/stripe/stripe-react-native/pull/986).

**Fixes**

- Fix build errors on Xcode 14 beta 1 by upgrading `stripe-ios` to `~>22.5.1`. [#1011](https://github.com/stripe/stripe-react-native/pull/1011)
- Fixed an issue on Android where the `brand` field in `CardField`'s `onCardChange` callback wouldn't be set unless the card details were fully complete. [#1012](https://github.com/stripe/stripe-react-native/pull/1012)
- Fixed an issue where Payment Sheet would cause crashes on Android if `merchantDisplayName` wasn't provided. [#1015](https://github.com/stripe/stripe-react-native/pull/1015)
- Fixed a bug on Android where a crash could occur if the PaymentSheet was canceled and opened again. [#1014](https://github.com/stripe/stripe-react-native/pull/1014)
- Fixed an instance on iOS where `CardField`'s expiry date would remain marked as valid, even when it's invalid. [#1018](https://github.com/stripe/stripe-react-native/issues/1018)

## 0.13.1 - 2022-06-16 (📌 Expo SDK 46)

**Breaking changes**

**Features**

**Fixes**

- Never show postal code input in `CardField` if `postalCodeEnabled=false` (regardless of `countryCode`). [#996](https://github.com/stripe/stripe-react-native/pull/996)

## 0.13.0 - 2022-06-15

**Breaking changes**

**Features**

- Added a `defaultValues` prop to the `CardForm` component. Currently only accepts `countryCode`, and is Android-only. [#974](https://github.com/stripe/stripe-react-native/pull/974)
- Added the `countryCode` prop to the `CardField` component. [#989](https://github.com/stripe/stripe-react-native/pull/989)
- Added option to create a PII token (represents the details of personally identifiable information) to the `createToken` method. [#976](https://github.com/stripe/stripe-react-native/pull/976)

**Fixes**

- Resolve with an Error (of type `Canceled`) if no payment option is selected in the Payment Sheet custom flow (i.e., the `x` button is clicked to close the Payment Sheet). [#975](https://github.com/stripe/stripe-react-native/pull/975)
- Fixed an issue on Android where the `complete` field in the `onCardChange` callback would incorrectly be set to `true` even if the postal code wasn't filled out. [#989](https://github.com/stripe/stripe-react-native/pull/989)
- Make `SetupIntent.lastSetupError` and `PaymentIntent.lastPaymentError` object shape consistent on iOS and Android.[#990](https://github.com/stripe/stripe-react-native/pull/990)

## 0.12.0 - 2022-06-02

**Breaking changes**

- Renamed `appearance.shapes.shadow.borderRadius` to `appearance.shapes.shadow.blurRadius`, and `appearance.primaryButton.shapes.shadow.borderRadius` to `appearance.primaryButton.shapes.shadow.blurRadius`. [#962](https://github.com/stripe/stripe-react-native/pull/962)

**Features**

**Fixes**

- Fixed cases where Android apps would crash with the error: `Unable to instantiate fragment com.reactnativestripesdk.PaymentLauncherFragment`. [#965](https://github.com/stripe/stripe-react-native/pull/965)
- Fixed `appearance.shapes.shadow.offset` and `appearance.primaryButton.shapes.shadow.offset` not applying the y-coordinate in the correct direction. [#962](https://github.com/stripe/stripe-react-native/pull/962)
- Fixed a bug where `handleNextAction` wouldn't resolve on Android when using 3DS2. [#966](https://github.com/stripe/stripe-react-native/pull/966)
- Fixed a bug where the wrong CVC icon was show in the `CardForm` component on Android. [#966](https://github.com/stripe/stripe-react-native/pull/966)
- The card brand tint color is now correctly set in the `CardField` component on Android via the `cardStyle.textColor` prop. [#851](https://github.com/stripe/stripe-react-native/pull/851)

## 0.11.0 - 2022-05-24

**Breaking changes**

- Removed support for `primaryButtonColor` field on `initPaymentSheet()`. Please use the new `appearance.primaryButton.colors.background` field instead. [#940](https://github.com/stripe/stripe-react-native/pull/940)

**Features**

- You can now customize the appearance of your Payment Sheet via the `appearance` field on `initPaymentSheet()`. [#940](https://github.com/stripe/stripe-react-native/pull/940)
- Added Affirm and AU BECS Direct Debit support to Payment Sheet. [#940](https://github.com/stripe/stripe-react-native/pull/940)

**Fixes**

- Improved error messages on Android for failed `confirmPayment` and `confirmSetupIntent` calls, and any Google Pay related methods. [#957](https://github.com/stripe/stripe-react-native/pull/957)
- Made Android card validation state consistent with iOS in the `CardField` `onCardChange` callback. [#958](https://github.com/stripe/stripe-react-native/pull/958)

## 0.10.0 - 2022-05-19

**Breaking changes**

**Features**

- Card scanning is available in payment sheet on Android. [#944](https://github.com/stripe/stripe-react-native/pull/944)
  - To enable this, you will need to add `implementation 'com.stripe:stripecardscan:20.3.+'` to your `dependencies {}` block in `android/app/build.gradle`.
- `us_bank_account` payment method is now available in the payment sheet on Android. [#944](https://github.com/stripe/stripe-react-native/pull/944)

**Fixes**

## 0.9.0 - 2022-05-10

- [#913](https://github.com/stripe/stripe-react-native/pull/913) BREAKING CHANGE: Changed props for the `<AddToWalletButton />` component. Instead of passing `cardHolderName`, `cardLastFour`, `cardDescription`, and `cardBrand` directly as props, you will instead pass a `cardDetails` prop, which is an object containing the following fields:
  - `primaryAccountIdentifier`: The `wallet.primary_account_identifier` value from the issued card.
  - `name`: The card holder name (previously `cardHolderName`).
  - `description`: A user-facing description of the card (previously `cardDescription`).
  - `lastFour`: Last 4 digits of the card, optional (previously `cardLastFour`).
  - `brand`: The card brand, optional (previously `cardBrand`).
- [#925](https://github.com/stripe/stripe-react-native/pull/925) Feat: `us_bank_account` payment method is now available in the payment sheet on iOS. (& Updated `stripe-ios` from 22.2.0 to 22.3.0)
- [#929](https://github.com/stripe/stripe-react-native/pull/929) Feat: added PayPal support (not currently supported for SetupIntents)
- [#928](https://github.com/stripe/stripe-react-native/pull/928) feat: expose 'cvc' when `dangerouslyGetCardDetails` is set to true
- [#931](https://github.com/stripe/stripe-react-native/pull/931) feat: add token & paymentMethodId handling to confirmPayment for Cards
- [#932](https://github.com/stripe/stripe-react-native/pull/932) fix: manually forward activity results to paymentLauncherFragment
- [#933](https://github.com/stripe/stripe-react-native/pull/933) fix: address "Can not perform this action after onSaveInstanceState" crashes on Android
- [#914](https://github.com/stripe/stripe-react-native/pull/914) fix: add `fingerprint` to Card result object on Android (already present on iOS)
- [#912](https://github.com/stripe/stripe-react-native/pull/912) fix: allow for providing zip code straight from `CardField` component on Android

## 0.8.0 - 2022-04-27

- **Breaking: This version requires you use `react-native@0.64.0` or above**
- [#902](https://github.com/stripe/stripe-react-native/pull/902) fix: create custom babel plugin for package.json imports in src/
- [#889](https://github.com/stripe/stripe-react-native/pull/889) Feat: add support for push provisioning (adding cards to native wallets)
- [#890](https://github.com/stripe/stripe-react-native/pull/890) BREAKING CHANGE: Changed parameters for: `createPaymentMethod`, `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`. Please read [this migration guide](./docs/upgrading-from-v0.7.0.md) for details.
  - Renamed `type` field to `paymentMethodType` on `PaymentMethod.Result`, `PaymentIntent.Result`, and `SetupIntent.Result` (result of `createPaymentMethod`, `retrieveSetupIntent`, `confirmSetupIntent`, `confirmPayment`, `collectBankAccountForPayment`, `collectBankAccountForSetup`, `verifyMicrodepositsForPayment`, and `verifyMicrodepositsForSetup`).
- [#849](https://github.com/stripe/stripe-react-native/pull/849) BREAKING CHANGE: Renamed `placeholder` prop on `<CardField />` and `<CardForm />` to `placeholders`.
- [#849](https://github.com/stripe/stripe-react-native/pull/849) Feat: Added customized styling options to `<CardForm />` on Android.

## 0.7.0 - 2022-04-19

- [#894](https://github.com/stripe/stripe-react-native/pull/894) Fix: `<CardField />` `onBlur` callback will now be called appropriately on Android
- [#846](https://github.com/stripe/stripe-react-native/pull/846) Fix: Avoid crashes when `currentActivity` is null
- [#879](https://github.com/stripe/stripe-react-native/pull/879) Feat: Add support for ACHv2 payments on Android (already existed on iOS).
- [#879](https://github.com/stripe/stripe-react-native/pull/879) Chore: Upgraded `stripe-android` from v19.3.+ to v20.1.+
- [#837](https://github.com/stripe/stripe-react-native/pull/837) BREAKING CHANGE: Mostly fixes and changes to types, but some method's now accept slightly different parameters:
  - Removed `setUrlSchemeOnAndroid` in favor of `setReturnUrlSchemeOnAndroid`. `setReturnUrlSchemeOnAndroid` functions exactly the same, this is just a rename.
  - Removed `handleCardAction` in favor of `handleNextAction`. `handleNextAction` functions exactly the same, this is just a rename.
  - `createPaymentMethod`'s `billingDetails` and `shippingDetails` parameters no longer accept the `addressPostalCode`, `addressCity`, `addressCountry`, `addressLine1`, `addressLine2`, or `addressState` keys. Instead, they accept an `address` object containing: `city`, `country`, `line1`, `line2`, `postalCode`, `state`.
  - `confirmPayment`'s `billingDetails` and `shippingDetails` parameters no longer accept the `addressPostalCode`, `addressCity`, `addressCountry`, `addressLine1`, `addressLine2`, or `addressState` keys. Instead, they accept an `address` object containing: `city`, `country`, `line1`, `line2`, `postalCode`, `state`.
  - `BillingDetails` no longer includes `addressPostalCode`, `addressCity`, `addressCountry`, `addressLine1`, `addressLine2`, or `addressState` keys. Instead, it includes an `address` object containing: `city`, `country`, `line1`, `line2`, `postalCode`, `state` keys.
  - `ShippingDetails` no longer includes `addressPostalCode`, `addressCity`, `addressCountry`, `addressLine1`, `addressLine2`, or `addressState` keys. Instead, it includes an `address` object containing: `city`, `country`, `line1`, `line2`, `postalCode`, `state` keys.
  - `PaymentIntents` was renamed `PaymentIntent`. (If you were using `PaymentIntents.Status`, now you must change it to `PaymentIntent.Status`)
  - `SetupIntents` was renamed `SetupIntent`. (If you were using `SetupIntents.Status`, now you must change it to `SetupIntent.Status`)
  - (Typescript) `Card.Token` is now `Token.Result`
  - (Typescript) `Card.Brand` is now `Token.CardBrand`
  - (Typescript) `Card.TokenType` is now `Token.Type`
  - (Typescript) `Card.BankAccount` is now `Token.BankAccount`
  - (Typescript) `Card.Params` is now `Token.Params`
  - (Typescript) `CardFormView.Names` is now `CardFormView.FieldName`
  - (Typescript) `CardFieldInput.Names` is now `CardFieldInput.FieldName`
  - (Typescript) `ApplePayButtonComponent.Styles` is now `ApplePayButtonComponent.Style`
  - (Typescript) `ApplePayButtonComponent.Types` is now `ApplePayButtonComponent.Type`
  - (Typescript) `PaymentMethod` is now `PaymentMethod.Result`
  - (Typescript) `PaymentIntent` is now `PaymentIntent.Result`
  - (Typescript) `SetupIntent` is now `SetupIntent.Result`
  - (Typescript) Exports that were under the `Card` namespace are now under `Token`
  - (Typescript) `CreateTokenParams` is now `Token.CreateParams`
  - (Typescript) `BankAcccountHolderType` is now `Token.BankAcccountHolderType`
  - (Typescript) `ThreeDSecureConfigurationParams` is now `ThreeDSecure.ConfigurationParams`
  - (Typescript) `PaymentMethodCreateParams.Params` is now `PaymentMethod.CreateParams`
  - (Typescript) `PaymentMethodCreateParams.Options` is now `PaymentMethod.ConfirmOptions`
  - (Typescript) `CreateTokenParams` is now `Token.CreateParams`
  - (Typescript) `ConfirmSetupIntent.Params` is now `SetupIntent.ConfirmParams`
  - (Typescript) `ConfirmSetupIntent.Options` is now `SetupIntent.ConfirmOptions`
  - (Typescript) `confirmPayment` now accepts the `PaymentIntent.ConfirmParams` (same type, just renamed).
  - (Typescript) `BillingDetails` type is now exported directly, instead of under the `PaymentMethodCreateParams` object.
  - (Typescript) `presentGooglePay` now accepts `GooglePay.PresentParams`
  - (Typescript) `GooglePay.PresentGooglePayParams` is now `GooglePay.PresentParams`
  - (Typescript) `GooglePay.PresentGooglePayType` is now `GooglePay.PresentType`
  - (Typescript) `GooglePay.IsGooglePaySupportedParams` is now `GooglePay.IsSupportedParams`
  - (Typescript) Removed `GooglePay.SetupIntentParams`

## 0.6.1 - 2022-04-01 (📌 Expo SDK 45)

- Fix: correctly overwrite `package.json` import via babel. [#924](https://github.com/stripe/stripe-react-native/pull/924)
- Fix: upgrade expo config plugins. [#936](https://github.com/stripe/stripe-react-native/pull/936)

## 0.6.0 - 2022-04-01

- [#861](https://github.com/stripe/stripe-react-native/pull/861) BREAKING: This library now supports iOS 12 and up, due to `stripe-ios` increasing the deployment target. If you would like to build for iOS 11, please continue to use `@stripe/stripe-react-native@0.5.0`.
  - To upgrade your iOS deployment target to 12.0, you can either do so in Xcode under your `Build Settings`, or by modifying `IPHONEOS_DEPLOYMENT_TARGET` in your `project.pbxproj` directly. You will also need to update your Podfile to target `:ios, '12.0'`.
- [#861](https://github.com/stripe/stripe-react-native/pull/861) Feat: Add support for ACHv2 payments **on iOS only**.
- [#861](https://github.com/stripe/stripe-react-native/pull/861) Chore: Upgrade `stripe-ios` to 22.0.0.

## 0.5.0 - 2022-03-29

- [#863](https://github.com/stripe/stripe-react-native/pull/863) Feat: add card ID and bankAccount ID to token response
- [#862](https://github.com/stripe/stripe-react-native/pull/862) Feat: Add support for setting a card's `currency` when creating a Token
- [#854](https://github.com/stripe/stripe-react-native/pull/854) Chore: Upgrade `stripe-ios` to 21.13.0. Upgrade `stripe-android` to 19.3.0.
- [#845](https://github.com/stripe/stripe-react-native/pull/845) Feat: Added support for `placeholderColor`, `textErrorColor `, `borderColor`, `borderRadius`, and `borderWidth` for `AuBECSDebitForm` on iOS

## 0.4.0 - 2022-03-10

- [#821](https://github.com/stripe/stripe-react-native/pull/821) Feat: Add support for Klarna
- [#630](https://github.com/stripe/stripe-react-native/pull/630) Fix: card field focus jumps back to the card number field on Android
- [#824](https://github.com/stripe/stripe-react-native/pull/824) Fix: Google Pay error code when canceled should be 'Canceled'
- [#832](https://github.com/stripe/stripe-react-native/pull/832)
  - Deprecated `setUrlSchemeOnAndroid` in favor of `setReturnUrlSchemeOnAndroid`. `setReturnUrlSchemeOnAndroid` functions exactly the same, this is just a rename. `setUrlSchemeOnAndroid` will be removed in a future release.
  - Deprecated `handleCardAction` in favor of `handleNextAction`. `handleNextAction` functions exactly the same, this is just a rename. `handleCardAction` will be removed in a future release.
  - fix: Set `returnUrl` on Android in `confirmPayment` and `confirmSetupIntent`.
  - fix: Don't request focus on initialization of `CardForm` by default.

## 0.3.0 - 2022-02-17

- [#810](https://github.com/stripe/stripe-react-native/pull/810) Feat: add `isGooglePaySupported` method
- [#809](https://github.com/stripe/stripe-react-native/pull/809) Fix: do not crash if no routing number provided when creating a bank account token on Android
- [#814](https://github.com/stripe/stripe-react-native/pull/814) Fix: cleanup `paymentSheetFlowController` ref before initializing new payment sheet
- [#806](https://github.com/stripe/stripe-react-native/pull/806) Fix: properly assign `cursorColor` style on Android `CardField` (requires Android 10 or higher).
- [#817](https://github.com/stripe/stripe-react-native/pull/817) Chore: Upgrade `stripe-ios` to v21.12.0 and `stripe-android` to v19.2.+

## 0.2.4 - 2022-02-10

- [#788](https://github.com/stripe/stripe-react-native/pull/788) fix: assign `paymentSheetFragment` directly, instead of through intents which would sometimes result in a `NullPointerException`.
- [#591](https://github.com/stripe/stripe-react-native/pull/591) feat: add option to create a token directly from a bank account.
- [#801](https://github.com/stripe/stripe-react-native/pull/801) Upgraded `stripe-ios` to v21.11.1. Upgraded `stripe-android` to v19.1.+. Added Android 12 support to example.
- [#774](https://github.com/stripe/stripe-react-native/pull/774) feat: Add `currencyCode` support to `initPaymentSheet` for Google Pay & Setup Intents
- [#726](https://github.com/stripe/stripe-react-native/pull/726) Update build.gradle to be more flexible in version of `stripe-android` ([#726](https://github.com/stripe/stripe-react-native/issues/726))
- [#675](https://github.com/stripe/stripe-react-native/pull/675) Bug fixes for server example ([#675](https://github.com/stripe/stripe-react-native/issues/675))
- [#629](https://github.com/stripe/stripe-react-native/pull/629) feat: Add validation state to CardField ([#423](https://github.com/stripe/stripe-react-native/issues/423)) ([#629](https://github.com/stripe/stripe-react-native/issues/629))
- [#702](https://github.com/stripe/stripe-react-native/pull/702) docs: Update GooglePay.md ([#702](https://github.com/stripe/stripe-react-native/issues/702))
- [#690](https://github.com/stripe/stripe-react-native/pull/690) docs: Correct default for existingPaymentMethodRequired ([#690](https://github.com/stripe/stripe-react-native/issues/690))
- [#660](https://github.com/stripe/stripe-react-native/pull/660) docs: Fixed readme js object typo ([#660](https://github.com/stripe/stripe-react-native/issues/660))
- [#657](https://github.com/stripe/stripe-react-native/pull/657) chore: updated the dependencies for the example app ([#657](https://github.com/stripe/stripe-react-native/issues/657))
- [#658](https://github.com/stripe/stripe-react-native/pull/658) fix: TS issue with 0.2.3 StripeProvider cannot be used as a JSX component ([#658](https://github.com/stripe/stripe-react-native/issues/658))
- [#635](https://github.com/stripe/stripe-react-native/pull/635) fix: billing address postal code ([#635](https://github.com/stripe/stripe-react-native/issues/635))

## 0.2.3 - 2021-10-18 (📌 Expo SDK 44)

- [#565](https://github.com/stripe/stripe-react-native/pull/565) chore: Add jest mock file ([#565](https://github.com/stripe/stripe-react-native/issues/565))
- [#587](https://github.com/stripe/stripe-react-native/pull/587) chore: Update Podfile.lock stripe-react-native version ([#587](https://github.com/stripe/stripe-react-native/issues/587))
- [#568](https://github.com/stripe/stripe-react-native/pull/568) fix: check support for specific TextInputState methods ([#568](https://github.com/stripe/stripe-react-native/issues/568))
- [#631](https://github.com/stripe/stripe-react-native/pull/631) chore: Update tips migration guide ([#631](https://github.com/stripe/stripe-react-native/issues/631))
- [#601](https://github.com/stripe/stripe-react-native/pull/601) feat: Add button color, return URL, allowsDelayedPaymentMethods, and billing details to PaymentSheet ([#601](https://github.com/stripe/stripe-react-native/issues/601))

## 0.2.2 - 2021-09-15 (📌 Expo SDK 43)

- [#588](https://github.com/stripe/stripe-react-native/pull/588) fix: use the LocalBroadcastManager ([#588](https://github.com/stripe/stripe-react-native/issues/588))

## 0.2.1 - 2021-09-02

- [#548](https://github.com/stripe/stripe-react-native/pull/548) chore: split apple pay address by new line ([#531](https://github.com/stripe/stripe-react-native/issues/531))
- [#546](https://github.com/stripe/stripe-react-native/pull/546) fix: resolve initGooglePay with error if it's not available ([#533](https://github.com/stripe/stripe-react-native/issues/533))
- [#525](https://github.com/stripe/stripe-react-native/pull/525) feat: add `openApplePaySetup` method ([#400](https://github.com/stripe/stripe-react-native/issues/400))
- [#521](https://github.com/stripe/stripe-react-native/pull/521) fix: support cardFormView for createToken method
- [#514](https://github.com/stripe/stripe-react-native/pull/514) feat: simpify `presentPaymentSheet`
- [#513](https://github.com/stripe/stripe-react-native/pull/513) fix: set `null` as initial value for `isApplePaySupported` ([#496](https://github.com/stripe/stripe-react-native/issues/496))
- [#506](https://github.com/stripe/stripe-react-native/pull/506) feat: enhance payment sheet dx ([#505](https://github.com/stripe/stripe-react-native/issues/505))

## 0.2.0 - 2021-08-03

- [#415](https://github.com/stripe/stripe-react-native/pull/415) feat: add multiline card form element ([#83](https://github.com/stripe/stripe-react-native/issues/83))
- [#441](https://github.com/stripe/stripe-react-native/pull/441) feat(android): add standalone Google Pay ([#9](https://github.com/stripe/stripe-react-native/issues/9))
- [#422](https://github.com/stripe/stripe-react-native/pull/422) feat: add WeChat Pay ([#52](https://github.com/stripe/stripe-react-native/issues/52))
- [#453](https://github.com/stripe/stripe-react-native/pull/453) chore: add JCB support for Apple Pay ([#43](https://github.com/stripe/stripe-react-native/issues/430))
- [#451](https://github.com/stripe/stripe-react-native/pull/451) fix: send postal code with card details ([#420](https://github.com/stripe/stripe-react-native/issues/420))
- [#436](https://github.com/stripe/stripe-react-native/pull/436) fix: cardfield crashes app ([#391](https://github.com/stripe/stripe-react-native/issues/391))
- [#419](https://github.com/stripe/stripe-react-native/pull/419) fix(android): error handling for createToken ([#405](https://github.com/stripe/stripe-react-native/issues/405))

## 0.1.5 - 2021-07-14

- [#394](https://github.com/stripe/stripe-react-native/pull/394) **[BREAKING CHANGE]** fix: createToken response discrepancy ([#344](https://github.com/stripe/stripe-react-native/issues/344))
- [#354](https://github.com/stripe/stripe-react-native/pull/354) **[BREAKING CHANGE]** chore: rename top-level export `confirmPaymentMethod` to `confirmPayment` ([#318](https://github.com/stripe/stripe-react-native/issues/318))
- [#416](https://github.com/stripe/stripe-react-native/pull/416) fix(android): googlePay setting on initPaymentSheet
- [#392](https://github.com/stripe/stripe-react-native/pull/392) fix: `created` timestamp discrepancy ([#368](https://github.com/stripe/stripe-react-native/issues/368))
- [#395](https://github.com/stripe/stripe-react-native/pull/395) fix: resolve `initPaymentSheet` only when ready ([#315](https://github.com/stripe/stripe-react-native/issues/315))
- [#390](https://github.com/stripe/stripe-react-native/pull/390) fix: add missing setupFutureUsage param ([#367](https://github.com/stripe/stripe-react-native/issues/367))
- [#389](https://github.com/stripe/stripe-react-native/pull/389) fix: set url scheme when using paymentMethodId ([#378](https://github.com/stripe/stripe-react-native/issues/378))
- [#337](https://github.com/stripe/stripe-react-native/pull/337) feat: expose CardField methods (focus, blur, clear)
- [#366](https://github.com/stripe/stripe-react-native/pull/366) fix: open payment sheet from modal ([#315](https://github.com/stripe/stripe-react-native/issues/315); [#290](https://github.com/stripe/stripe-react-native/issues/290))

## 0.1.4 - 2021-06-04 (📌 Expo SDK 42)

## 0.1.3 - 2021-06-04

- [#309](https://github.com/stripe/stripe-react-native/pull/309) feat: add `retrieveSetupIntent` method ([#294](https://github.com/stripe/stripe-react-native/issues/294))
- [#306](https://github.com/stripe/stripe-react-native/pull/306) feat: add `dangerouslyGetFullCardDetails` prop to `CardField` component ([#280](https://github.com/stripe/stripe-react-native/issues/280))
- [#298](https://github.com/stripe/stripe-react-native/pull/298) feat: support SetupIntents in payment sheet ([#293](https://github.com/stripe/stripe-react-native/issues/293))
- [#296](https://github.com/stripe/stripe-react-native/pull/296) chore: support `testID` prop in all UI components ([#268](https://github.com/stripe/stripe-react-native/issues/268))
- [#295](https://github.com/stripe/stripe-react-native/pull/295) feat(ios): return the `paymentMethod` object when `presentApplePay` resolves ([#271](https://github.com/stripe/stripe-react-native/issues/271))
- [#273](https://github.com/stripe/stripe-react-native/pull/273) feat: enrich the response error objects with additional information ([#206](https://github.com/stripe/stripe-react-native/issues/206))
- [#276](https://github.com/stripe/stripe-react-native/pull/276) fix(android): payment sheet not opening when `stripeAccountId` set ([#267](https://github.com/stripe/stripe-react-native/issues/267))
- [#266](https://github.com/stripe/stripe-react-native/pull/266) feat(ios): add `borderRadius` prop to the `ApplePayButton` component ([#258](https://github.com/stripe/stripe-react-native/issues/258))
- [#260](https://github.com/stripe/stripe-react-native/pull/260) feat: add the `StripeContainer` component that allows for dismissal of the keyboard when wrapped around the `CardField` compnent ([#222](https://github.com/stripe/stripe-react-native/issues/222))
- [#255](https://github.com/stripe/stripe-react-native/pull/255) fix(android): crash on `onActivityResult` when Stripe isn't initalized

## 0.1.2 - 2021-05-21

- [#247](https://github.com/stripe/stripe-react-native/pull/247) feat: add `fontFamily` prop to `CardField` component ([#103](https://github.com/stripe/stripe-react-native/issues/103))
- [#245](https://github.com/stripe/stripe-react-native/pull/245) fix: clear card params when `CardField` input is invalidated ([#237](https://github.com/stripe/stripe-react-native/issues/237))
- [#228](https://github.com/stripe/stripe-react-native/pull/228) feat: add ability to show error in Apple Pay sheet within `onShippingContactSelected` handler ([#148](https://github.com/stripe/stripe-react-native/issues/148))
- [#221](https://github.com/stripe/stripe-react-native/pull/221) feat: add legacy `createToken` method for older integrations ([#187](https://github.com/stripe/stripe-react-native/issues/187))
- [#234](https://github.com/stripe/stripe-react-native/pull/234) fix: add missing 3D Secure button props ([#201](https://github.com/stripe/stripe-react-native/issues/201))
- [#226](https://github.com/stripe/stripe-react-native/pull/226) feat: add `autofocus` prop to `CardField` component ([#199](https://github.com/stripe/stripe-react-native/issues/199))

## 0.1.1 - 2021-05-14 (📌 Expo SDK 41)

- [#224](https://github.com/stripe/stripe-react-native/pull/224) chore: upgrade to [`stripe-android` version `16.8.2`](https://github.com/stripe/stripe-android/blob/master/CHANGELOG.md#1682---2021-05-14) ([#212](https://github.com/stripe/stripe-react-native/issues/212))
- [#213](https://github.com/stripe/stripe-react-native/pull/213) fix: expose config-plugin and add blank swift file
- [#217](https://github.com/stripe/stripe-react-native/pull/217) feat: E2E testing CI configuration
- [#216](https://github.com/stripe/stripe-react-native/pull/216) fix: unify cancel handling ([#205](https://github.com/stripe/stripe-react-native/issues/205))
- [#215](https://github.com/stripe/stripe-react-native/pull/215) fix: createPaymentMethod promise reject ([#209](https://github.com/stripe/stripe-react-native/issues/209))
- [#208](https://github.com/stripe/stripe-react-native/pull/208) fix: add `.npmignore` disallow list ([#204](https://github.com/stripe/stripe-react-native/issues/204))
- [#207](https://github.com/stripe/stripe-react-native/pull/207) fix: handle different pjson output ([#200](https://github.com/stripe/stripe-react-native/issues/200))
- [#197](https://github.com/stripe/stripe-react-native/pull/197) fix: update library name in expo plugin

## 0.1.0 - 2021-05-10

- Initial release

Special thanks to: [Arek Kubaczkowski](https://github.com/arekkubaczkowski), [Charlie Cruzan](https://github.com/cruzach), and [Jakub Kłobus](https://github.com/souhe).
