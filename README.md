# Stripe React Native SDK

[![npm version](https://img.shields.io/npm/v/@stripe/stripe-react-native.svg?style=flat-square)](https://www.npmjs.com/package/@stripe/stripe-react-native)
[![License](https://img.shields.io/github/license/stripe/stripe-react-native)](https://github.com/stripe/stripe-react-native/blob/master/LICENSE)

The Stripe React Native SDK allows you to build delightful payment experiences in your native Android and iOS apps using React Native. We provide powerful and customizable UI screens and elements that can be used out-of-the-box to collect your users' payment details.

Get started with our [📚 integration guides](https://stripe.com/docs/payments/accept-a-payment?platform=react-native) and [example project](#run-the-example-app), or [📘 browse the SDK reference](https://stripe.dev/stripe-react-native).

> Updating to a newer version of the SDK? See our [changelog](https://github.com/stripe/stripe-react-native/blob/master/CHANGELOG.md).

## Features

**Simplified Security**: We make it simple for you to collect sensitive data such as credit card numbers and remain [PCI compliant](https://stripe.com/docs/security#pci-dss-guidelines). This means the sensitive data is sent directly to Stripe instead of passing through your server. For more information, see our [Integration Security Guide](https://stripe.com/docs/security).

**Apple Pay**: We provide a [seamless integration with Apple Pay](https://stripe.com/docs/apple-pay).

**Payment methods**: Accepting more [payment methods](https://stripe.com/docs/payments/payment-methods/overview) helps your business expand its global reach and improve checkout conversion.

**SCA-Ready**: The SDK automatically performs native [3D Secure authentication](https://stripe.com/docs/payments/3d-secure) if needed to comply with [Strong Customer Authentication](https://stripe.com/docs/strong-customer-authentication) regulation in Europe.

**Native UI**: We provide native screens and elements to securely collect payment details on Android and iOS.

## Installation

```sh
yarn add @stripe/stripe-react-native
or
npm install @stripe/stripe-react-native
```

### Requirements

#### Android

- Minimum SDK version is `21`
- To install the SDK, add jitpack.io as a repository in your top level `build.gradle` file. (see [example](https://github.com/stripe/stripe-react-native/blob/master/example/android/build.gradle)).

```
allprojects {
  repositories {
    ...
    maven { url 'https://jitpack.io' }
  }
}
```

#### iOS

- Minimum deployment target is `11.0`

For iOS you will have to run `pod install` in the `ios` directory to install the native dependencies.

## Usage example

```tsx
// App.ts
import { StripeProvider } from '@stripe/stripe-react-native';

<StripeProvider
  publishableKey={publishableKey}
  merchantIdentifier="merchant.identifier"
>
  <PaymentScreen />
</StripeProvider>;

// PaymentScreen.ts
import {
  CardField,
  CardFieldInput,
  useStripe,
} from '@stripe/stripe-react-native';

export default function PaymentScreen() {
  const [card, setCard] = useState<CardFieldInput.Details | null>(null);
  const { confirmPayment, handleCardAction } = useStripe();

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
        setCard(cardDetails);
      }}
      onFocus={(focusedField) => {
        console.log('focusField', focusedField);
      }}
    />
  );
}
```

## Stripe initialisation

To initialise Stripe in React Native App use `StripeProvider` component in the root component of your application or `initStripe` method alternatively.

`StripeProvider` can accept `urlScheme`, `publishableKey`, `stripeAccountId`, `threeDSecureParams` and `merchantIdentifier` as props. Only `publishableKey` is required. You can init it with a static values or if preferred fetch `publishableKey` from your server and then use it in `StripeProvider`.

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

You can find more details about StripeProvider in [API reference](./docs/api-reference.md#stripeprovider).

## Run the example app

- Install the dependencies
  - `yarn bootstrap`
- Set up env vars
  - `cp example/.env.example example/.env` and set the variable values in your newly created `.env` file.
- Start the example
  - Terminal 1: `yarn example start:server`
  - Terminal 2: `yarn example start`
  - Terminal 3: `yarn example ios` / `yarn example android`

##### Additional steps for webhook forwarding

- [Install the `stripe-cli`](https://stripe.com/docs/stripe-cli)
- Run `stripe listen --forward-to localhost:4242/webhook`

## Troubleshooting

While building your iOS project there might appear an issue with says about undefined symbols for architecture x86_64. It follows from some specific `react-native init` template configuration which is not fully compatibile with `swift 5.1` which is used in our SDK.

error example:

```
Undefined symbols for architecture x86_64:
  "(extension in Foundation):__C.NSScanner.scanUpToString(Swift.String) -> Swift.String?", referenced from:
      static Stripe.STPPhoneNumberValidator.formattedRedactedPhoneNumber(for: Swift.String, forCountryCode: Swift.String?) -> Swift.String in libStripe.a(STPPhoneNumberValidator.o)
  "__swift_FORCE_LOAD_$_swiftUniformTypeIdentifiers", referenced from:
      __swift_FORCE_LOAD_$_swiftUniformTypeIdentifiers_$_Stripe in libStripe.a(PKPaymentAuthorizationViewController+Stripe_Blocks.o)
```

Temprary workaround for this issue is following these steps:

- Remove all entries from LIBRARY_SEARCH_PATHS in the Project configuration
  `$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)` and `$(TOOLCHAIN_DIR)/usr/lib/swift-5.0/$(PLATFORM_NAME)`
- Open Xcode and create a new Swift file to the project (File > New > File > Swift), call it whatever you want and create bridging header when it ask about it.

## Guides

- [Accept a payment](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [Card payments without bank authentication](https://stripe.com/docs/payments/without-card-authentication?platform=react-native)
- [Save a card without bank authentication](https://stripe.com/docs/payments/save-card-without-authentication?platform=react-native)
- [Upgrade to handle authentication](https://stripe.com/docs/payments/payment-intents/upgrade-to-handle-actions?platform=react-native)
- [Set up future payments](https://stripe.com/docs/payments/save-and-reuse?platform=react-native)
- [Save a card during payment](https://stripe.com/docs/payments/save-during-payment?platform=react-native)
- [Finalize payments on the server](https://stripe.com/docs/payments/accept-a-payment-synchronously?platform=react-native)
- [Apple Pay](https://stripe.com/docs/apple-pay?platform=react-native)
- [3D secure](https://stripe.com/docs/payments/3d-secure#when-to-use-3d-secure)
- [Accept a payment - integration builder](./docs/accept-a-payment-integration.md)

## API reference

You can find API reference [here](./docs/api-reference.md)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
