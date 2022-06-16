# CHANGELOG

## Unreleased

## 0.13.1

### Breaking changes

### New features

### Fixes

- Never show postal code input in `CardField` if `postalCodeEnabled=false` (regardless of `countryCode`). [#996](https://github.com/stripe/stripe-react-native/pull/996)

## 0.13.0

### Breaking changes

### New features

- Added a `defaultValues` prop to the `CardForm` component. Currently only accepts `countryCode`, and is Android-only. [#974](https://github.com/stripe/stripe-react-native/pull/974)
- Added the `countryCode` prop to the `CardField` component. [#989](https://github.com/stripe/stripe-react-native/pull/989)
- Added option to create a PII token (represents the details of personally identifiable information) to the `createToken` method. [#976](https://github.com/stripe/stripe-react-native/pull/976)

### Fixes

- Resolve with an Error (of type `Canceled`) if no payment option is selected in the Payment Sheet custom flow (i.e., the `x` button is clicked to close the Payment Sheet). [#975](https://github.com/stripe/stripe-react-native/pull/975)
- Fixed an issue on Android where the `complete` field in the `onCardChange` callback would incorrectly be set to `true` even if the postal code wasn't filled out. [#989](https://github.com/stripe/stripe-react-native/pull/989)
- Make `SetupIntent.lastSetupError` and `PaymentIntent.lastPaymentError` object shape consistent on iOS and Android.[#990](https://github.com/stripe/stripe-react-native/pull/990)

## 0.12.0

### Breaking changes

- Renamed `appearance.shapes.shadow.borderRadius` to `appearance.shapes.shadow.blurRadius`, and `appearance.primaryButton.shapes.shadow.borderRadius` to `appearance.primaryButton.shapes.shadow.blurRadius`. [#962](https://github.com/stripe/stripe-react-native/pull/962)

### New features

### Fixes

- Fixed cases where Android apps would crash with the error: `Unable to instantiate fragment com.reactnativestripesdk.PaymentLauncherFragment`. [#965](https://github.com/stripe/stripe-react-native/pull/965)
- Fixed `appearance.shapes.shadow.offset` and `appearance.primaryButton.shapes.shadow.offset` not applying the y-coordinate in the correct direction. [#962](https://github.com/stripe/stripe-react-native/pull/962)
- Fixed a bug where `handleNextAction` wouldn't resolve on Android when using 3DS2. [#966](https://github.com/stripe/stripe-react-native/pull/966)
- Fixed a bug where the wrong CVC icon was show in the `CardForm` component on Android. [#966](https://github.com/stripe/stripe-react-native/pull/966)
- The card brand tint color is now correctly set in the `CardField` component on Android via the `cardStyle.textColor` prop. [#851](https://github.com/stripe/stripe-react-native/pull/851)

## 0.11.0

### Breaking changes

- Removed support for `primaryButtonColor` field on `initPaymentSheet()`. Please use the new `appearance.primaryButton.colors.background` field instead. [#940](https://github.com/stripe/stripe-react-native/pull/940)

### New features

- You can now customize the appearance of your Payment Sheet via the `appearance` field on `initPaymentSheet()`. [#940](https://github.com/stripe/stripe-react-native/pull/940)
- Added Affirm and AU BECS Direct Debit support to Payment Sheet. [#940](https://github.com/stripe/stripe-react-native/pull/940)

### Fixes

- Improved error messages on Android for failed `confirmPayment` and `confirmSetupIntent` calls, and any Google Pay related methods. [#957](https://github.com/stripe/stripe-react-native/pull/957)
- Made Android card validation state consistent with iOS in the `CardField` `onCardChange` callback. [#958](https://github.com/stripe/stripe-react-native/pull/958)

## 0.10.0

### Breaking changes

### New features

- Card scanning is available in payment sheet on Android. [#944](https://github.com/stripe/stripe-react-native/pull/944)
  - To enable this, you will need to add `implementation 'com.stripe:stripecardscan:20.3.+'` to your `dependencies {}` block in `android/app/build.gradle`.
- `us_bank_account` payment method is now available in the payment sheet on Android. [#944](https://github.com/stripe/stripe-react-native/pull/944)

### Fixes

## 0.9.0

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

## 0.8.0

- **Breaking: This version requires you use `react-native@0.64.0` or above**
- [#902](https://github.com/stripe/stripe-react-native/pull/902) fix: create custom babel plugin for package.json imports in src/
- [#889](https://github.com/stripe/stripe-react-native/pull/889) Feat: add support for push provisioning (adding cards to native wallets)
- [#890](https://github.com/stripe/stripe-react-native/pull/890) BREAKING CHANGE: Changed parameters for: `createPaymentMethod`, `confirmPayment`, `confirmSetupIntent`, `collectBankAccountForPayment`, and `collectBankAccountForSetup`. Please read [this migration guide](./docs/upgrading-from-v0.7.0.md) for details.
  - Renamed `type` field to `paymentMethodType` on `PaymentMethod.Result`, `PaymentIntent.Result`, and `SetupIntent.Result` (result of `createPaymentMethod`, `retrieveSetupIntent`, `confirmSetupIntent`, `confirmPayment`, `collectBankAccountForPayment`, `collectBankAccountForSetup`, `verifyMicrodepositsForPayment`, and `verifyMicrodepositsForSetup`).
- [#849](https://github.com/stripe/stripe-react-native/pull/849) BREAKING CHANGE: Renamed `placeholder` prop on `<CardField />` and `<CardForm />` to `placeholders`.
- [#849](https://github.com/stripe/stripe-react-native/pull/849) Feat: Added customized styling options to `<CardForm />` on Android.

## 0.7.0

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

## 0.6.0

- [#861](https://github.com/stripe/stripe-react-native/pull/861) BREAKING: This library now supports iOS 12 and up, due to `stripe-ios` increasing the deployment target. If you would like to build for iOS 11, please continue to use `@stripe/stripe-react-native@0.5.0`.
  - To upgrade your iOS deployment target to 12.0, you can either do so in Xcode under your `Build Settings`, or by modifying `IPHONEOS_DEPLOYMENT_TARGET` in your `project.pbxproj` directly. You will also need to update your Podfile to target `:ios, '12.0'`.
- [#861](https://github.com/stripe/stripe-react-native/pull/861) Feat: Add support for ACHv2 payments **on iOS only**.
- [#861](https://github.com/stripe/stripe-react-native/pull/861) Chore: Upgrade `stripe-ios` to 22.0.0.

## 0.5.0

- [#863](https://github.com/stripe/stripe-react-native/pull/863) Feat: add card ID and bankAccount ID to token response
- [#862](https://github.com/stripe/stripe-react-native/pull/862) Feat: Add support for setting a card's `currency` when creating a Token
- [#854](https://github.com/stripe/stripe-react-native/pull/854) Chore: Upgrade `stripe-ios` to 21.13.0. Upgrade `stripe-android` to 19.3.0.
- [#845](https://github.com/stripe/stripe-react-native/pull/845) Feat: Added support for `placeholderColor`, `textErrorColor `, `borderColor`, `borderRadius`, and `borderWidth` for `AuBECSDebitForm` on iOS

## 0.4.0

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

## 0.2.3 - 2021-10-18

- [#565](https://github.com/stripe/stripe-react-native/pull/565) chore: Add jest mock file ([#565](https://github.com/stripe/stripe-react-native/issues/565))
- [#587](https://github.com/stripe/stripe-react-native/pull/587) chore: Update Podfile.lock stripe-react-native version ([#587](https://github.com/stripe/stripe-react-native/issues/587))
- [#568](https://github.com/stripe/stripe-react-native/pull/568) fix: check support for specific TextInputState methods ([#568](https://github.com/stripe/stripe-react-native/issues/568))
- [#631](https://github.com/stripe/stripe-react-native/pull/631) chore: Update tips migration guide ([#631](https://github.com/stripe/stripe-react-native/issues/631))
- [#601](https://github.com/stripe/stripe-react-native/pull/601) feat: Add button color, return URL, allowsDelayedPaymentMethods, and billing details to PaymentSheet ([#601](https://github.com/stripe/stripe-react-native/issues/601))

## 0.2.2 - 2021-09-15

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

## 0.1.4 - 2021-06-04 - Expo SDK 42.0.0

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

## 0.1.1 - 2021-05-14 - Expo SDK 41.0.0

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
