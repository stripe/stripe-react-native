# react-native-stripe-sdk

Stripe SDK for React Native

## Installation

```sh
yarn add react-native-stripe-sdk
```

### iOS

For iOS you will have to run `pod install` in `ios` directory to install native dependencies.

## Usage example

```tsx
// App.ts
import { StripeProvider } from 'react-native-stripe-sdk';

<StripeProvider
  publishableKey={publishableKey}
  merchantIdentifier="merchant.identifier"
  appInfo={{
    name: 'react-native-stripe-sdk',
    version: '0.0.1',
    partnerId: 'id',
    url: 'http://your-website.com',
  }}
>
  <PaymentScreen />
</StripeProvider>;

// PaymentScreen.ts
import { CardField, useStripe } from 'react-native-stripe-sdk';

export default function PaymentScreen() {
  const [card, setCard] = useState<CardDetails | null>(null);
  const { confirmPayment, handleNextPaymentAction } = useStripe();

  return (
    <CardField
      defaultValue={{
        number: '4242424242424242',
        cvc: '424',
        expiryMonth: 3,
        expiryYear: 22,
      }}
      onCardChange={setCard}
    />
  );
}
```

## Stripe initialisation

To initialise Stripe in React Native App use `StripeProvider` component in the root component of your application.

`StripeProvider` can accept `publishableKey`, `appInfo`, `stripeAccountId` and `merchantIdentifier` as props. Only `publishableKey` is required. You can init it with a static values or if preferred fetch `publishableKey` from your server and then use it in `StripeProvider`.

```tsx
import { StripeProvider } from 'react-native-stripe-sdk';

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
      appInfo={{
        name: 'react-native-stripe-sdk',
        version: '0.0.1',
        partnerId: 'id',
        url: 'http://your-website.com',
      }}
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
