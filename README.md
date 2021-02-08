# stripe-react-native

Stripe SDK for React Native

## Installation

```sh
yarn add stripe-react-native
```

### Android

##### Requirements

- Minimum SDK version is `21`

### iOS

##### Requirements

- Minimum deployment target is `11.0`

For iOS you will have to run `pod install` in `ios` directory to install native dependencies.

## Usage example

```tsx
// App.ts
import { StripeProvider } from 'stripe-react-native';

<StripeProvider
  publishableKey={publishableKey}
  merchantIdentifier="merchant.identifier"
>
  <PaymentScreen />
</StripeProvider>;

// PaymentScreen.ts
import { CardField, useStripe } from 'stripe-react-native';

export default function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(null);
  const { confirmPayment, handleCardAction } = useStripe();

  return <CardField onCardChange={setCard} />;
}
```

## Stripe initialisation

To initialise Stripe in React Native App use `StripeProvider` component in the root component of your application.

`StripeProvider` can accept `publishableKey`, `stripeAccountId` and `merchantIdentifier` as props. Only `publishableKey` is required. You can init it with a static values or if preferred fetch `publishableKey` from your server and then use it in `StripeProvider`.

```tsx
import { StripeProvider } from 'stripe-react-native';

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

You can find more details about StripeProvider in [API reference](./docs/api-reference.md#stripeprovider).

## Run example app

- `cd ./example`
- `yarn` or `npm install`
- for ios you have to run `pod install` in `ios` directory
- create `.env` file with mandatory variables (look at `.env.example`)
- `yarn start:server`
- `yarn ios` / `yarn android`

##### additionall steps for webhook example

- [install `stripe-cli`](https://stripe.com/docs/stripe-cli)
- run command `stripe listen --forward-to localhost:4242/webhook`

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

- [Accept a payment - classic](./docs/accept-a-payment.md)
- [Accept a payment - integration builder](./docs/accept-a-payment-integration.md)
- [3D secure](./docs/3d-secure.md)
- [Apple Pay](./docs/apple-pay.md)
- [Set up future payments](./docs/set-up-future-payments.md)

## API reference

You can find API reference [here](./docs/api-reference.md)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
