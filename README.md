# Stripe React Native SDK

[![npm version](https://img.shields.io/npm/v/@stripe/stripe-react-native.svg?style=flat-square)](https://www.npmjs.com/package/@stripe/stripe-react-native)
[![License](https://img.shields.io/github/license/stripe/stripe-react-native)](https://github.com/stripe/stripe-react-native/blob/master/LICENSE)

The Stripe React Native SDK allows you to build delightful payment experiences in your native Android and iOS apps using React Native. We provide powerful and customizable UI screens and elements that can be used out-of-the-box to collect your users' payment details.

## Getting started

Get started with our [📚 integration guides](https://stripe.com/docs/payments/accept-a-payment?platform=react-native) and [example project](#run-the-example-app), or [📘 browse the SDK reference](https://stripe.dev/stripe-react-native).

> Updating to a newer version of the SDK? See our [changelog](https://github.com/stripe/stripe-react-native/blob/master/CHANGELOG.md).

## Features

**Simplified Security**: We make it simple for you to collect sensitive data such as credit card numbers and remain [PCI compliant](https://stripe.com/docs/security#pci-dss-guidelines). This means the sensitive data is sent directly to Stripe instead of passing through your server. For more information, see our [Integration Security Guide](https://stripe.com/docs/security).

**Apple Pay**: We provide a [seamless integration with Apple Pay](https://stripe.com/docs/apple-pay).

**Payment methods**: Accepting more [payment methods](https://stripe.com/docs/payments/payment-methods/overview) helps your business expand its global reach and improve checkout conversion.

**SCA-Ready**: The SDK automatically performs native [3D Secure authentication](https://stripe.com/docs/payments/3d-secure) if needed to comply with [Strong Customer Authentication](https://stripe.com/docs/strong-customer-authentication) regulation in Europe.

**Native UI**: We provide native screens and elements to securely collect payment details on Android and iOS.

**Pre-built payments UI (beta)**: [Learn how to integrate](https://stripe.com/docs/mobile/payments-ui-beta) Payment Sheet, our new pre-built payments UI for mobile apps. Our pre-built UI lets you accept cards, Apple Pay, and Google Pay out of the box, and includes support for saving & reusing cards. We'll be adding support for many more payment method during the beta.

#### Recommended usage

If you're selling digital products or services within your app, (e.g. subscriptions, in-game currencies, game levels, access to premium content, or unlocking a full version), you must use the app store's in-app purchase APIs. See [Apple's](https://developer.apple.com/app-store/review/guidelines/#payments) and [Google's](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en&ref_topic=9857752) guidelines for more information. For all other scenarios you can use this SDK to process payments via Stripe.


## Installation

```sh
yarn add @stripe/stripe-react-native
or
npm install @stripe/stripe-react-native
```

### Expo

> [Find Expo's full documentation here](https://docs.expo.io/versions/latest/sdk/stripe/).

If you're using Expo, add:

```json
{
  "expo": {
    ...
    "plugins": [
      [
        "@stripe/stripe-react-native",
        {
          "merchantIdentifier": string | string [],
          "enableGooglePay": boolean
        }
      ]
    ],
  }
}
```

to your `app.json` file, where `merchantIdentifier` is the Apple merchant ID obtained [here](https://stripe.com/docs/apple-pay?platform=react-native). Otherwise, Apple Pay will not work as expected. If you have multiple `merchantIdentifier`s, you can set them in an array.

### Requirements

#### Android

- Android 5.0 (API level 21) and above
- Android gradle plugin 4.x and above

#### iOS

Compatible with apps targeting iOS 11 or above.

The SDK uses TypeScript features available in Babel version `7.9.0` and above.
Alternatively use the `plugin-transform-typescript` plugin in your project.

You'll need to run `pod install` in your `ios` directory to install the native dependencies.

## Usage example

```tsx
// App.ts
import { StripeProvider } from '@stripe/stripe-react-native';

function App() {
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.identifier"
    >
      <PaymentScreen />
    </StripeProvider>
  );
}

// PaymentScreen.ts
import { CardField, useStripe } from '@stripe/stripe-react-native';

export default function PaymentScreen() {
  const { confirmPayment } = useStripe();

  return (
    <CardField
      postalCodeEnabled={true}
      placeholder={{
        number: '4242 4242 4242 4242',
      }}
      cardStyle={{
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
      }}
      style={{
        width: '100%',
        height: 50,
        marginVertical: 30,
      }}
      onCardChange={(cardDetails) => {
        console.log('cardDetails', cardDetails);
      }}
      onFocus={(focusedField) => {
        console.log('focusField', focusedField);
      }}
    />
  );
}
```

## Stripe initialization

To initialize Stripe in your React Native app, use the `StripeProvider` component in the root component of your application, or use the `initStripe` method.

`StripeProvider` can accept `urlScheme`, `publishableKey`, `stripeAccountId`, `threeDSecureParams` and `merchantIdentifier` as props. Only `publishableKey` is required.

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

function App() {
  const [publishableKey, setPublishableKey] = useState('');

  const fetchPublishableKey = async () => {
    const key = await fetchKey(); // fetch key from your server here
    setPublishableKey(key);
  };

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.identifier"
    >
      // Your app code here
    </StripeProvider>
  );
}
```

or

```tsx
import { initStripe } from '@stripe/stripe-react-native';

function App() {
  // ...

  useEffect(() => {
    initStripe({
      publishableKey: publishableKey
      merchantIdentifier: 'merchant.identifier',
    });
  }, []);
}
```

You can find more details about the `StripeProvider` component in the [API reference](https://stripe.dev/stripe-react-native/api-reference/modules.html#stripeprovider).

## Run the example app

- Install the dependencies
  - `yarn bootstrap`
- Set up env vars
  - `cp example/.env.example example/.env` and set the variable values in your newly created `.env` file.
- Start the example
  - Terminal 1: `yarn example start:server`
  - Terminal 2: `yarn example start`
  - Terminal 3: depending on what platform you want to build for run either
    - `yarn example ios`
    - or
    - `yarn example android`

##### Additional steps for webhook forwarding

Certain payment methods require a [webhook listener](https://stripe.com/docs/payments/payment-intents/verifying-status#webhooks) to notify you of changes in the status. When developing locally, you can use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhook events to your local dev server.

- [Install the `stripe-cli`](https://stripe.com/docs/stripe-cli#install)
- Run `stripe listen --forward-to localhost:4242/webhook`
- The CLI will print a webhook secret (such as, `whsec_***`) to the console. Set STRIPE_WEBHOOK_SECRET to this value in your `example/.env` file.

## Troubleshooting

### `Undefined symbols for architecture x86_64` on iOS

While building your iOS project, you may see a `Undefined symbols for architecture x86_64` error. This is caused by `react-native init` template configuration that is not fully compatible with Swift 5.1.

```
Undefined symbols for architecture x86_64:
  "(extension in Foundation):__C.NSScanner.scanUpToString(Swift.String) -> Swift.String?", referenced from:
      static Stripe.STPPhoneNumberValidator.formattedRedactedPhoneNumber(for: Swift.String, forCountryCode: Swift.String?) -> Swift.String in libStripe.a(STPPhoneNumberValidator.o)
  "__swift_FORCE_LOAD_$_swiftUniformTypeIdentifiers", referenced from:
      __swift_FORCE_LOAD_$_swiftUniformTypeIdentifiers_$_Stripe in libStripe.a(PKPaymentAuthorizationViewController+Stripe_Blocks.o)
```

Follow these steps to resolve this:

- Open your project via Xcode, go to `project -> build settings`, find `library search paths` and remove all swift related entries such as:
  `$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)` and `$(TOOLCHAIN_DIR)/usr/lib/swift-5.0/$(PLATFORM_NAME)`.
- Create a new Swift file to the project (File > New > File > Swift), give it any name (e.g. `Fix.swift`) and create a bridging header when prompted by Xcode.

### `TypeError: null is not an object (evaluating '_NativeStripeSdk.default.initialise')` on Android

You might see error this whilst initializing the `StripeProvider` component with Expo. This is caused by using an older version of Expo before stripe-react-native was [officially supported](https://github.com/stripe/stripe-react-native/issues/3#issuecomment-846225534). Updating Expo Go from the stores (or locally on simulators installed with `expo install:client:[ios|android]`) should fix the problem.

If you're still having troubles, please [open an issue](https://github.com/stripe/stripe-react-native/issues/new/choose) or jump in our [developer chat](https://webchat.freenode.net/#stripe).

## Contributing

See the [contributor guidelines](CONTRIBUTING.md) to learn how to contribute to the repository.
