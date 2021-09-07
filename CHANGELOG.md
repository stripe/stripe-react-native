# CHANGELOG

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
